# Replicar el sistema

Guía para desplegar una copia independiente del Personal Knowledge Graph en otra máquina, cuenta o equipo.

## Qué necesitas replicar

| Componente | Dónde vive | Replicable |
|------------|-----------|------------|
| Código | GitHub repo | `git clone` |
| Configuración | `.env` (local, no en git) | Manual por máquina |
| Base de datos | MongoDB Atlas | Cluster propio o compartido |
| Embeddings/LLM | Ollama local o OpenAI | Por máquina |
| MCP Cursor | `.cursor/mcp.json` | Ajustar `cwd` |
| Webhooks | Infra opcional | Ver [[05 - Infraestructura]] |

---

## Escenario 1 — Segunda máquina personal

Misma persona, otro PC (ej. laptop + desktop).

### 1. Clonar repo
```bash
git clone git@github.com:Ivan-hdz/Personal-Engineering-Knowledge-Graph-RAG.git
cd Personal-Engineering-Knowledge-Graph-RAG
bun install
```

### 2. Compartir MongoDB Atlas (recomendado)
Usa el **mismo cluster Atlas** en ambas máquinas → knowledge base unificada.

```env
MONGODB_URI=mongodb+srv://...   # misma URI
CURSOR_TRANSCRIPTS_DIR=C:\Users\OTRO_USUARIO\.cursor\projects
```

### 3. Ollama en la nueva máquina
```bash
ollama pull nomic-embed-text
ollama pull llama3.2
```

### 4. Ajustar MCP
Editar `cwd` en `.cursor/mcp.json` con la ruta local.

---

## Escenario 2 — Instancia completamente independiente

Otra persona o proyecto separado con su propio knowledge graph.

### 1. Fork o clone
```bash
git clone git@github.com:Ivan-hdz/Personal-Engineering-Knowledge-Graph-RAG.git mi-knowledge-graph
cd mi-knowledge-graph
```

### 2. Nuevo cluster MongoDB Atlas
- Crear cluster M0 propio
- Nuevo `MONGODB_DB` (ej: `mi-knowledge-graph`)
- Ejecutar `bun run scripts/create-vector-index.ts`

### 3. Configurar fuentes propias
```env
MONGODB_URI=mongodb+srv://...nuevo-cluster...
MONGODB_DB=mi-knowledge-graph
CURSOR_TRANSCRIPTS_DIR=...
OBSIDIAN_VAULT_PATH=...
GITHUB_WEBHOOK_SECRET=nuevo-secret
```

### 4. Elegir Path de costos
Ver [[06 - Costos]] — Path A para $0, Path B para mejor calidad.

---

## Escenario 3 — Producción con webhooks

Para ingesta automática de PRs/commits sin PC encendido.

### Opción A — Cloudflare + túnel (más simple, $0)

```bash
# Máquina/servidor con el repo
bun run webhook

# Túnel
cloudflared tunnel --url http://localhost:3456

# Cloudflare Worker como proxy público
cd infra/cloudflare
npx wrangler deploy worker.ts
# INGESTION_WEBHOOK_URL = URL del túnel
```

### Opción B — AWS Lambda (serverless)

```bash
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars
# Configurar mongodb_uri, secrets

terraform init
terraform apply
# Usar github_webhook_url del output
```

> Lambda requiere `EMBEDDING_PROVIDER=openai` — Ollama no corre en Lambda.

---

## Escenario 4 — Solo Obsidian como fuente

Si solo quieres indexar tu vault de notas:

```env
EMBEDDING_PROVIDER=ollama
LLM_PROVIDER=ollama
MONGODB_URI=...
OBSIDIAN_VAULT_PATH=C:\Users\me\Documents\Obsidian\MiVault
```

```bash
bun run ingest obsidian
bun run extract
bun run watch:obsidian   # sync continuo
bun run mcp              # buscar desde Cursor
```

No necesitas webhooks ni infra AWS/Cloudflare.

---

## Migrar datos entre instancias

### Exportar desde Atlas
```bash
mongodump --uri="mongodb+srv://..." --db=personal-rag --out=./backup
```

### Importar en otro cluster
```bash
mongorestore --uri="mongodb+srv://...nuevo..." --db=personal-rag ./backup/personal-rag
```

### Re-crear índices en destino
```bash
bun run scripts/create-vector-index.ts
```

---

## Variables de entorno por escenario

| Variable | Personal | Independiente | Solo Obsidian | Lambda |
|----------|----------|---------------|---------------|--------|
| `MONGODB_URI` | Compartido | Propio | Propio | Propio |
| `EMBEDDING_PROVIDER` | ollama | ollama/openai | ollama | openai |
| `CURSOR_TRANSCRIPTS_DIR` | ✓ | ✓ | — | — |
| `OBSIDIAN_VAULT_PATH` | opcional | opcional | ✓ | — |
| `GITHUB_WEBHOOK_SECRET` | opcional | ✓ | — | ✓ |
| `OPENAI_API_KEY` | — | opcional | — | ✓ |

---

## Troubleshooting común

| Problema | Solución |
|----------|----------|
| `$vectorSearch` falla | Crear índice manual en Atlas UI (768 dims Ollama) |
| Ollama connection refused | `ollama serve` + verificar `OLLAMA_BASE_URL` |
| MCP no aparece en Cursor | Reiniciar Cursor, verificar `cwd` en mcp.json |
| `extracted: false` no baja | `bun run extract --limit=200` |
| Webhook 401 | Verificar secrets en `.env` y en GitHub/GitLab |
| Duplicados en ingesta | Normal — dedup por `contentHash` los salta |

Ver también: [[07 - Guía de inicio]], [[00 - Índice]]
