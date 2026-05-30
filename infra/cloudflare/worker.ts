/**
 * Cloudflare Workers webhook handler (free tier: 100K req/day).
 * Deploy: npx wrangler deploy infra/cloudflare/worker.ts
 */
export interface Env {
  MONGODB_URI: string;
  GITHUB_WEBHOOK_SECRET: string;
  GITLAB_WEBHOOK_SECRET: string;
  INGESTION_WEBHOOK_URL?: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return Response.json({ status: "ok" });
    }

    // Forward to local ingestion server or MongoDB directly
    if (env.INGESTION_WEBHOOK_URL) {
      const target = url.pathname.includes("gitlab")
        ? `${env.INGESTION_WEBHOOK_URL}/webhooks/gitlab`
        : `${env.INGESTION_WEBHOOK_URL}/webhooks/github`;

      return fetch(target, {
        method: request.method,
        headers: request.headers,
        body: request.body,
      });
    }

    return new Response("Configure INGESTION_WEBHOOK_URL or deploy Lambda handler", {
      status: 501,
    });
  },
};
