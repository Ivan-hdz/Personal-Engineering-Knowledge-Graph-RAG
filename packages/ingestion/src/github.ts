import { createHmac, timingSafeEqual } from "node:crypto";
import { config } from "@personal-rag/core";
import { ingestRawContent, type IngestResult } from "./base.ts";

interface GitHubPullRequestPayload {
  action: string;
  pull_request: {
    number: number;
    title: string;
    body: string | null;
    merged: boolean;
    user: { login: string };
    head: { ref: string };
    base: { ref: string };
  };
  repository: {
    name: string;
    full_name: string;
  };
}

interface GitHubPushPayload {
  ref: string;
  commits: Array<{
    id: string;
    message: string;
    author: { name: string; email: string };
    timestamp: string;
  }>;
  repository: {
    name: string;
    full_name: string;
  };
}

export function verifyGitHubSignature(payload: string, signature: string | null): boolean {
  if (!config.webhook.githubSecret || !signature) return !config.webhook.githubSecret;
  const expected = `sha256=${createHmac("sha256", config.webhook.githubSecret).update(payload).digest("hex")}`;
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

export async function ingestGitHubEvent(
  event: string,
  payload: GitHubPullRequestPayload | GitHubPushPayload,
): Promise<IngestResult> {
  if (event === "pull_request") {
    return ingestGitHubPullRequest(payload as GitHubPullRequestPayload);
  }
  if (event === "push") {
    return ingestGitHubPush(payload as GitHubPushPayload);
  }
  return { inserted: 0, skipped: 0, ids: [] };
}

async function ingestGitHubPullRequest(payload: GitHubPullRequestPayload): Promise<IngestResult> {
  const pr = payload.pull_request;
  const content = [
    `# PR #${pr.number}: ${pr.title}`,
    `Author: ${pr.user.login}`,
    `Branch: ${pr.head.ref} → ${pr.base.ref}`,
    `Action: ${payload.action}`,
    pr.body ?? "",
  ].join("\n\n");

  return ingestRawContent(content, {
    source: "github",
    project: payload.repository.full_name,
    repository: payload.repository.name,
    date: new Date().toISOString().slice(0, 10),
    title: `PR #${pr.number}: ${pr.title}`,
    type: pr.merged || payload.action === "closed" ? "decision" : "conversation",
    branch: pr.head.ref,
    pr: pr.number,
    author: pr.user.login,
    tags: ["github", "pull-request", payload.action],
    extracted: false,
    technologies: [],
  });
}

async function ingestGitHubPush(payload: GitHubPushPayload): Promise<IngestResult> {
  let inserted = 0;
  let skipped = 0;
  const ids: string[] = [];

  for (const commit of payload.commits) {
    const content = [`# Commit ${commit.id.slice(0, 7)}`, commit.message].join("\n\n");
    const result = await ingestRawContent(content, {
      source: "github",
      project: payload.repository.full_name,
      repository: payload.repository.name,
      date: commit.timestamp.slice(0, 10),
      title: commit.message.split("\n")[0],
      type: "conversation",
      branch: payload.ref.replace("refs/heads/", ""),
      author: commit.author.name,
      tags: ["github", "commit"],
      extracted: false,
      technologies: [],
    });
    inserted += result.inserted;
    skipped += result.skipped;
    ids.push(...result.ids);
  }

  return { inserted, skipped, ids };
}
