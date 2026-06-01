# Configuración global de Cursor

Copia estos archivos a tu carpeta de usuario de Cursor para que MCP y hooks funcionen en **todos** tus repos, no solo en `personal-rag`.

## Pasos (Windows)

1. Edita las rutas en los archivos `.example` (reemplaza `F:\Git\personal-rag` por tu ruta real).

2. Copia a `%USERPROFILE%\.cursor\`:

```powershell
# MCP global (merge con existente si ya tienes otros MCPs)
# Edita mcp.json.example: ruta absoluta a bun.exe + scripts/start-mcp.ts
Copy-Item config\cursor-global\mcp.json.example $env:USERPROFILE\.cursor\mcp.json
```

3. Si ya tienes `~/.cursor/mcp.json`, **fusiona** el bloque `personal-rag` con tu config existente en lugar de sobrescribir.

4. Reinicia Cursor.

### Troubleshooting MCP en Windows

| Síntoma | Causa | Solución |
|---------|-------|----------|
| `connected=false, statusType=error` | Cursor no encuentra `bun` en PATH | Usar ruta absoluta a `bun.exe` en `command` |
| `Timeout waiting for EverythingProvider` | El servidor no arrancó a tiempo | Misma solución + verificar que `start-mcp.ts` existe |
| Tools vacías / error al buscar | `.env` no cargado | `start-mcp.ts` hace chdir al repo; verifica `MONGODB_URI` |

## Qué habilita

| Archivo destino | Efecto |
|-----------------|--------|
| `~/.cursor/mcp.json` | Tools de búsqueda en knowledge base desde cualquier repo |
| `~/.cursor/hooks.json` | Auto-ingesta del transcript al terminar cualquier chat |

## Documentación

Ver `docs/Personal RAG/10 - MCP y Hooks globales.md` en Obsidian.
