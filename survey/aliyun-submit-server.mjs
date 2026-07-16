#!/usr/bin/env node
/**
 * Production Feishu survey submit API for Aliyun / any VPS.
 *
 *   FEISHU_APP_ID=... FEISHU_APP_SECRET=... node survey/aliyun-submit-server.mjs
 *
 * Env:
 *   FEISHU_APP_ID / FEISHU_APP_SECRET  required
 *   PORT                               default 8787
 *   ALLOWED_ORIGINS                    comma-separated, default includes archarch.net
 */

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 8787);
const SHARE_TOKEN = "shrcnGsFJjC4lrUyJbQIQcTcgGe";

const DEFAULT_ORIGINS = [
  "https://archarch.net",
  "https://www.archarch.net",
  "http://127.0.0.1:8787",
  "http://localhost:8787",
];

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const out = {};
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

function loadCredentials() {
  const fileEnv = loadEnvFile(path.join(__dirname, ".env.local"));
  const appId = process.env.FEISHU_APP_ID || fileEnv.FEISHU_APP_ID;
  const appSecret = process.env.FEISHU_APP_SECRET || fileEnv.FEISHU_APP_SECRET;
  if (!appId || !appSecret) {
    throw new Error("Missing FEISHU_APP_ID / FEISHU_APP_SECRET");
  }
  return { appId, appSecret };
}

function allowedOrigins() {
  const fromEnv = (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return new Set([...DEFAULT_ORIGINS, ...fromEnv]);
}

function corsHeaders(origin, origins) {
  const allow = origin && origins.has(origin) ? origin : "https://archarch.net";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

async function getTenantToken(creds) {
  const res = await fetch(
    "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        app_id: creds.appId,
        app_secret: creds.appSecret,
      }),
    }
  );
  const data = await res.json();
  if (!data.tenant_access_token) {
    throw new Error(data.msg || "Failed to get tenant_access_token");
  }
  return data.tenant_access_token;
}

async function submitViaOpenApi(content, token) {
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
  return res.json();
}

function sendJson(res, status, body, origin, origins) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    ...corsHeaders(origin, origins),
  });
  res.end(JSON.stringify(body));
}

const origins = allowedOrigins();
const creds = loadCredentials();

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin || "";
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

  try {
    if (req.method === "OPTIONS" && url.pathname === "/api/feishu-submit") {
      res.writeHead(204, corsHeaders(origin, origins));
      res.end();
      return;
    }

    if (req.method === "GET" && url.pathname === "/health") {
      sendJson(res, 200, { ok: true }, origin, origins);
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/feishu-submit") {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
      const content = body.content;
      if (!content || typeof content !== "object") {
        sendJson(res, 400, { ok: false, error: "Missing content" }, origin, origins);
        return;
      }

      const token = await getTenantToken(creds);
      const payload = await submitViaOpenApi(content, token);
      if (payload && payload.code === 0) {
        sendJson(res, 200, { ok: true, data: payload.data || {} }, origin, origins);
        return;
      }

      console.error("Feishu reject:", JSON.stringify(payload));
      sendJson(
        res,
        502,
        { ok: false, error: "Feishu rejected submission", feishu: payload },
        origin,
        origins
      );
      return;
    }

    sendJson(res, 404, { ok: false, error: "Not found" }, origin, origins);
  } catch (error) {
    console.error(error);
    sendJson(
      res,
      500,
      { ok: false, error: error.message || String(error) },
      origin,
      origins
    );
  }
});

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Feishu submit API listening on 0.0.0.0:${PORT}`);
    console.log(`Health:  GET  /health`);
    console.log(`Submit: POST /api/feishu-submit`);
  });
}
