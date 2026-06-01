#!/usr/bin/env bun
/**
 * MCP entrypoint for Cursor (global or project mcp.json).
 * Sets cwd to repo root so Bun loads .env, then starts the MCP server.
 */
import { join } from "node:path";

process.chdir(join(import.meta.dir, ".."));

await import("../packages/mcp-server/src/index.ts");
