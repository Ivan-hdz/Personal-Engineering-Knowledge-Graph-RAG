function envOptional(key: string, fallback = ""): string {
  return process.env[key] ?? fallback;
}

export const config = {
  mongodb: {
    uri: envOptional("MONGODB_URI"),
    db: envOptional("MONGODB_DB", "personal-rag"),
    vectorIndexName: envOptional("VECTOR_INDEX_NAME", "vector_index"),
  },
  embedding: {
    provider: envOptional("EMBEDDING_PROVIDER", "ollama") as "ollama" | "openai" | "voyage",
    dimensions: Number(envOptional("EMBEDDING_DIMENSIONS", "768")),
    ollama: {
      baseUrl: envOptional("OLLAMA_BASE_URL", "http://localhost:11434"),
      model: envOptional("OLLAMA_EMBEDDING_MODEL", "nomic-embed-text"),
    },
    openai: {
      apiKey: envOptional("OPENAI_API_KEY"),
      model: envOptional("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small"),
    },
    voyage: {
      apiKey: envOptional("VOYAGE_API_KEY"),
      model: envOptional("VOYAGE_EMBEDDING_MODEL", "voyage-code-2"),
    },
  },
  llm: {
    provider: envOptional("LLM_PROVIDER", "ollama") as "ollama" | "openai",
    ollama: {
      baseUrl: envOptional("OLLAMA_BASE_URL", "http://localhost:11434"),
      model: envOptional("OLLAMA_LLM_MODEL", "llama3.2"),
    },
    openai: {
      apiKey: envOptional("OPENAI_API_KEY"),
      model: envOptional("OPENAI_LLM_MODEL", "gpt-4o-mini"),
    },
  },
  chunking: {
    chunkSize: Number(envOptional("CHUNK_SIZE", "512")),
    chunkOverlap: Number(envOptional("CHUNK_OVERLAP", "64")),
  },
  sources: {
    cursorTranscriptsDir: envOptional(
      "CURSOR_TRANSCRIPTS_DIR",
      `${process.env.HOME ?? process.env.USERPROFILE ?? ""}/.cursor/projects`,
    ),
    obsidianVaultPath: envOptional("OBSIDIAN_VAULT_PATH"),
    chatgptExportPath: envOptional("CHATGPT_EXPORT_PATH"),
    jira: {
      baseUrl: envOptional("JIRA_BASE_URL"),
      email: envOptional("JIRA_EMAIL"),
      apiToken: envOptional("JIRA_API_TOKEN"),
    },
  },
  webhook: {
    port: Number(envOptional("WEBHOOK_PORT", "3456")),
    githubSecret: envOptional("GITHUB_WEBHOOK_SECRET"),
    gitlabSecret: envOptional("GITLAB_WEBHOOK_SECRET"),
  },
} as const;

export function requireMongoUri(): string {
  if (!config.mongodb.uri) {
    throw new Error("MONGODB_URI is required. Copy .env.example to .env and configure it.");
  }
  return config.mongodb.uri;
}
