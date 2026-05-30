import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative, basename } from "node:path";
import { config } from "@personal-rag/core";
import { ingestRawContent, type IngestResult } from "./base.ts";

async function findMarkdownFiles(dir: string): Promise<string[]> {
  const files: string[] = [];

  async function walk(current: string) {
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(current, entry.name);
      if (entry.isDirectory() && !entry.name.startsWith(".")) {
        await walk(fullPath);
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        files.push(fullPath);
      }
    }
  }

  await walk(dir);
  return files;
}

function extractTags(content: string, filePath: string): string[] {
  const tags = new Set<string>(["obsidian"]);

  const tagMatches = content.match(/#[\w-]+/g) ?? [];
  for (const tag of tagMatches) {
    tags.add(tag.slice(1).toLowerCase());
  }

  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (frontmatterMatch) {
    const tagsLine = frontmatterMatch[1].match(/tags:\s*\[(.*?)\]/);
    if (tagsLine) {
      tagsLine[1].split(",").forEach((t) => tags.add(t.trim().replace(/['"]/g, "")));
    }
  }

  tags.add(basename(filePath, ".md"));
  return [...tags];
}

export async function ingestObsidianVault(
  vaultPath = config.sources.obsidianVaultPath,
): Promise<IngestResult> {
  if (!vaultPath) {
    throw new Error("OBSIDIAN_VAULT_PATH is required for Obsidian ingestion");
  }

  const files = await findMarkdownFiles(vaultPath);
  let inserted = 0;
  let skipped = 0;
  const ids: string[] = [];

  for (const filePath of files) {
    const content = await readFile(filePath, "utf-8");
    const fileStat = await stat(filePath);
    const relativePath = relative(vaultPath, filePath);

    const result = await ingestRawContent(content, {
      source: "obsidian",
      project: basename(vaultPath),
      date: fileStat.mtime.toISOString().slice(0, 10),
      title: basename(filePath, ".md"),
      type: "conversation",
      tags: extractTags(content, filePath),
      extracted: false,
      technologies: [],
    });

    inserted += result.inserted;
    skipped += result.skipped;
    ids.push(...result.ids);

    if (relativePath.includes("ADR") || relativePath.includes("decisions")) {
      await ingestRawContent(content, {
        source: "obsidian",
        project: basename(vaultPath),
        date: fileStat.mtime.toISOString().slice(0, 10),
        title: basename(filePath, ".md"),
        type: "decision",
        tags: extractTags(content, filePath),
        extracted: true,
        technologies: [],
      });
    }
  }

  return { inserted, skipped, ids };
}
