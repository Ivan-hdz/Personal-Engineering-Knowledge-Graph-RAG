import { config } from "@personal-rag/core";
import { ingestGitHubEvent, verifyGitHubSignature } from "./github.ts";
import { ingestGitLabEvent, verifyGitLabToken } from "./gitlab.ts";

export async function startWebhookServer(port = config.webhook.port): Promise<void> {
  const server = Bun.serve({
    port,
    async fetch(request) {
      const url = new URL(request.url);

      if (url.pathname === "/health") {
        return Response.json({ status: "ok" });
      }

      if (url.pathname === "/webhooks/github" && request.method === "POST") {
        const rawBody = await request.text();
        const signature = request.headers.get("x-hub-signature-256");
        if (!verifyGitHubSignature(rawBody, signature)) {
          return new Response("Invalid signature", { status: 401 });
        }

        const event = request.headers.get("x-github-event") ?? "unknown";
        const payload = JSON.parse(rawBody);
        const result = await ingestGitHubEvent(event, payload);
        return Response.json({ ok: true, ...result });
      }

      if (url.pathname === "/webhooks/gitlab" && request.method === "POST") {
        const token = request.headers.get("x-gitlab-token");
        if (!verifyGitLabToken(token)) {
          return new Response("Invalid token", { status: 401 });
        }

        const event = request.headers.get("x-gitlab-event") ?? "unknown";
        const payload = await request.json();
        const result = await ingestGitLabEvent(event, payload);
        return Response.json({ ok: true, ...result });
      }

      return new Response("Not found", { status: 404 });
    },
  });

  console.log(`Webhook server listening on http://localhost:${server.port}`);
  console.log("  POST /webhooks/github");
  console.log("  POST /webhooks/gitlab");
  console.log("  GET  /health");
}

if (import.meta.main) {
  startWebhookServer().catch(console.error);
}
