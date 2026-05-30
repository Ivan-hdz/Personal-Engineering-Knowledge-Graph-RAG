import { config } from "@personal-rag/core";
import type { IngestInput } from "@personal-rag/core";

export interface TextChunk {
  content: string;
  index: number;
}

export function chunkText(text: string): TextChunk[] {
  const { chunkSize, chunkOverlap } = config.chunking;
  const words = text.split(/\s+/).filter(Boolean);

  if (words.length === 0) return [];
  if (words.length <= chunkSize) {
    return [{ content: text.trim(), index: 0 }];
  }

  const chunks: TextChunk[] = [];
  let start = 0;
  let index = 0;

  while (start < words.length) {
    const end = Math.min(start + chunkSize, words.length);
    const content = words.slice(start, end).join(" ");
    chunks.push({ content, index });
    if (end >= words.length) break;
    start += chunkSize - chunkOverlap;
    index += 1;
  }

  return chunks;
}

export function buildIngestInputs(
  content: string,
  metadata: IngestInput["metadata"],
): IngestInput[] {
  const chunks = chunkText(content);
  return chunks.map((chunk, i) => ({
    content: chunk.content,
    metadata: {
      ...metadata,
      title:
        chunks.length > 1 && metadata.title
          ? `${metadata.title} (part ${i + 1}/${chunks.length})`
          : metadata.title,
    },
  }));
}
