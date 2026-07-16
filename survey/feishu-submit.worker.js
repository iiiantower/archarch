/**
 * Cloudflare Worker: submit archarch survey → Feishu form (OpenAPI).
 *
 * Secrets:
 *   wrangler secret put FEISHU_APP_ID
 *   wrangler secret put FEISHU_APP_SECRET
 *
 * Deploy:
 *   npx wrangler deploy
 */

const SHARE_TOKEN = "shrcnGsFJjC4lrUyJbQIQcTcgGe";

const ALLOWED_ORIGINS = new Set([
  "https://archarch.net",
  "https://www.archarch.net",
  "http://localhost:8787",
  "http://127.0.0.1:8787",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]);

function corsHeaders(origin) {
  const allow = origin && ALLOWED_ORIGINS.has(origin) ? origin : "https://archarch.net";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function json(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...corsHeaders(origin),
    },
  });
}

async function getTenantToken(env) {
  const res = await fetch(
    "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        app_id: env.FEISHU_APP_ID,
        app_secret: env.FEISHU_APP_SECRET,
      }),
    }
  );
  const data = await res.json();
  if (!data.tenant_access_token) {
    throw new Error(data.msg || "Failed to get tenant_access_token");
  }
  return data.tenant_access_token;
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (request.method !== "POST") {
      return json({ ok: false, error: "Method not allowed" }, 405, origin);
    }

    if (!env.FEISHU_APP_ID || !env.FEISHU_APP_SECRET) {
      return json({ ok: false, error: "Server missing Feishu credentials" }, 500, origin);
    }

    let content;
    try {
      const body = await request.json();
      content = body && body.content;
      if (!content || typeof content !== "object") {
        throw new Error("Missing content");
      }
    } catch {
      return json({ ok: false, error: "Invalid JSON body" }, 400, origin);
    }

    try {
      const token = await getTenantToken(env);
      const res = await fetch(
        "https://open.feishu.cn/open-apis/base/v3/bases/tables/forms/submit",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            share_token: SHARE_TOKEN,
            content,
          }),
        }
      );
      const payload = await res.json();
      if (payload && payload.code === 0) {
        return json({ ok: true, data: payload.data || {} }, 200, origin);
      }
      return json(
        { ok: false, error: "Feishu rejected submission", feishu: payload },
        502,
        origin
      );
    } catch (error) {
      return json(
        { ok: false, error: error instanceof Error ? error.message : String(error) },
        500,
        origin
      );
    }
  },
};
