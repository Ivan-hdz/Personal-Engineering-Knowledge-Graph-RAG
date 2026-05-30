# Personal Engineering Knowledge Graph + RAG

Personal knowledge graph that ingests engineering interactions (Cursor chats, PRs, commits, Obsidian notes, ChatGPT exports, Jira tickets) and exposes them via MCP tools inside Cursor.

## Quick start

```bash
bun install
cp .env.example .env
# Configure MONGODB_URI and provider settings

# Create vector index (see scripts/create-vector-index.ts)
bun run scripts/create-vector-index.ts

# Ingest sources
bun run ingest --source cursor
bun run ingest --source obsidian --path /path/to/vault

# Extract structured knowledge
bun run extract

# Search from CLI
bun run search "CORS SvelteKit Lambda"

# Start MCP server for Cursor
bun run mcp
```

## Architecture

```
Sources → Ingestion → Chunking + Embeddings → MongoDB Atlas
                                              ↓
                                    LLM Extraction
                                              ↓
                                    Retrieval Layer → MCP Server → Cursor
```

## Packages

| Package | Purpose |
|---------|---------|
| `packages/core` | Models, DB client, embedding/LLM clients |
| `packages/ingestion` | Source adapters + webhook server |
| `packages/extraction` | LLM knowledge extraction |
| `packages/retrieval` | Vector search with metadata filters |
| `packages/mcp-server` | MCP tools for Cursor |

## Cost

Start with **Path A** (Ollama + MongoDB Atlas M0): $0/month. Swap to OpenAI/Voyage via env vars when ready.
