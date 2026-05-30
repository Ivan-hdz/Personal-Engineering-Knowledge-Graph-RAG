/**
 * Watch Obsidian vault for changes and re-ingest modified markdown files.
 */
import { watch } from "node:fs";
import { join } from "node:path";
import { readFile, stat } from "node:fs/promises";
import { config, closeDb } from "@personal-rag/core";
import { ingestRawContent } from "@personal-rag/ingestion";

const debounceMs = 3000;
const timers = new Map<string, ReturnType<typeof setTimeout>>();

async function ingestFile(filePath: string) {
  const vaultPath = config.sources.obsidianVaultPath;
  if (!vaultPath || !filePath.endsWith(".md")) return;

  const content = await readFile(filePath, "utf-8");
  const fileStat = await stat(filePath);

  const result = await ingestRawContent(content, {
    source: "obsidian",
    project: vaultPath.split(/[/\\]/).pop(),
    date: fileStat.mtime.toISOString().slice(0, 10),
    title: filePath.split(/[/\\]/).pop()?.replace(".md", ""),
    type: "conversation",
    tags: ["obsidian"],
    extracted: false,
    technologies: [],
  });

  console.log(`[watch:obsidian] ${filePath}: inserted=${result.inserted}, skipped=${result.skipped}`);
}

function scheduleIngest(filePath: string) {
  const existing = timers.get(filePath);
  if (existing) clearTimeout(existing);

  timers.set(
    filePath,
    setTimeout(() => {
      ingestFile(filePath).catch(console.error);
    }, debounceMs),
  );
}

const vaultPath = config.sources.obsidianVaultPath;
if (!vaultPath) {
  console.error("OBSIDIAN_VAULT_PATH is required");
  process.exit(1);
}

console.log(`[watch:obsidian] Watching ${vaultPath}...`);

watch(vaultPath, { recursive: true }, (_event, filename) => {
  if (!filename) return;
  scheduleIngest(join(vaultPath, filename));
});

process.on("SIGINT", async () => {
  await closeDb();
  process.exit(0);
});
