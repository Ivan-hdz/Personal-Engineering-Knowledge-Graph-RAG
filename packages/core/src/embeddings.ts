import OpenAI from "openai";
import { config } from "./config.ts";

export interface EmbeddingClient {
  embed(texts: string[]): Promise<number[][]>;
  dimensions: number;
}

class OllamaEmbeddingClient implements EmbeddingClient {
  readonly dimensions = config.embedding.dimensions;

  async embed(texts: string[]): Promise<number[][]> {
    const results: number[][] = [];

    for (const text of texts) {
      const response = await fetch(`${config.embedding.ollama.baseUrl}/api/embeddings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: config.embedding.ollama.model,
          prompt: text,
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama embedding failed: ${response.statusText}`);
      }

      const data = (await response.json()) as { embedding: number[] };
      results.push(data.embedding);
    }

    return results;
  }
}

class OpenAIEmbeddingClient implements EmbeddingClient {
  private client: OpenAI;
  readonly dimensions = 1536;

  constructor() {
    if (!config.embedding.openai.apiKey) {
      throw new Error("OPENAI_API_KEY is required when EMBEDDING_PROVIDER=openai");
    }
    this.client = new OpenAI({ apiKey: config.embedding.openai.apiKey });
  }

  async embed(texts: string[]): Promise<number[][]> {
    const response = await this.client.embeddings.create({
      model: config.embedding.openai.model,
      input: texts,
    });

    return response.data.map((item) => item.embedding);
  }
}

class VoyageEmbeddingClient implements EmbeddingClient {
  readonly dimensions = 1024;

  async embed(texts: string[]): Promise<number[][]> {
    if (!config.embedding.voyage.apiKey) {
      throw new Error("VOYAGE_API_KEY is required when EMBEDDING_PROVIDER=voyage");
    }

    const response = await fetch("https://api.voyageai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.embedding.voyage.apiKey}`,
      },
      body: JSON.stringify({
        model: config.embedding.voyage.model,
        input: texts,
      }),
    });

    if (!response.ok) {
      throw new Error(`Voyage embedding failed: ${response.statusText}`);
    }

    const data = (await response.json()) as { data: Array<{ embedding: number[] }> };
    return data.data.map((item) => item.embedding);
  }
}

let embeddingClient: EmbeddingClient | null = null;

export function getEmbeddingClient(): EmbeddingClient {
  if (embeddingClient) return embeddingClient;

  switch (config.embedding.provider) {
    case "openai":
      embeddingClient = new OpenAIEmbeddingClient();
      break;
    case "voyage":
      embeddingClient = new VoyageEmbeddingClient();
      break;
    case "ollama":
    default:
      embeddingClient = new OllamaEmbeddingClient();
      break;
  }

  return embeddingClient;
}

export async function embedText(text: string): Promise<number[]> {
  const [embedding] = await getEmbeddingClient().embed([text]);
  return embedding;
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  return getEmbeddingClient().embed(texts);
}
