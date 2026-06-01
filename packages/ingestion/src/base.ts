import {
  type IngestInput,
  type KnowledgeDocument,
  COLLECTION,
  getCollection,
  hashContent,
  embedTexts,
  ensureIndexes,
} from "@personal-rag/core";

export interface IngestResult {
  inserted: number;
  skipped: number;
  ids: string[];
}

export async function ingestDocument(input: IngestInput): Promise<string | null> {
  const now = new Date().toISOString();
  const contentHash = hashContent(input.content);
  const collection = await getCollection(COLLECTION);

  const existing = await collection.findOne({ contentHash });
  if (existing) return null;

  const [embedding] = await embedTexts([input.content]);

  const document: KnowledgeDocument = {
    ...input.metadata,
    content: input.content,
    contentHash,
    embedding,
    createdAt: now,
    updatedAt: now,
  };

  const result = await collection.insertOne(document);
  return result.insertedId.toString();
}

export async function ingestDocuments(inputs: IngestInput[]): Promise<IngestResult> {
  await ensureIndexes();

  let inserted = 0;
  let skipped = 0;
  const ids: string[] = [];

  for (const input of inputs) {
    const id = await ingestDocument(input);
    if (id) {
      inserted += 1;
      ids.push(id);
    } else {
      skipped += 1;
    }
  }

  return { inserted, skipped, ids };
}

export async function ingestRawContent(
  content: string,
  metadata: IngestInput["metadata"],
): Promise<IngestResult> {
  const { buildIngestInputs } = await import("./chunker.ts");
  const inputs = buildIngestInputs(content, metadata);
  return ingestDocuments(inputs);
}

export async function markExtracted(documentId: string): Promise<void> {
  const { ObjectId } = await import("mongodb");
  const collection = await getCollection(COLLECTION);
  await collection.updateOne(
    { _id: new ObjectId(documentId) },
    { $set: { extracted: true, updatedAt: new Date().toISOString() } },
  );
}
