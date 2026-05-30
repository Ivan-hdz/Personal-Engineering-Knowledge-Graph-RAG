/**
 * Cursor post-conversation hook.
 * Triggered when a chat session ends; ingests the latest transcript.
 */
import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { config, closeDb } from "@personal-rag/core";
import { ingestCursorFile } from "@personal-rag/ingestion";
import { runExtractionBatch } from "@personal-rag/extraction";

async function findLatestTranscript(): Promise<string | null> {
  const dir = config.sources.cursorTranscriptsDir;
  let latest: { path: string; mtime: number } | null = null;

  async function walk(current: string) {
    let entries;
    try {
      entries = await readdir(current, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.name.endsWith(".jsonl") && fullPath.includes("agent-transcripts")) {
        const fileStat = await stat(fullPath);
        if (!latest || fileStat.mtimeMs > latest.mtime) {
          latest = { path: fullPath, mtime: fileStat.mtimeMs };
        }
      }
    }
  }

  await walk(dir);
  return latest?.path ?? null;
}

async function main() {
  const latest = await findLatestTranscript();
  if (!latest) {
    process.stderr.write("[post-conversation] No transcript found\n");
    return;
  }

  process.stderr.write(`[post-conversation] Ingesting ${latest}\n`);
  const ingestResult = await ingestCursorFile(latest);
  process.stderr.write(
    `[post-conversation] Ingested: inserted=${ingestResult.inserted}, skipped=${ingestResult.skipped}\n`,
  );

  if (ingestResult.inserted > 0) {
    const extractResult = await runExtractionBatch(5);
    process.stderr.write(
      `[post-conversation] Extracted: processed=${extractResult.processed}, extracted=${extractResult.extracted}\n`,
    );
  }

  await closeDb();
}

main().catch(async (error) => {
  process.stderr.write(`[post-conversation] Error: ${error}\n`);
  await closeDb();
  process.exit(1);
});
