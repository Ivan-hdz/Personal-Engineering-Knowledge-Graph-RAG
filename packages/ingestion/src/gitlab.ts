import { createHmac, timingSafeEqual } from "node:crypto";
import { ingestRawContent, type IngestResult } from "./base.ts";
import { config } from "@personal-rag/core";

interface GitLabMergeRequestPayload {
  object_attributes: {
    iid: number;
    title: string;
    description: string;
    state: string;
    source_branch: string;
    target_branch: string;
    action: string;
  };
  user: { name: string; username: string };
  project: {
    name: string;
    path_with_namespace: string;
  };
}

interface GitLabPushPayload {
  ref: string;
  commits: Array<{
    id: string;
    message: string;
    author: { name: string; email: string };
    timestamp: string;
  }>;
  project: {
    name: string;
    path_with_namespace: string;
  };
}

export function verifyGitLabToken(token: string | null): boolean {
  if (!config.webhook.gitlabSecret) return true;
  if (!token) return false;
  try {
    return timingSafeEqual(Buffer.from(token), Buffer.from(config.webhook.gitlabSecret));
  } catch {
    return false;
  }
}

export async function ingestGitLabEvent(
  event: string,
  payload: GitLabMergeRequestPayload | GitLabPushPayload,
): Promise<IngestResult> {
  if (event === "Merge Request Hook") {
    return ingestGitLabMergeRequest(payload as GitLabMergeRequestPayload);
  }
  if (event === "Push Hook") {
    return ingestGitLabPush(payload as GitLabPushPayload);
  }
  return { inserted: 0, skipped: 0, ids: [] };
}

async function ingestGitLabMergeRequest(payload: GitLabMergeRequestPayload): Promise<IngestResult> {
  const mr = payload.object_attributes;
  const content = [
    `# MR !${mr.iid}: ${mr.title}`,
    `Author: ${payload.user.name} (@${payload.user.username})`,
    `Branch: ${mr.source_branch} → ${mr.target_branch}`,
    `State: ${mr.state} (${mr.action})`,
    mr.description ?? "",
  ].join("\n\n");

  return ingestRawContent(content, {
    source: "gitlab",
    project: payload.project.path_with_namespace,
    repository: payload.project.name,
    date: new Date().toISOString().slice(0, 10),
    title: `MR !${mr.iid}: ${mr.title}`,
    type: mr.state === "merged" ? "decision" : "conversation",
    branch: mr.source_branch,
    pr: mr.iid,
    author: payload.user.username,
    tags: ["gitlab", "merge-request", mr.action],
    extracted: false,
    technologies: [],
  });
}

async function ingestGitLabPush(payload: GitLabPushPayload): Promise<IngestResult> {
  let inserted = 0;
  let skipped = 0;
  const ids: string[] = [];

  for (const commit of payload.commits) {
    const content = [`# Commit ${commit.id.slice(0, 7)}`, commit.message].join("\n\n");
    const result = await ingestRawContent(content, {
      source: "gitlab",
      project: payload.project.path_with_namespace,
      repository: payload.project.name,
      date: commit.timestamp.slice(0, 10),
      title: commit.message.split("\n")[0],
      type: "conversation",
      branch: payload.ref.replace("refs/heads/", ""),
      author: commit.author.name,
      tags: ["gitlab", "commit"],
      extracted: false,
      technologies: [],
    });
    inserted += result.inserted;
    skipped += result.skipped;
    ids.push(...result.ids);
  }

  return { inserted, skipped, ids };
}

export function verifyGitHubSignatureForLambda(
  payload: string,
  signature: string,
  secret: string,
): boolean {
  const expected = `sha256=${createHmac("sha256", secret).update(payload).digest("hex")}`;
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}
