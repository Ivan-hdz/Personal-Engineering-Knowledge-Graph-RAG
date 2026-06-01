/**
 * Migrates documents from legacy per-type collections into the polymorphic `knowledge` collection.
 * Does not drop legacy collections — verify counts, then drop manually in Atlas if desired.
 *
 * Usage: bun run scripts/migrate-to-polymorphic.ts
 */
import {
  closeDb,
  COLLECTION,
  LEGACY_COLLECTIONS,
  getDb,
  ensureIndexes,
} from "@personal-rag/core";

async function main() {
  await ensureIndexes();
  const db = await getDb();
  const target = db.collection(COLLECTION);

  let migrated = 0;
  let skipped = 0;

  for (const legacyName of LEGACY_COLLECTIONS) {
    const source = db.collection(legacyName);
    const count = await source.countDocuments();

    if (count === 0) {
      console.log(`${legacyName}: empty, skipping`);
      continue;
    }

    console.log(`${legacyName}: migrating ${count} documents...`);

    const cursor = source.find({});
    for await (const doc of cursor) {
      const { _id, ...rest } = doc;
      const contentHash = rest.contentHash as string | undefined;

      if (contentHash) {
        const existing = await target.findOne({ contentHash });
        if (existing) {
          skipped += 1;
          continue;
        }
      }

      await target.insertOne(rest);
      migrated += 1;
    }
  }

  const byType = await target
    .aggregate<{ _id: string; count: number }>([
      { $group: { _id: "$type", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ])
    .toArray();

  console.log("\nMigration complete.");
  console.log(`  Migrated: ${migrated}`);
  console.log(`  Skipped (duplicate contentHash): ${skipped}`);
  console.log(`\n${COLLECTION} totals by type:`);
  for (const row of byType) {
    console.log(`  ${row._id}: ${row.count}`);
  }

  console.log(
    "\nLegacy collections were not dropped. Drop them manually in Atlas after verifying data.",
  );

  await closeDb();
}

main().catch(async (error) => {
  console.error(error);
  await closeDb();
  process.exit(1);
});
