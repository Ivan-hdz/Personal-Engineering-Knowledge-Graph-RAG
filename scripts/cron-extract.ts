/**
 * Weekly extraction cron helper.
 * Run via: bun run scripts/cron-extract.ts
 * Schedule with Windows Task Scheduler or cron:
 *   0 2 * * 0 cd /path/to/personal-rag && bun run scripts/cron-extract.ts
 */
import { closeDb } from "@personal-rag/core";
import { runExtractionBatch } from "@personal-rag/extraction";

async function main() {
  console.log(`[cron-extract] Starting at ${new Date().toISOString()}`);
  const result = await runExtractionBatch(200);
  console.log("[cron-extract] Result:", result);
  await closeDb();
}

main().catch(async (error) => {
  console.error("[cron-extract] Failed:", error);
  await closeDb();
  process.exit(1);
});
