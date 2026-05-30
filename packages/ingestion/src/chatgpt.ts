import { readFile } from "node:fs/promises";
import { config } from "@personal-rag/core";
import { ingestRawContent, type IngestResult } from "./base.ts";

interface ChatGPTNode {
  id: string;
  message?: {
    author?: { role?: string };
    content?: { parts?: string[] };
    create_time?: number;
  };
  parent?: string;
  children?: string[];
}

interface ChatGPTExport {
  title?: string;
  create_time?: number;
  mapping?: Record<string, ChatGPTNode>;
}

function buildConversationText(mapping: Record<string, ChatGPTNode>): string {
  const nodes = Object.values(mapping);
  const lines: string[] = [];

  for (const node of nodes) {
    const role = node.message?.author?.role;
    const parts = node.message?.content?.parts ?? [];
    const text = parts.join("\n").trim();
    if (role && text) {
      lines.push(`[${role}]: ${text}`);
    }
  }

  return lines.join("\n\n");
}

export async function ingestChatGPTExport(
  exportPath = config.sources.chatgptExportPath,
): Promise<IngestResult> {
  if (!exportPath) {
    throw new Error("CHATGPT_EXPORT_PATH is required for ChatGPT ingestion");
  }

  const raw = await readFile(exportPath, "utf-8");
  const data = JSON.parse(raw) as ChatGPTExport[] | ChatGPTExport;
  const conversations = Array.isArray(data) ? data : [data];

  let inserted = 0;
  let skipped = 0;
  const ids: string[] = [];

  for (const conversation of conversations) {
    if (!conversation.mapping) continue;

    const content = buildConversationText(conversation.mapping);
    if (!content.trim()) continue;

    const date = conversation.create_time
      ? new Date(conversation.create_time * 1000).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10);

    const result = await ingestRawContent(content, {
      source: "chatgpt",
      project: "chatgpt-export",
      date,
      title: conversation.title ?? "Untitled ChatGPT conversation",
      type: "conversation",
      tags: ["chatgpt"],
      extracted: false,
      technologies: [],
    });

    inserted += result.inserted;
    skipped += result.skipped;
    ids.push(...result.ids);
  }

  return { inserted, skipped, ids };
}
