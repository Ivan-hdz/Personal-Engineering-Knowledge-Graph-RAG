import { config } from "@personal-rag/core";
import { ingestGitHubEvent, verifyGitHubSignature } from "./github.ts";
import { ingestGitLabEvent, verifyGitLabToken } from "./gitlab.ts";

function log(message: string): void {
  const ts = new Date().toISOString();
  process.stderr.write(`[webhook ${ts}] ${message}\n`);
}

export async function startWebhookServer(port = config.webhook.port): Promise<void> {
  const server = Bun.serve({
    port,
    async fetch(request) {
      const url = new URL(request.url);
      const clientIp = request.headers.get("x-forwarded-for") ?? "local";

      log(`${request.method} ${url.pathname} from ${clientIp}`);

      if (url.pathname === "/health") {
        return Response.json({ status: "ok" });
      }

      if (url.pathname === "/webhooks/github" && request.method === "POST") {
        const rawBody = await request.text();
        const signature = request.headers.get("x-hub-signature-256");
        const event = request.headers.get("x-github-event") ?? "unknown";
        const deliveryId = request.headers.get("x-github-delivery") ?? "—";

        if (!verifyGitHubSignature(rawBody, signature)) {
          log(`GitHub ${event} (${deliveryId}): rejected — invalid signature`);
          return new Response("Invalid signature", { status: 401 });
        }

        log(`GitHub ${event} (${deliveryId}): signature OK, ingesting...`);
        const payload = JSON.parse(rawBody);
        const result = await ingestGitHubEvent(event, payload);
        log(
          `GitHub ${event} (${deliveryId}): done inserted=${result.inserted} skipped=${result.skipped}`,
        );
        return Response.json({ ok: true, ...result });
      }

      if (url.pathname === "/webhooks/gitlab" && request.method === "POST") {
        const token = request.headers.get("x-gitlab-token");
        const event = request.headers.get("x-gitlab-event") ?? "unknown";

        if (!verifyGitLabToken(token)) {
          log(`GitLab ${event}: rejected — invalid token`);
          return new Response("Invalid token", { status: 401 });
        }

        log(`GitLab ${event}: token OK, ingesting...`);
        const payload = await request.json();
        const result = await ingestGitLabEvent(event, payload);
        log(`GitLab ${event}: done inserted=${result.inserted} skipped=${result.skipped}`);
        return Response.json({ ok: true, ...result });
      }

      log(`${request.method} ${url.pathname}: 404 not found`);
      return new Response("Not found", { status: 404 });
    },
  });

  log(`listening on http://localhost:${server.port}`);
  log("  POST /webhooks/github");
  log("  POST /webhooks/gitlab");
  log("  GET  /health");
}

if (import.meta.main) {
  startWebhookServer().catch(console.error);
}
