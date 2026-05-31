# Objetivo

> ¿Primera vez? Lee primero [[09 - Fundamentos teóricos]] para entender Knowledge Graph, RAG, embeddings y chunks.

## El problema

Un RAG tradicional de documentos almacena prompts y respuestas crudas. Eso genera ruido y poco valor a largo plazo.

Lo que realmente importa conservar:

```
Problema → Solución final → Decisión tomada → Código generado → Resultado
```

## La solución

Este repo implementa un **Personal Engineering Knowledge Graph + RAG**: un sistema que ingiere interacciones de ingeniería de múltiples fuentes, extrae conocimiento estructurado con un LLM, lo almacena en MongoDB Atlas con búsqueda vectorial, y lo expone como herramientas MCP dentro de [[Cursor]].

## Casos de uso

Preguntas que el sistema puede responder usando *tu* experiencia acumulada:

- *"¿Cómo resolvimos el problema de CORS en SvelteKit hace 3 meses?"*
- *"¿Cómo desplegué SvelteKit SSR en Lambda en coffee-platform y qué problemas encontré?"*
- *"¿Qué patrón usamos para API Gateway → Lambda → DynamoDB?"*

## Qué NO almacena

- Prompts aislados sin contexto
- Conversaciones incompletas sin valor técnico
- Texto duplicado (deduplicación por `contentHash`)

## Qué SÍ almacena

| Tipo | Ejemplo |
|------|---------|
| `conversation` | Chat completo chunked con embedding |
| `decision` | "Elegimos SSR en Lambda por SEO" |
| `pattern` | "API Gateway → Lambda → DynamoDB" |
| `incident` | "502 entre API Gateway y Lambda — causa: timeout" |

## Relación con otros componentes

```
Fuentes → [[03 - Scripts y comandos#Ingestión|Ingestión]] → MongoDB
                ↓
         [[04 - Packages#extraction|Extracción LLM]]
                ↓
         [[04 - Packages#retrieval|Retrieval]] → [[04 - Packages#mcp-server|MCP Server]] → Cursor
```

Ver también: [[02 - Arquitectura]], [[06 - Costos]], [[07 - Guía de inicio]]
