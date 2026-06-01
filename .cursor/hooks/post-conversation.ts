#!/usr/bin/env bun
/** Cursor hook entrypoint — delegates to scripts/hooks/post-conversation.ts */
await import("../../scripts/hooks/post-conversation.ts");
