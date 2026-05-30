import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  searchKnowledge,
  searchIncidents,
  searchPatterns,
  searchDecisions,
  searchArchitecture,
  formatSearchResults,
} from "@personal-rag/retrieval";

const filterInputSchema = {
  project: z.string().optional().describe("Filter by project name"),
  source: z
    .enum(["cursor", "github", "gitlab", "obsidian", "jira", "chatgpt", "copilot"])
    .optional()
    .describe("Filter by source"),
  tags: z.array(z.string()).optional().describe("Filter by tags"),
  repository: z.string().optional().describe("Filter by repository"),
  limit: z.number().int().min(1).max(50).optional().describe("Max results (default 10)"),
};

const server = new McpServer({
  name: "personal-rag",
  version: "0.1.0",
});

server.registerTool(
  "searchKnowledge",
  {
    title: "Search Knowledge",
    description:
      "Search across all personal engineering knowledge (conversations, decisions, patterns, incidents)",
    inputSchema: {
      query: z.string().describe("Natural language search query"),
      ...filterInputSchema,
    },
  },
  async ({ query, project, source, tags, repository, limit }) => {
    const results = await searchKnowledge(query, {
      project,
      source,
      tags,
      repository,
      limit,
    });
    return {
      content: [{ type: "text", text: formatSearchResults(results) }],
    };
  },
);

server.registerTool(
  "searchIncidents",
  {
    title: "Search Incidents",
    description: "Search resolved incidents and problems from your engineering history",
    inputSchema: {
      query: z.string().describe("Problem or incident to search for"),
      ...filterInputSchema,
    },
  },
  async ({ query, project, source, tags, repository, limit }) => {
    const results = await searchIncidents(query, {
      project,
      source,
      tags,
      repository,
      limit,
    });
    return {
      content: [{ type: "text", text: formatSearchResults(results) }],
    };
  },
);

server.registerTool(
  "searchPatterns",
  {
    title: "Search Patterns",
    description: "Search reusable code and architecture patterns from your history",
    inputSchema: {
      query: z.string().describe("Pattern or technique to search for"),
      ...filterInputSchema,
    },
  },
  async ({ query, project, source, tags, repository, limit }) => {
    const results = await searchPatterns(query, {
      project,
      source,
      tags,
      repository,
      limit,
    });
    return {
      content: [{ type: "text", text: formatSearchResults(results) }],
    };
  },
);

server.registerTool(
  "searchArchitecture",
  {
    title: "Search Architecture",
    description: "Search architectural decisions and patterns combined",
    inputSchema: {
      query: z.string().describe("Architecture question or topic"),
      ...filterInputSchema,
    },
  },
  async ({ query, project, source, tags, repository, limit }) => {
    const results = await searchArchitecture(query, {
      project,
      source,
      tags,
      repository,
      limit,
    });
    return {
      content: [{ type: "text", text: formatSearchResults(results) }],
    };
  },
);

server.registerTool(
  "searchDecisions",
  {
    title: "Search Decisions",
    description: "Search architectural and engineering decisions (ADRs, PR decisions)",
    inputSchema: {
      query: z.string().describe("Decision topic to search for"),
      ...filterInputSchema,
    },
  },
  async ({ query, project, source, tags, repository, limit }) => {
    const results = await searchDecisions(query, {
      project,
      source,
      tags,
      repository,
      limit,
    });
    return {
      content: [{ type: "text", text: formatSearchResults(results) }],
    };
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("personal-rag MCP server running on stdio");
}

main().catch((error) => {
  console.error("MCP server failed:", error);
  process.exit(1);
});
