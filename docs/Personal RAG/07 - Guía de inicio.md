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
- Database → Search → Create Search Index → colección **`knowledge`**
- Usar la definición JSON que imprime el script
- Dimensiones: **768** para Ollama, **1536** para OpenAI

> Solo se necesita **un** índice vectorial (campo `type` actúa como filtro pre-vector).

### Migración desde colecciones legacy

Si ya tienes datos en `conversations`, `decisions`, `code_patterns` o `incidents`:

```bash
bun run scripts/migrate-to-polymorphic.ts
bun run stats
```

Verifica los conteos y elimina las colecciones legacy manualmente en Atlas cuando estés conforme.

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

**Salida esperada de extract:**

```
Running extraction batch (limit=50)...
{ processed: 5, extracted: 2, skipped: 3 }
```

- `processed` — conversaciones revisadas
- `extracted` — nodos `decision` / `pattern` / `incident` creados
- `skipped` — sin valor suficiente (confidence < 0.3)

**Salida esperada de stats (antes → después):**

```
knowledge: 42 documents (8 unextracted)
  conversation: 30 (8 unextracted)   →   conversation: 30 (3 unextracted)
  decision: 5 (0 unextracted)        →   decision: 7 (0 unextracted)
```

Ver guía completa: [[03 - Scripts y comandos#Verificar hook y extract]]

---

## Paso 8 — Probar búsqueda

```bash
bun run search "deployment SSR Lambda"
bun run search "CORS" --type=incident
```

---

## Paso 9 — Conectar MCP a Cursor

Copia y ajusta la plantilla de `config/cursor-global/mcp.json.example`:

```json
{
  "mcpServers": {
    "personal-rag": {
      "command": "C:\\Users\\TU_USUARIO\\.bun\\bin\\bun.exe",
      "args": ["F:\\Git\\personal-rag\\scripts\\start-mcp.ts"]
    }
  }
}
```

> **Windows:** usa ruta absoluta a `bun.exe`. Cursor lanza MCP con PATH mínimo y `"command": "bun"` suele fallar.

Reiniciar Cursor. Verificar en Settings → MCP que `personal-rag` aparece con 5 tools.

Probar en chat: *"Busca en mi knowledge base problemas similares de CORS en SvelteKit"*

---

## Paso 10 — Automatización (opcional)

### Auto-ingesta al terminar chat

Ya configurado en `.cursor/hooks.json` → [[03 - Scripts y comandos#post-conversation.ts]]

**Probar manualmente:**

```bash
bun run post-conversation
```

Salida esperada:

```
[post-conversation] Ingesting ...agent-transcripts....jsonl
[post-conversation] Ingested: inserted=3, skipped=0
[post-conversation] Extracted: processed=3, extracted=1
```

**Verificar automático:** terminar un chat → revisar canal **Hooks** en Output de Cursor.

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

- [ ] `bun run stats` muestra documentos en `knowledge` por `type`
- [ ] `bun run post-conversation` imprime `Ingested: inserted=N` (o `skipped` si ya existía)
- [ ] `bun run extract` retorna `{ processed: N, extracted: N, skipped: N }`
- [ ] Tras extract, `unextracted` en `conversation` baja en `bun run stats`
- [ ] `bun run search "test"` retorna resultados
- [ ] MCP server visible en Cursor con 5 tools
- [ ] Al cerrar un chat, logs `[post-conversation]` en canal **Hooks**
- [ ] Ollama responde en `http://localhost:11434`

Ver también: [[03 - Scripts y comandos#Verificar hook y extract]], [[08 - Replicar el sistema]], [[06 - Costos]]
