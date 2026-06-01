import {
  COLLECTION,
  ExtractedKnowledgeSchema,
  type ExtractedKnowledge,
  type KnowledgeDocument,
  getCollection,
  getLLMClient,
  embedText,
  hashContent,
} from "@personal-rag/core";
import { markExtracted } from "@personal-rag/ingestion";

const EXTRACTION_SYSTEM_PROMPT = `You are an engineering knowledge extractor. Given a conversation or document, extract structured knowledge.

Return JSON with these fields:
- problem: the core problem or question (string, optional)
- solution: the final solution or decision (string, optional)
- title: a concise title (string, optional)
- technologies: array of technologies mentioned
- type: one of "incident" (resolved problem), "decision" (architectural choice), "pattern" (reusable code/architecture pattern)
- confidence: 0-1 how confident you are this is useful knowledge
- tags: relevant tags for search

Only extract knowledge worth preserving. Skip small talk, greetings, and incomplete discussions.
If nothing useful, return type "decision" with confidence 0.1 and empty problem/solution.`;

export interface ExtractionResult {
  processed: number;
  extracted: number;
  skipped: number;
}

export async function extractFromDocument(
  document: KnowledgeDocument & { _id?: { toString(): string } },
): Promise<ExtractedKnowledge | null> {
  const llm = getLLMClient();

  const userPrompt = [
    `Source: ${document.source}`,
    document.project ? `Project: ${document.project}` : "",
    document.title ? `Title: ${document.title}` : "",
    "",
    document.content,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const raw = await llm.completeJson<ExtractedKnowledge>(
      EXTRACTION_SYSTEM_PROMPT,
      userPrompt,
    );
    return ExtractedKnowledgeSchema.parse(raw);
  } catch {
    return null;
  }
}

export async function saveExtractedKnowledge(
  sourceDoc: KnowledgeDocument & { _id?: { toString(): string } },
  extracted: ExtractedKnowledge,
): Promise<string | null> {
  const content = [
    extracted.problem ? `Problem: ${extracted.problem}` : "",
    extracted.solution ? `Solution: ${extracted.solution}` : "",
    sourceDoc.content.slice(0, 2000),
  ]
    .filter(Boolean)
    .join("\n\n");

  const contentHash = hashContent(`extracted:${sourceDoc.contentHash}:${extracted.type}`);
  const collection = await getCollection(COLLECTION);

  const existing = await collection.findOne({ contentHash });
  if (existing) return null;

  const now = new Date().toISOString();
  const embedding = await embedText(content);

  const document: KnowledgeDocument = {
    source: sourceDoc.source,
    project: sourceDoc.project,
    date: sourceDoc.date,
    type: extracted.type,
    title: extracted.title ?? sourceDoc.title,
    problem: extracted.problem,
    solution: extracted.solution,
    content,
    contentHash,
    embedding,
    tags: [...new Set([...(sourceDoc.tags ?? []), ...extracted.tags])],
    repository: sourceDoc.repository,
    branch: sourceDoc.branch,
    pr: sourceDoc.pr,
    author: sourceDoc.author,
    confidence: extracted.confidence,
    technologies: extracted.technologies,
    sourceDocumentId: sourceDoc._id?.toString(),
    extracted: true,
    createdAt: now,
    updatedAt: now,
  };

  const result = await collection.insertOne(document);
  return result.insertedId.toString();
}

export async function runExtractionBatch(limit = 50): Promise<ExtractionResult> {
  const collection = await getCollection(COLLECTION);
  const unprocessed = await collection
    .find({ type: "conversation", extracted: { $ne: true } })
    .limit(limit)
    .toArray();

  let processed = 0;
  let extracted = 0;
  let skipped = 0;

  for (const doc of unprocessed) {
    processed += 1;
    const knowledge = await extractFromDocument(doc as KnowledgeDocument & { _id: { toString(): string } });

    if (!knowledge || knowledge.confidence < 0.3) {
      skipped += 1;
      await markExtracted(doc._id.toString());
      continue;
    }

    const id = await saveExtractedKnowledge(
      doc as KnowledgeDocument & { _id: { toString(): string } },
      knowledge,
    );

    if (id) extracted += 1;
    await markExtracted(doc._id.toString());
  }

  return { processed, extracted, skipped };
}
