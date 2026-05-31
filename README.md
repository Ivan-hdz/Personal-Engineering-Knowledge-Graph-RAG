# Personal Engineering Knowledge Graph + RAG

Personal knowledge graph that ingests engineering interactions (Cursor chats, PRs, commits, Obsidian notes, ChatGPT exports, Jira tickets) and exposes them via MCP tools inside Cursor.

> Documentación completa en Obsidian: [`docs/Personal RAG/00 - Índice.md`](docs/Personal%20RAG/00%20-%20%C3%8Dndice.md)

## Quick start

```bash
bun install
cp .env.example .env
# Configure MONGODB_URI and provider settings

bun run scripts/create-vector-index.ts
bun run ingest cursor
bun run extract
bun run search "CORS SvelteKit Lambda"
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

## Scripts

| Command | Description |
|---------|-------------|
| `bun run ingest <source>` | Ingest cursor, obsidian, chatgpt, jira |
| `bun run extract` | LLM knowledge extraction batch |
| `bun run search <query>` | Search from CLI |
| `bun run stats` | Collection document counts |
| `bun run mcp` | Start MCP server for Cursor |
| `bun run webhook` | GitHub/GitLab webhook server |
| `bun run watch:cursor` | Auto-ingest Cursor transcripts |
| `bun run watch:obsidian` | Auto-sync Obsidian vault |

## Infrastructure

| Path | Purpose |
|------|---------|
| `infra/terraform/` | AWS Lambda + API Gateway webhooks |
| `infra/cloudflare/` | Cloudflare Workers webhook proxy ($0) |
| `packages/ingestion/src/webhook-server.ts` | Local webhook server |

## Cost

Start with **Path A** (Ollama + MongoDB Atlas M0): **$0/month**. Swap to OpenAI/Voyage via env vars when ready. See [docs/Personal RAG/06 - Costos.md](docs/Personal%20RAG/06%20-%20Costos.md).

## Documentation (Obsidian vault)

Open `docs/Personal RAG/` as an Obsidian vault:

- [09 - Fundamentos teóricos](docs/Personal%20RAG/09%20-%20Fundamentos%20te%C3%B3ricos.md) — **start here**: Knowledge Graph, RAG, Atlas, embeddings, chunks
- [00 - Índice](docs/Personal%20RAG/00%20-%20%C3%8Dndice.md) — mapa de documentación
- [01 - Objetivo](docs/Personal%20RAG/01%20-%20Objetivo.md)
- [02 - Arquitectura](docs/Personal%20RAG/02%20-%20Arquitectura.md)
- [03 - Scripts y comandos](docs/Personal%20RAG/03%20-%20Scripts%20y%20comandos.md)
- [04 - Packages](docs/Personal%20RAG/04%20-%20Packages.md)
- [05 - Infraestructura](docs/Personal%20RAG/05%20-%20Infraestructura.md)
- [06 - Costos](docs/Personal%20RAG/06%20-%20Costos.md)
- [07 - Guía de inicio](docs/Personal%20RAG/07%20-%20Gu%C3%ADa%20de%20inicio.md)
- [08 - Replicar el sistema](docs/Personal%20RAG/08%20-%20Replicar%20el%20sistema.md)
