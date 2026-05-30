import { config } from "@personal-rag/core";
import { ingestRawContent, type IngestResult } from "./base.ts";

interface JiraIssue {
  key: string;
  fields: {
    summary: string;
    description?: string | { content?: unknown[] };
    created: string;
    updated: string;
    labels?: string[];
    comment?: { comments?: Array<{ body?: string | { content?: unknown[] }; author?: { displayName?: string } }> };
    project?: { key?: string; name?: string };
    assignee?: { displayName?: string };
  };
}

function extractJiraText(value: unknown): string {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return "";

  const obj = value as { content?: Array<{ type?: string; text?: string; content?: unknown[] }> };
  if (!obj.content) return "";

  return obj.content
    .map((block) => {
      if (block.text) return block.text;
      if (block.content) return extractJiraText({ content: block.content });
      return "";
    })
    .join("\n");
}

export async function ingestJiraIssues(jql = "ORDER BY updated DESC"): Promise<IngestResult> {
  const { baseUrl, email, apiToken } = config.sources.jira;

  if (!baseUrl || !email || !apiToken) {
    throw new Error("JIRA_BASE_URL, JIRA_EMAIL, and JIRA_API_TOKEN are required");
  }

  const auth = Buffer.from(`${email}:${apiToken}`).toString("base64");
  const url = `${baseUrl}/rest/api/3/search?jql=${encodeURIComponent(jql)}&maxResults=100&fields=summary,description,created,updated,labels,comment,project,assignee`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Basic ${auth}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Jira API failed: ${response.statusText}`);
  }

  const data = (await response.json()) as { issues: JiraIssue[] };
  let inserted = 0;
  let skipped = 0;
  const ids: string[] = [];

  for (const issue of data.issues) {
    const description = extractJiraText(issue.fields.description);
    const comments =
      issue.fields.comment?.comments
        ?.map((c) => {
          const author = c.author?.displayName ?? "unknown";
          const body = extractJiraText(c.body);
          return `[${author}]: ${body}`;
        })
        .join("\n\n") ?? "";

    const content = [
      `# ${issue.fields.summary}`,
      description,
      comments ? `\n## Comments\n${comments}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    const result = await ingestRawContent(content, {
      source: "jira",
      project: issue.fields.project?.key ?? issue.fields.project?.name,
      date: issue.fields.updated.slice(0, 10),
      title: `${issue.key}: ${issue.fields.summary}`,
      type: "conversation",
      tags: ["jira", ...(issue.fields.labels ?? [])],
      author: issue.fields.assignee?.displayName,
      extracted: false,
      technologies: [],
    });

    inserted += result.inserted;
    skipped += result.skipped;
    ids.push(...result.ids);
  }

  return { inserted, skipped, ids };
}
