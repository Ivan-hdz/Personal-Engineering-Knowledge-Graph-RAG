import OpenAI from "openai";
import { config } from "./config.ts";

export interface LLMClient {
  complete(systemPrompt: string, userPrompt: string): Promise<string>;
  completeJson<T>(systemPrompt: string, userPrompt: string): Promise<T>;
}

class OllamaLLMClient implements LLMClient {
  async complete(systemPrompt: string, userPrompt: string): Promise<string> {
    const response = await fetch(`${config.llm.ollama.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: config.llm.ollama.model,
        stream: false,
        format: "json",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama LLM failed: ${response.statusText}`);
    }

    const data = (await response.json()) as { message: { content: string } };
    return data.message.content;
  }

  async completeJson<T>(systemPrompt: string, userPrompt: string): Promise<T> {
    const content = await this.complete(systemPrompt, userPrompt);
    return JSON.parse(content) as T;
  }
}

class OpenAILLMClient implements LLMClient {
  private client: OpenAI;

  constructor() {
    if (!config.llm.openai.apiKey) {
      throw new Error("OPENAI_API_KEY is required when LLM_PROVIDER=openai");
    }
    this.client = new OpenAI({ apiKey: config.llm.openai.apiKey });
  }

  async complete(systemPrompt: string, userPrompt: string): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: config.llm.openai.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
    });

    return response.choices[0]?.message?.content ?? "";
  }

  async completeJson<T>(systemPrompt: string, userPrompt: string): Promise<T> {
    const content = await this.complete(systemPrompt, userPrompt);
    return JSON.parse(content) as T;
  }
}

let llmClient: LLMClient | null = null;

export function getLLMClient(): LLMClient {
  if (llmClient) return llmClient;

  switch (config.llm.provider) {
    case "openai":
      llmClient = new OpenAILLMClient();
      break;
    case "ollama":
    default:
      llmClient = new OllamaLLMClient();
      break;
  }

  return llmClient;
}
