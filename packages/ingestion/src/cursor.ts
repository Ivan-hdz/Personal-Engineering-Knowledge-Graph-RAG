import { readdir, readFile, stat } from "node:fs/promises";
import { join, basename } from "node:path";
import { config } from "@personal-rag/core";
import { ingestRawContent, type IngestResult } from "./base.ts";

interface TranscriptLine {
  role?: string;
  type?: string;
  message?: { content?: string | Array<{ text?: string }> };
  content?: string;
}

function extractText(line: TranscriptLine): string {
  if (typeof line.content === "string") return line.content;
  if (line.message?.content) {
    if (typeof line.message.content === "string") return line.message.content;
    return line.message.content.map((part) => part.text ?? "").join("\n");
  }
  return "";
}

function projectFromPath(filePath: string): string {
  const parts = filePath.replace(/\\/g, "/").split("/");
  const projectsIndex = parts.findIndex((p) => p === "projects");
  if (projectsIndex >= 0 && parts[projectsIndex + 1]) {
    return parts[projectsIndex + 1].replace(/^f-/, "").replace(/-/g, "/");
  }
  return basename(filePath, ".jsonl");
}

async function findJsonlFiles(dir: string): Promise<string[]> {
  const files: string[] = [];

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
      } else if (entry.name.endsWith(".jsonl")) {
        files.push(fullPath);
      }
    }
  }

  await walk(dir);
  return files;
}

export async function ingestCursorTranscripts(
  transcriptsDir = config.sources.cursorTranscriptsDir,
): Promise<IngestResult> {
  const files = await findJsonlFiles(transcriptsDir);
  let inserted = 0;
  let skipped = 0;
  const ids: string[] = [];

  for (const filePath of files) {
    const content = await readFile(filePath, "utf-8");
    const lines = content
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line) as TranscriptLine);

    const conversation = lines
      .map((line) => {
        const role = line.role ?? line.type ?? "unknown";
        const text = extractText(line);
        return text ? `[${role}]: ${text}` : "";
      })
      .filter(Boolean)
      .join("\n\n");

    if (!conversation.trim()) continue;

    const fileStat = await stat(filePath);
    const project = projectFromPath(filePath);

    const result = await ingestRawContent(conversation, {
      source: "cursor",
      project,
      date: fileStat.mtime.toISOString().slice(0, 10),
      title: basename(filePath, ".jsonl"),
      type: "conversation",
      tags: ["cursor", "agent-transcript"],
      extracted: false,
      technologies: [],
    });

    inserted += result.inserted;
    skipped += result.skipped;
    ids.push(...result.ids);
  }

  return { inserted, skipped, ids };
}

export async function ingestCursorFile(filePath: string): Promise<IngestResult> {
  const content = await readFile(filePath, "utf-8");
  const lines = content
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as TranscriptLine);

  const conversation = lines
    .map((line) => {
      const role = line.role ?? line.type ?? "unknown";
      const text = extractText(line);
      return text ? `[${role}]: ${text}` : "";
    })
    .filter(Boolean)
    .join("\n\n");

  if (!conversation.trim()) {
    return { inserted: 0, skipped: 0, ids: [] };
  }

  const fileStat = await stat(filePath);
  const project = projectFromPath(filePath);

  return ingestRawContent(conversation, {
    source: "cursor",
    project,
    date: fileStat.mtime.toISOString().slice(0, 10),
    title: basename(filePath, ".jsonl"),
    type: "conversation",
    tags: ["cursor", "agent-transcript"],
    extracted: false,
    technologies: [],
  });
}
