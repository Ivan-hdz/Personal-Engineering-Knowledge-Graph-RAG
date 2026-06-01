/**
 * AWS Lambda handler for GitHub/GitLab webhooks.
 * Deploy via: cd infra/terraform && terraform apply
 *
 * Note: For zero-cost alternative, use the local webhook server:
 *   bun run webhook
 * Or deploy to Cloudflare Workers (see infra/cloudflare/worker.ts)
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { MongoClient } from "mongodb";
import { createHash } from "node:crypto";

const MONGODB_URI = process.env.MONGODB_URI!;
const GITHUB_SECRET = process.env.GITHUB_WEBHOOK_SECRET ?? "";
const GITLAB_SECRET = process.env.GITLAB_WEBHOOK_SECRET ?? "";

function hashContent(content: string): string {
  return createHash("sha256").update(content.trim()).digest("hex");
}

function verifyGitHub(payload: string, signature: string | undefined): boolean {
  if (!GITHUB_SECRET || !signature) return !GITHUB_SECRET;
  const expected = `sha256=${createHmac("sha256", GITHUB_SECRET).update(payload).digest("hex")}`;
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

function verifyGitLab(token: string | undefined): boolean {
  if (!GITLAB_SECRET) return true;
  if (!token) return false;
  try {
    return timingSafeEqual(Buffer.from(token), Buffer.from(GITLAB_SECRET));
  } catch {
    return false;
  }
}

async function ingestDocument(
  client: MongoClient,
  doc: Record<string, unknown>,
): Promise<{ inserted: boolean }> {
  const db = client.db("personal-rag");
  const collection = db.collection("knowledge");
  const contentHash = hashContent(doc.content as string);
  const existing = await collection.findOne({ contentHash });
  if (existing) return { inserted: false };

  await collection.insertOne({
    ...doc,
    contentHash,
    extracted: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  return { inserted: true };
}

export async function handler(event: {
  rawPath: string;
  body: string;
  headers: Record<string, string>;
}): Promise<{ statusCode: number; body: string }> {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();

  try {
    if (event.rawPath === "/webhooks/github") {
      const signature = event.headers["x-hub-signature-256"];
      if (!verifyGitHub(event.body, signature)) {
        return { statusCode: 401, body: "Invalid signature" };
      }

      const ghEvent = event.headers["x-github-event"];
      const payload = JSON.parse(event.body);

      if (ghEvent === "pull_request") {
        const pr = payload.pull_request;
        const content = [`# PR #${pr.number}: ${pr.title}`, pr.body ?? ""].join("\n\n");
        const result = await ingestDocument(client, {
          source: "github",
          project: payload.repository.full_name,
          date: new Date().toISOString().slice(0, 10),
          title: `PR #${pr.number}: ${pr.title}`,
          type: "conversation",
          content,
          tags: ["github", "pull-request"],
        });
        return { statusCode: 200, body: JSON.stringify(result) };
      }
    }

    if (event.rawPath === "/webhooks/gitlab") {
      const token = event.headers["x-gitlab-token"];
      if (!verifyGitLab(token)) {
        return { statusCode: 401, body: "Invalid token" };
      }

      const payload = JSON.parse(event.body);
      if (payload.object_attributes) {
        const mr = payload.object_attributes;
        const content = [`# MR !${mr.iid}: ${mr.title}`, mr.description ?? ""].join("\n\n");
        const result = await ingestDocument(client, {
          source: "gitlab",
          project: payload.project.path_with_namespace,
          date: new Date().toISOString().slice(0, 10),
          title: `MR !${mr.iid}: ${mr.title}`,
          type: mr.state === "merged" ? "decision" : "conversation",
          content,
          tags: ["gitlab", "merge-request"],
        });
        return { statusCode: 200, body: JSON.stringify(result) };
      }
    }

    return { statusCode: 404, body: "Not found" };
  } finally {
    await client.close();
  }
}
