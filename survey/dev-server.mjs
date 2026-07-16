#!/usr/bin/env node
/**
 * Local static site + Feishu form submit proxy (OpenAPI).
 *
 *   node survey/dev-server.mjs
 *   open http://127.0.0.1:8787/survey/
 *
 * Credentials (first match wins):
 *   1. process.env.FEISHU_APP_ID / FEISHU_APP_SECRET
 *   2. survey/.env.local
 */

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PORT = Number(process.env.PORT || 8787);
const SHARE_TOKEN = "shrcnGsFJjC4lrUyJbQIQcTcgGe";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".ttf": "font/ttf",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".json": "application/json; charset=utf-8",
};

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
    throw new Error(
      "Missing Feishu credentials. Set FEISHU_APP_ID/FEISHU_APP_SECRET or create survey/.env.local"
    );
  }
  return { appId, appSecret };
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

async function handleSubmit(req, res) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
  const content = body.content;
  if (!content || typeof content !== "object") {
    res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ ok: false, error: "Missing content" }));
    return;
  }

  console.log("Submit content keys:", Object.keys(content));
  console.log("Submit content:", JSON.stringify(content, null, 2));

  const creds = loadCredentials();
  const token = await getTenantToken(creds);
  const payload = await submitViaOpenApi(content, token);

  if (payload && payload.code === 0) {
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ ok: true, data: payload.data || {} }));
    return;
  }

  console.error("Feishu reject:", JSON.stringify(payload));
  res.writeHead(502, { "Content-Type": "application/json; charset=utf-8" });
  res.end(
    JSON.stringify({
      ok: false,
      error: "Feishu rejected submission",
      feishu: payload,
    })
  );
}

function safeJoin(root, urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  const cleaned = path.normalize(decoded).replace(/^(\.\.[/\\])+/, "");
  const full = path.join(root, cleaned);
  if (!full.startsWith(root)) return null;
  return full;
}

function serveStatic(req, res) {
  let urlPath = req.url || "/";
  if (urlPath === "/") urlPath = "/index.html";
  if (urlPath.endsWith("/")) urlPath += "index.html";

  const filePath = safeJoin(ROOT, urlPath);
  if (!filePath || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
  fs.createReadStream(filePath).pipe(res);
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === "OPTIONS" && req.url === "/api/feishu-submit") {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      });
      res.end();
      return;
    }

    if (req.method === "POST" && req.url === "/api/feishu-submit") {
      await handleSubmit(req, res);
      return;
    }

    if (req.method === "GET" || req.method === "HEAD") {
      serveStatic(req, res);
      return;
    }

    res.writeHead(405, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Method not allowed");
  } catch (error) {
    console.error(error);
    res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ ok: false, error: error.message || String(error) }));
  }
});

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  server.listen(PORT, "127.0.0.1", () => {
    console.log(`archarch local server: http://127.0.0.1:${PORT}/survey/`);
    console.log(`Feishu submit endpoint: POST http://127.0.0.1:${PORT}/api/feishu-submit`);
  });
}
