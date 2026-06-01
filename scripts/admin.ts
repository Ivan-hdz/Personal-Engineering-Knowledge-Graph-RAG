#!/usr/bin/env bun
import { closeDb, COLLECTION, getCollection } from "@personal-rag/core";
import {
  ingestCursorTranscripts,
  ingestCursorFile,
  ingestObsidianVault,
  ingestChatGPTExport,
  ingestJiraIssues,
} from "@personal-rag/ingestion";
import { runExtractionBatch } from "@personal-rag/extraction";
import {
  searchKnowledge,
  searchIncidents,
  searchPatterns,
  searchDecisions,
  formatSearchResults,
} from "@personal-rag/retrieval";

const [, , command, ...args] = process.argv;

async function stats() {
  const collection = await getCollection(COLLECTION);

  const byType = await collection
    .aggregate<{ _id: string; total: number; unextracted: number }>([
      {
        $group: {
          _id: "$type",
          total: { $sum: 1 },
          unextracted: {
            $sum: { $cond: [{ $ne: ["$extracted", true] }, 1, 0] },
          },
        },
      },
      { $sort: { _id: 1 } },
    ])
    .toArray();

  const total = byType.reduce((sum, row) => sum + row.total, 0);
  const unextracted = byType.reduce((sum, row) => sum + row.unextracted, 0);

  console.log(`${COLLECTION}: ${total} documents (${unextracted} unextracted)`);
  for (const row of byType) {
    console.log(`  ${row._id}: ${row.total} (${row.unextracted} unextracted)`);
  }
}

async function ingest() {
  const source = args.find((a) => !a.startsWith("--"));
  const pathArg = args.find((a) => a.startsWith("--path="))?.slice(7);

  switch (source) {
    case "cursor":
      console.log("Ingesting Cursor transcripts...");
      console.log(await ingestCursorTranscripts(pathArg));
      break;
    case "cursor-file":
      if (!pathArg) throw new Error("--path=<file.jsonl> required");
      console.log(await ingestCursorFile(pathArg));
      break;
    case "obsidian":
      console.log("Ingesting Obsidian vault...");
      console.log(await ingestObsidianVault(pathArg));
      break;
    case "chatgpt":
      console.log("Ingesting ChatGPT export...");
      console.log(await ingestChatGPTExport(pathArg));
      break;
    case "jira":
      console.log("Ingesting Jira issues...");
      console.log(await ingestJiraIssues());
      break;
    default:
      console.log(`Usage: bun run scripts/admin.ts ingest <source> [--path=<path>]`);
      console.log("Sources: cursor, cursor-file, obsidian, chatgpt, jira");
      process.exit(1);
  }
}

async function extract() {
  const limit = Number(args.find((a) => a.startsWith("--limit="))?.slice(8) ?? 50);
  console.log(`Running extraction batch (limit=${limit})...`);
  console.log(await runExtractionBatch(limit));
}

async function search() {
  const query = args.join(" ");
  if (!query) {
    console.log("Usage: bun run scripts/admin.ts search <query>");
    process.exit(1);
  }

  const type = args.find((a) => a.startsWith("--type="))?.slice(7);

  let results;
  switch (type) {
    case "incident":
      results = await searchIncidents(query);
      break;
    case "pattern":
      results = await searchPatterns(query);
      break;
    case "decision":
      results = await searchDecisions(query);
      break;
    default:
      results = await searchKnowledge(query);
  }

  console.log(formatSearchResults(results));
}

async function main() {
  switch (command) {
    case "ingest":
      await ingest();
      break;
    case "extract":
      await extract();
      break;
    case "search":
      await search();
      break;
    case "stats":
      await stats();
      break;
    default:
      console.log(`Personal RAG Admin CLI

Usage:
  bun run scripts/admin.ts ingest <source> [--path=<path>]
  bun run scripts/admin.ts extract [--limit=50]
  bun run scripts/admin.ts search <query> [--type=incident|pattern|decision]
  bun run scripts/admin.ts stats

Sources: cursor, cursor-file, obsidian, chatgpt, jira
`);
      process.exit(command ? 1 : 0);
  }

  await closeDb();
}

main().catch(async (error) => {
  console.error(error);
  await closeDb();
  process.exit(1);
});
