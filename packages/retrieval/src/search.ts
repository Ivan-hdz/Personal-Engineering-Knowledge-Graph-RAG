import {
  COLLECTIONS,
  config,
  embedText,
  getCollection,
  type CollectionName,
  type KnowledgeDocument,
  type SearchFilters,
  type SearchResult,
} from "@personal-rag/core";

function buildVectorFilter(filters?: SearchFilters): Record<string, unknown> {
  const filter: Record<string, unknown> = {};

  if (filters?.source) filter.source = filters.source;
  if (filters?.project) filter.project = filters.project;
  if (filters?.type) filter.type = filters.type;
  if (filters?.repository) filter.repository = filters.repository;
  if (filters?.tags?.length) filter.tags = { $in: filters.tags };

  if (filters?.dateRange) {
    filter.date = {
      $gte: filters.dateRange.from,
      $lte: filters.dateRange.to,
    };
  }

  return filter;
}

async function vectorSearchCollection(
  collectionName: CollectionName,
  query: string,
  filters?: SearchFilters,
): Promise<SearchResult[]> {
  const queryEmbedding = await embedText(query);
  const collection = await getCollection(collectionName);
  const limit = filters?.limit ?? 10;
  const vectorFilter = buildVectorFilter(filters);

  const pipeline: Record<string, unknown>[] = [
    {
      $vectorSearch: {
        index: config.mongodb.vectorIndexName,
        path: "embedding",
        queryVector: queryEmbedding,
        numCandidates: limit * 10,
        limit,
        ...(Object.keys(vectorFilter).length > 0 ? { filter: vectorFilter } : {}),
      },
    },
    {
      $project: {
        _id: 1,
        source: 1,
        project: 1,
        date: 1,
        type: 1,
        title: 1,
        problem: 1,
        solution: 1,
        content: 1,
        tags: 1,
        repository: 1,
        branch: 1,
        pr: 1,
        author: 1,
        confidence: 1,
        technologies: 1,
        score: { $meta: "vectorSearchScore" },
      },
    },
  ];

  try {
    const results = await collection.aggregate(pipeline).toArray();
    return results.map((doc) => ({
      id: doc._id.toString(),
      score: doc.score as number,
      document: doc as unknown as KnowledgeDocument,
    }));
  } catch {
    return fallbackTextSearch(collectionName, query, filters);
  }
}

async function fallbackTextSearch(
  collectionName: CollectionName,
  query: string,
  filters?: SearchFilters,
): Promise<SearchResult[]> {
  const collection = await getCollection(collectionName);
  const filter = buildVectorFilter(filters);
  const limit = filters?.limit ?? 10;

  const textFilter = {
    ...filter,
    $or: [
      { title: { $regex: query, $options: "i" } },
      { content: { $regex: query, $options: "i" } },
      { problem: { $regex: query, $options: "i" } },
      { solution: { $regex: query, $options: "i" } },
      { tags: { $in: query.toLowerCase().split(/\s+/) } },
    ],
  };

  const results = await collection.find(textFilter).limit(limit).toArray();
  return results.map((doc, index) => ({
    id: doc._id.toString(),
    score: 1 - index * 0.01,
    document: doc as KnowledgeDocument,
  }));
}

async function searchAcrossCollections(
  collections: CollectionName[],
  query: string,
  filters?: SearchFilters,
): Promise<SearchResult[]> {
  const allResults = await Promise.all(
    collections.map((name) => vectorSearchCollection(name, query, filters)),
  );

  return allResults
    .flat()
    .sort((a, b) => b.score - a.score)
    .slice(0, filters?.limit ?? 10);
}

export async function searchKnowledge(
  query: string,
  filters?: SearchFilters,
): Promise<SearchResult[]> {
  return searchAcrossCollections(Object.values(COLLECTIONS), query, filters);
}

export async function searchIncidents(
  query: string,
  filters?: Omit<SearchFilters, "type">,
): Promise<SearchResult[]> {
  return vectorSearchCollection(COLLECTIONS.incidents, query, {
    ...filters,
    type: "incident",
  });
}

export async function searchPatterns(
  query: string,
  filters?: Omit<SearchFilters, "type">,
): Promise<SearchResult[]> {
  return vectorSearchCollection(COLLECTIONS.code_patterns, query, {
    ...filters,
    type: "pattern",
  });
}

export async function searchDecisions(
  query: string,
  filters?: Omit<SearchFilters, "type">,
): Promise<SearchResult[]> {
  return vectorSearchCollection(COLLECTIONS.decisions, query, {
    ...filters,
    type: "decision",
  });
}

export async function searchArchitecture(
  query: string,
  filters?: SearchFilters,
): Promise<SearchResult[]> {
  return searchAcrossCollections(
    [COLLECTIONS.decisions, COLLECTIONS.code_patterns],
    query,
    filters,
  );
}

export function formatSearchResults(results: SearchResult[]): string {
  if (results.length === 0) return "No results found.";

  return results
    .map((result, i) => {
      const doc = result.document;
      const lines = [
        `## ${i + 1}. ${doc.title ?? "Untitled"} (score: ${result.score.toFixed(3)})`,
        `- **Type:** ${doc.type}`,
        `- **Source:** ${doc.source}`,
        doc.project ? `- **Project:** ${doc.project}` : "",
        doc.date ? `- **Date:** ${doc.date}` : "",
        doc.tags?.length ? `- **Tags:** ${doc.tags.join(", ")}` : "",
        doc.problem ? `\n**Problem:** ${doc.problem}` : "",
        doc.solution ? `\n**Solution:** ${doc.solution}` : "",
        `\n${doc.content.slice(0, 500)}${doc.content.length > 500 ? "..." : ""}`,
      ];
      return lines.filter(Boolean).join("\n");
    })
    .join("\n\n---\n\n");
}
