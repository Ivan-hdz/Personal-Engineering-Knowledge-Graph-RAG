# Guía de inicio

> ¿No conoces RAG, embeddings o Knowledge Graphs? Lee [[09 - Fundamentos teóricos]] antes de continuar.

Pasos para poner en marcha el sistema desde cero.

## Prerrequisitos

| Herramienta | Versión | Para qué |
|-------------|---------|----------|
| [Bun](https://bun.sh) | ≥ 1.0 | Runtime y package manager |
| [MongoDB Atlas](https://cloud.mongodb.com) | M0 free | Vector store |
| [Ollama](https://ollama.com) | latest | Path A: embeddings + LLM |
| [Cursor](https://cursor.com) | latest | MCP integration |

---

## Paso 1 — Clonar e instalar

```bash
git clone git@github.com:Ivan-hdz/Personal-Engineering-Knowledge-Graph-RAG.git
cd Personal-Engineering-Knowledge-Graph-RAG
bun install
```

---

## Paso 2 — Configurar entorno

```bash
cp .env.example .env
```

Editar `.env` con valores mínimos:

```env
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/personal-rag
MONGODB_DB=personal-rag

# Path A (gratis)
EMBEDDING_PROVIDER=ollama
LLM_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434

# Fuentes (ajustar rutas)
CURSOR_TRANSCRIPTS_DIR=C:\Users\TU_USUARIO\.cursor\projects
OBSIDIAN_VAULT_PATH=C:\Users\TU_USUARIO\vault
```

---

## Paso 3 — Ollama (Path A)

```bash
ollama pull nomic-embed-text
ollama pull llama3.2
ollama serve   # si no corre automáticamente
```

---

## Paso 4 — MongoDB Atlas

1. Crear cluster **M0 Free Shared** en [cloud.mongodb.com](https://cloud.mongodb.com)
2. Database Access → crear usuario con read/write
3. Network Access → agregar tu IP (o `0.0.0.0/0` para desarrollo)
4. Copiar connection string a `MONGODB_URI`

---

## Paso 5 — Índices

```bash
bun run scripts/create-vector-index.ts
```

Si el índice vectorial falla vía driver, créalo manualmente en Atlas UI:
- Database → Search → Create Search Index
- Usar la definición JSON que imprime el script
- Dimensiones: **768** para Ollama, **1536** para OpenAI

---

## Paso 6 — Primera ingesta

```bash
# Cursor transcripts
bun run ingest cursor

# Obsidian (si configurado)
bun run ingest obsidian

# ChatGPT export
bun run ingest chatgpt --path="./conversations.json"

# Jira
bun run ingest jira
```

Verificar:
```bash
bun run stats
```

---

## Paso 7 — Extracción de conocimiento

```bash
bun run extract
bun run stats   # unextracted debería bajar
```

---

## Paso 8 — Probar búsqueda

```bash
bun run search "deployment SSR Lambda"
bun run search "CORS" --type=incident
```

---

## Paso 9 — Conectar MCP a Cursor

El archivo `.cursor/mcp.json` ya está configurado. Ajustar `cwd` a tu ruta local:

```json
{
  "mcpServers": {
    "personal-rag": {
      "command": "bun",
      "args": ["run", "packages/mcp-server/src/index.ts"],
      "cwd": "F:\\Git\\personal-rag"
    }
  }
}
```

Reiniciar Cursor. Verificar en Settings → MCP que `personal-rag` aparece con 5 tools.

Probar en chat: *"Busca en mi knowledge base problemas similares de CORS en SvelteKit"*

---

## Paso 10 — Automatización (opcional)

### Auto-ingesta al terminar chat
Ya configurado en `.cursor/hooks.json` → [[03 - Scripts y comandos#post-conversation.ts]]

### Watch continuo
```bash
bun run watch:cursor      # transcripts Cursor
bun run watch:obsidian    # vault Obsidian
```

### Webhooks GitHub/GitLab
```bash
bun run webhook
# Exponer con ngrok y configurar en GitHub Settings → Webhooks
```

### Extracción semanal
Programar [[03 - Scripts y comandos#cron-extract.ts]] en Task Scheduler.

---

## Checklist de verificación

- [ ] `bun run stats` muestra documentos en colecciones
- [ ] `bun run search "test"` retorna resultados
- [ ] MCP server visible en Cursor con 5 tools
- [ ] Hook post-conversación ingesta automáticamente
- [ ] Ollama responde en `http://localhost:11434`

Ver también: [[08 - Replicar el sistema]], [[06 - Costos]]
