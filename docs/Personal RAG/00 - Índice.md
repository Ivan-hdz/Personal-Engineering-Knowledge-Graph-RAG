# Personal Engineering Knowledge Graph + RAG

> Memoria técnica personal que convierte interacciones de ingeniería en conocimiento recuperable vía MCP dentro de Cursor.

## Mapa de la documentación

### Empezar aquí (primera lectura)

| Nota | Contenido |
|------|-----------|
| [[09 - Fundamentos teóricos]] | **Knowledge Graph, RAG, Atlas, embeddings, chunks** — teoría para nuevos |

### Guía práctica

| Nota | Contenido |
|------|-----------|
| [[01 - Objetivo]] | Para qué existe el repo y qué problema resuelve |
| [[02 - Arquitectura]] | Flujo de datos, colecciones MongoDB y componentes |
| [[03 - Scripts y comandos]] | Todos los scripts, su función y relaciones |
| [[04 - Packages]] | Paquetes del monorepo y dependencias entre ellos |
| [[05 - Infraestructura]] | Terraform, Cloudflare Workers y webhooks |
| [[06 - Costos]] | Path A (gratis) vs Path B (APIs mínimas) |
| [[07 - Guía de inicio]] | Primeros pasos para usar el repo |
| [[08 - Replicar el sistema]] | Cómo clonar y desplegar en otra máquina |

## Comandos rápidos

```bash
bun install
cp .env.example .env
bun run scripts/create-vector-index.ts
bun run ingest cursor
bun run extract
bun run search "tu consulta"
bun run mcp
```

## Fuentes de datos soportadas

- [[Cursor]] — transcripts `.jsonl` de agentes
- [[GitHub]] / [[GitLab]] — PRs, commits, reviews (webhooks)
- [[Obsidian]] — notas `.md` del vault
- [[ChatGPT]] — export `conversations.json`
- [[Jira]] — issues y comentarios vía REST API

## Colecciones MongoDB

- `conversations` — chats crudos chunked
- `decisions` — decisiones arquitectónicas
- `code_patterns` — patrones reutilizables
- `incidents` — problemas resueltos
