# Costos

Dos caminos viables. Ambos son esencialmente gratis para uso personal.

## Resumen

| Componente | Path A (local) | Path B (APIs) |
|------------|----------------|---------------|
| Embeddings | Ollama — $0 | OpenAI — ~$0.01/mes |
| LLM extracción | Ollama — $0 | GPT-4o-mini — ~$0.01/mes |
| Vector store | Atlas M0 — $0 | Atlas M0 — $0 |
| Webhooks | Local/CF — $0 | Local/CF — $0 |
| **Total mensual** | **$0** | **~$0.01–0.05** |

---

## Path A — Totalmente local (recomendado para empezar)

### Embeddings: Ollama + `nomic-embed-text`
- Open source, corre en tu máquina
- 768 dimensiones
- Configurar: `EMBEDDING_PROVIDER=ollama`

```bash
ollama pull nomic-embed-text
ollama pull llama3.2
```

### LLM extracción: Ollama + `llama3.2`
- Privado, sin API keys
- Más lento que cloud pero $0
- Configurar: `LLM_PROVIDER=ollama`

### Vector store: MongoDB Atlas M0
- 512 MB storage compartido
- ~100K chunks caben cómodamente
- Vector Search soportado en free tier
- Crear cluster en [cloud.mongodb.com](https://cloud.mongodb.com) → Free Shared

### Webhooks: local o Cloudflare Workers
- `bun run webhook` + túnel gratuito
- O Cloudflare Workers free tier (100K req/día)

---

## Path B — APIs mínimas (mejor calidad)

Cambiar solo dos variables en `.env`:

```env
EMBEDDING_PROVIDER=openai
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-...
```

### OpenAI `text-embedding-3-small`
- $0.02 / 1M tokens
- Carga histórica (~10 años): **$0.10–0.40 total**
- Ongoing: **< $0.01/mes**

### OpenAI `gpt-4o-mini`
- $0.15 / 1M input, $0.60 / 1M output
- Batch inicial (~1,000 conversaciones): **$0.08–0.30 total**
- Ongoing: **$0.01–0.05/mes**

### Voyage AI `voyage-code-2` (opcional, código)
- Free tier: 200M tokens/mes
- Mejor precisión semántica para código
- Configurar: `EMBEDDING_PROVIDER=voyage`, `VOYAGE_API_KEY=...`

---

## Costos de infraestructura

| Servicio | Costo | Notas |
|----------|-------|-------|
| MongoDB Atlas M0 | $0 | Suficiente para personal |
| Cloudflare Workers | $0 | 100K requests/día |
| AWS Lambda + API Gateway | ~$0 | Free tier 1M req/mes |
| ngrok / cloudflared | $0 | Túneles gratuitos |
| Ollama | $0 | Requiere RAM/GPU local |
| Cursor MCP | $0 | Incluido en Cursor |

---

## Cuándo migrar de Path A a Path B

- Extracción local muy lenta (>30s por documento)
- Calidad de clasificación insuficiente (mucho ruido en `decisions`/`incidents`)
- Necesitas embeddings desde AWS Lambda (Ollama no disponible en cloud)

**El cambio es de configuración**, no de código:

```env
# Antes (Path A)
EMBEDDING_PROVIDER=ollama
LLM_PROVIDER=ollama

# Después (Path B)
EMBEDDING_PROVIDER=openai
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-...
```

Los clientes están abstraídos en [[04 - Packages#core|packages/core/src/embeddings.ts]] y `llm.ts`.

Ver también: [[07 - Guía de inicio]], [[08 - Replicar el sistema]]
