/**
 * Creates vector search indexes on all knowledge collections.
 * Run once after configuring MONGODB_URI in .env
 *
 * Note: Atlas vector indexes must be created via the Atlas UI or Atlas Admin API
 * if your cluster doesn't support createSearchIndex via the driver.
 * This script attempts driver-based creation and prints manual fallback instructions.
 */
import { getDb, ensureIndexes, VECTOR_INDEX_DEFINITION, closeDb, COLLECTIONS } from "@personal-rag/core";

async function main() {
  console.log("Ensuring standard indexes...");
  await ensureIndexes();

  const db = await getDb();

  for (const collectionName of Object.values(COLLECTIONS)) {
    console.log(`Creating vector index on '${collectionName}'...`);
    try {
      const collection = db.collection(collectionName);
      // @ts-expect-error createSearchIndex exists on Atlas deployments
      await collection.createSearchIndex(VECTOR_INDEX_DEFINITION);
      console.log(`  ✓ Vector index created on '${collectionName}'`);
    } catch (error) {
      console.warn(`  ⚠ Could not create vector index on '${collectionName}' via driver.`);
      console.warn(`    Create manually in Atlas UI with this definition:`);
      console.warn(JSON.stringify(VECTOR_INDEX_DEFINITION, null, 2));
      if (error instanceof Error) {
        console.warn(`    Error: ${error.message}`);
      }
    }
  }

  await closeDb();
  console.log("Done.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
