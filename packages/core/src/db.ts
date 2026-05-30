import { createHash } from "node:crypto";
import { MongoClient, type Db, type Collection, type Document } from "mongodb";
import { config, requireMongoUri } from "./config.ts";
import type { KnowledgeDocument, CollectionName } from "./models.ts";
import { COLLECTIONS } from "./models.ts";

let client: MongoClient | null = null;
let db: Db | null = null;

export async function getDb(): Promise<Db> {
  if (db) return db;

  client = new MongoClient(requireMongoUri());
  await client.connect();
  db = client.db(config.mongodb.db);
  return db;
}

export async function getCollection<T extends Document = KnowledgeDocument>(
  name: CollectionName,
): Promise<Collection<T>> {
  const database = await getDb();
  return database.collection<T>(name);
}

export async function closeDb(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
}

export function hashContent(content: string): string {
  return createHash("sha256").update(content.trim()).digest("hex");
}

export async function ensureIndexes(): Promise<void> {
  const database = await getDb();

  for (const name of Object.values(COLLECTIONS)) {
    const collection = database.collection(name);
    await collection.createIndex({ contentHash: 1 }, { unique: true, sparse: true });
    await collection.createIndex({ source: 1, date: -1 });
    await collection.createIndex({ project: 1, date: -1 });
    await collection.createIndex({ tags: 1 });
    await collection.createIndex({ extracted: 1 });
    await collection.createIndex({ type: 1 });
  }
}

export const VECTOR_INDEX_DEFINITION = {
  name: config.mongodb.vectorIndexName,
  type: "vectorSearch" as const,
  definition: {
    fields: [
      {
        type: "vector",
        path: "embedding",
        numDimensions: config.embedding.dimensions,
        similarity: "cosine",
      },
      { type: "filter", path: "source" },
      { type: "filter", path: "project" },
      { type: "filter", path: "type" },
      { type: "filter", path: "tags" },
      { type: "filter", path: "repository" },
    ],
  },
};
