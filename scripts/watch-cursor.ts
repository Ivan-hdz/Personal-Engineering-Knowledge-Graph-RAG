/**
 * Watch Cursor agent transcripts directory and ingest new/changed files.
 */
import { watch } from "node:fs";
import { join } from "node:path";
import { config, closeDb } from "@personal-rag/core";
import { ingestCursorFile } from "@personal-rag/ingestion";

const watched = new Set<string>();
const debounceMs = 2000;
const timers = new Map<string, ReturnType<typeof setTimeout>>();

function scheduleIngest(filePath: string) {
  if (!filePath.endsWith(".jsonl")) return;

  const existing = timers.get(filePath);
  if (existing) clearTimeout(existing);

  timers.set(
    filePath,
    setTimeout(async () => {
      if (watched.has(filePath)) return;
      watched.add(filePath);

      try {
        console.log(`[watch:cursor] Ingesting ${filePath}`);
        const result = await ingestCursorFile(filePath);
        console.log(`[watch:cursor] Done: inserted=${result.inserted}, skipped=${result.skipped}`);
      } catch (error) {
        console.error(`[watch:cursor] Error ingesting ${filePath}:`, error);
      } finally {
        watched.delete(filePath);
      }
    }, debounceMs),
  );
}

const dir = config.sources.cursorTranscriptsDir;
console.log(`[watch:cursor] Watching ${dir} for agent transcripts...`);

watch(dir, { recursive: true }, (_event, filename) => {
  if (!filename || !filename.includes("agent-transcripts")) return;
  scheduleIngest(join(dir, filename));
});

process.on("SIGINT", async () => {
  await closeDb();
  process.exit(0);
});
