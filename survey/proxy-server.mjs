#!/usr/bin/env node
/**
 * Local guest-submit proxy for development.
 *   node survey/proxy-server.mjs
 * Then in DevTools:
 *   window.ARCHARCH_FEISHU_SUBMIT_URL = "http://127.0.0.1:8787"
 */

import http from "node:http";
import { pathToFileURL } from "node:url";

const SHARE_TOKEN = "shrcnGsFJjC4lrUyJbQIQcTcgGe";
const TENANT_HOST = "https://xcn7l91l079q.feishu.cn";
const FORM_URL = `${TENANT_HOST}/share/base/form/${SHARE_TOKEN}`;
const SUBMIT_URL = `${TENANT_HOST}/space/api/bitable/share/content`;
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
const PORT = Number(process.env.PORT || 8787);

function cors(origin) {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function mergeCookies(jar, headers) {
  const raw = headers.getSetCookie ? headers.getSetCookie() : [];
  const list = raw.length ? raw : headers.get("set-cookie") ? [headers.get("set-cookie")] : [];
  for (const item of list) {
    if (!item) continue;
    const pair = item.split(";", 1)[0];
    const eq = pair.indexOf("=");
    if (eq > 0) jar.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
  }
}

function cookieHeader(jar) {
  return Array.from(jar.entries())
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
}

async function openGuestSession() {
  const jar = new Map();
  let url = FORM_URL;
  for (let hop = 0; hop < 10; hop += 1) {
    const res = await fetch(url, {
      method: "GET",
      redirect: "manual",
      headers: { "User-Agent": UA, Accept: "text/html", Cookie: cookieHeader(jar) },
    });
    mergeCookies(jar, res.headers);
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (!loc) break;
      url = new URL(loc, url).href;
      continue;
    }
    return { jar, status: res.status };
  }
  throw new Error("Failed to establish Feishu guest session");
}

async function submitGuest(fields, jar) {
  const body = {
    shareToken: SHARE_TOKEN,
    data: JSON.stringify(fields),
    preUploadEnable: false,
  };
  const res = await fetch(SUBMIT_URL, {
    method: "POST",
    headers: {
      "User-Agent": UA,
      Accept: "application/json",
      "Content-Type": "application/json",
      Origin: TENANT_HOST,
      Referer: FORM_URL,
      Cookie: cookieHeader(jar),
      "X-CSRFToken": jar.get("_csrf_token") || "",
      "X-TT-Trace": "1",
    },
    body: JSON.stringify(body),
  });
  return { httpStatus: res.status, payload: await res.json() };
}

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin || "*";
  const headers = { ...cors(origin), "Content-Type": "application/json; charset=utf-8" };

  if (req.method === "OPTIONS") {
    res.writeHead(204, headers);
    res.end();
    return;
  }

  if (req.method !== "POST") {
    res.writeHead(405, headers);
    res.end(JSON.stringify({ ok: false, error: "Method not allowed" }));
    return;
  }

  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
    if (!body.fields || typeof body.fields !== "object") {
      res.writeHead(400, headers);
      res.end(JSON.stringify({ ok: false, error: "Missing fields" }));
      return;
    }

    const session = await openGuestSession();
    const result = await submitGuest(body.fields, session.jar);
    if (result.payload && result.payload.code === 0) {
      res.writeHead(200, headers);
      res.end(JSON.stringify({ ok: true, data: result.payload.data || {} }));
      return;
    }

    res.writeHead(502, headers);
    res.end(
      JSON.stringify({
        ok: false,
        error: "Feishu rejected submission",
        feishu: result.payload,
      })
    );
  } catch (error) {
    res.writeHead(500, headers);
    res.end(JSON.stringify({ ok: false, error: error.message || String(error) }));
  }
});

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  server.listen(PORT, "127.0.0.1", () => {
    console.log(`Feishu guest proxy listening on http://127.0.0.1:${PORT}`);
  });
}
