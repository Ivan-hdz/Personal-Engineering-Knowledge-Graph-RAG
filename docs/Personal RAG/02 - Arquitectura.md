# Arquitectura

> Conceptos base: [[09 - Fundamentos teóricos]]

## Diagrama general

```mermaid
flowchart TB
    subgraph sources [Fuentes]
        Cursor[Cursor transcripts]
        GitHub[GitHub webhooks]
        GitLab[GitLab webhooks]
        Obsidian[Obsidian vault]
        ChatGPT[ChatGPT export]
        Jira[Jira API]
    end

    subgraph ingestion [packages/ingestion]
        Adapters[Source adapters]
        Chunker[Chunker 512/64]
        Embedder[Embeddings client]
    end

    subgraph storage [MongoDB Atlas]
        Knowledge[knowledge\ntype: conversation | decision | pattern | incident]
    end

    subgraph processing [packages/extraction]
        LLM[LLM extractor]
    end

    subgraph retrieval [packages/retrieval + mcp-server]
        VectorSearch["$vectorSearch"]
        MCP[MCP Server]
    end

    Cursor --> Adapters
    GitHub --> Adapters
    GitLab --> Adapters
    Obsidian --> Adapters
    ChatGPT --> Adapters
    Jira --> Adapters

    Adapters --> Chunker --> Embedder --> Knowledge
    Knowledge --> LLM
    LLM --> Knowledge

    Knowledge --> VectorSearch
    VectorSearch --> MCP
    MCP --> CursorIDE[Cursor IDE]
```

## Flujo por fase

### 1. Ingestión

1. Un adapter lee la fuente (archivo, webhook, API)
2. Normaliza metadata: `source`, `project`, `date`, `tags`, etc.
3. El chunker divide el texto (~512 palabras, overlap 64)
4. El cliente de embeddings genera vectores (Ollama/OpenAI/Voyage)
5. Upsert en la colección `knowledge` con deduplicación por `contentHash`

### 2. Extracción

1. Busca documentos en `knowledge` con `type: "conversation"` y `extracted: false`
2. Envía contenido al LLM con prompt estructurado
3. Clasifica en `decision`, `pattern` o `incident`
4. Guarda en la misma colección `knowledge` con el `type` correspondiente y embedding propio
5. Marca el documento origen como `extracted: true`

### 3. Recuperación

1. Embeddea la query del usuario
2. Ejecuta `$vectorSearch` con filtros de metadata
3. Fallback a búsqueda por texto si el índice vectorial no está disponible
4. Retorna resultados formateados en markdown

### 4. MCP

Cursor invoca herramientas MCP antes o durante una conversación:

- `searchKnowledge` — búsqueda global
- `searchIncidents` — problemas resueltos
- `searchPatterns` — patrones de código
- `searchDecisions` — decisiones arquitectónicas
- `searchArchitecture` — decisions + patterns combinados

## Schema de documento

```json
{
  "source": "cursor",
  "project": "coffee-platform",
  "date": "2026-05-29",
  "type": "incident",
  "title": "SSR deployment issue",
  "problem": "Cross-site POST forbidden",
  "solution": "Configurar origin y host header...",
  "content": "...chunk...",
  "embedding": [...],
  "tags": ["sveltekit", "aws", "lambda"],
  "repository": "frontend",
  "branch": "feature/auth",
  "pr": 245,
  "author": "ivan",
  "confidence": 0.92,
  "contentHash": "sha256...",
  "extracted": true
}
```

## Integración con Cursor

| Archivo | Función |
|---------|---------|
| `.cursor/mcp.json` | Registra el MCP server `personal-rag` |
| `.cursor/hooks.json` | Hook `stop` → [[03 - Scripts y comandos#post-conversation.ts\|post-conversation.ts]] |

Ver también: [[04 - Packages]], [[05 - Infraestructura]]
