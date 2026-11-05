import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { POST } from "../app/api/v1/[...path]/route.ts";

test("proxy forwards and clears separate cookies only to its fixed upstream", async () => {
  const original = globalThis.fetch;
  const previous = { ...process.env };
  process.env.API_UPSTREAM_ORIGIN = "http://127.0.0.1:8000";
  process.env.API_UPSTREAM_ALLOWED_HOST = "127.0.0.1";
  process.env.NEXT_PUBLIC_APP_ENV = "development";
  let upstreamRequest;
  globalThis.fetch = async (url, init) => {
    upstreamRequest = { url: String(url), init };
    const headers = new Headers();
    headers.append("Set-Cookie", "eb_session_dev=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax");
    headers.append("Set-Cookie", "eb_preauth_dev=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax");
    return new Response(null, { status: 204, headers });
  };
  try {
    const response = await POST(new Request("http://localhost:3000/api/v1/auth/logout", { method: "POST", headers: { Cookie: "eb_session_dev=synthetic", Origin: "http://localhost:3000", "X-CSRF-Token": "synthetic", "X-Forwarded-For": "spoofed" }, body: "{}" }));
    assert.equal(response.status, 204);
    assert.equal(upstreamRequest.url, "http://127.0.0.1:8000/api/v1/auth/logout");
    assert.equal(upstreamRequest.init.headers.get("cookie"), "eb_session_dev=synthetic");
    assert.equal(upstreamRequest.init.headers.get("x-forwarded-for"), null);
    assert.equal(response.headers.getSetCookie().length, 2);
    assert.match(response.headers.getSetCookie()[0], /Max-Age=0/i);
  } finally {
    globalThis.fetch = original;
    for (const key of ["API_UPSTREAM_ORIGIN", "API_UPSTREAM_ALLOWED_HOST", "NEXT_PUBLIC_APP_ENV"]) {
      if (previous[key] === undefined) delete process.env[key]; else process.env[key] = previous[key];
    }
  }
});

test("production proxy signs the platform client IP and rejects unsigned platform context", async () => {
  const original = globalThis.fetch;
  const keys = ["NODE_ENV", "NEXT_PUBLIC_APP_ENV", "API_UPSTREAM_ORIGIN", "API_UPSTREAM_ALLOWED_HOST", "AUTH_PROXY_SECRET", "VERCEL"];
  const saved = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  Object.assign(process.env, { NODE_ENV: "production", NEXT_PUBLIC_APP_ENV: "production", API_UPSTREAM_ORIGIN: "https://api.example.invalid", API_UPSTREAM_ALLOWED_HOST: "api.example.invalid", AUTH_PROXY_SECRET: "p".repeat(32), VERCEL: "1" });
  try {
    let sent;
    globalThis.fetch = async (_url, init) => { sent = init.headers; return Response.json({}); };
    const makeRequest = headers => new Request("https://app.example.invalid/api/v1/auth/login", { method: "POST", headers, body: "{}" });
    assert.equal((await POST(makeRequest({}))).status, 503);
    assert.equal((await POST(makeRequest({ "x-vercel-forwarded-for": "203.0.113.42", "x-eb-client-ip": "1.1.1.1", "x-eb-proxy-time": "1", "x-eb-proxy-signature": "forged" }))).status, 200);
    assert.equal(sent.get("x-eb-client-ip"), "203.0.113.42");
    assert.notEqual(sent.get("x-eb-proxy-time"), "1");
    assert.notEqual(sent.get("x-eb-proxy-signature"), "forged");
    const expected = createHmac("sha256", "p".repeat(32)).update(`${sent.get("x-eb-proxy-time")}.203.0.113.42.POST./api/v1/auth/login`).digest("hex");
    assert.equal(sent.get("x-eb-proxy-signature"), expected);
  } finally {
    globalThis.fetch = original;
    for (const key of keys) { if (saved[key] === undefined) delete process.env[key]; else process.env[key] = saved[key]; }
  }
});

test("proxy forwards session cookies and rejects upstream redirects", async () => {
  const oldFetch = globalThis.fetch;
  const oldOrigin = process.env.API_UPSTREAM_ORIGIN;
  const oldHost = process.env.API_UPSTREAM_ALLOWED_HOST;
  const oldEnv = process.env.NEXT_PUBLIC_APP_ENV;
  process.env.API_UPSTREAM_ORIGIN = "http://127.0.0.1:8000";
  process.env.API_UPSTREAM_ALLOWED_HOST = "127.0.0.1";
  process.env.NEXT_PUBLIC_APP_ENV = "development";
  try {
    globalThis.fetch = async () => {
      const headers = new Headers();
      headers.append("Set-Cookie", "eb_session_dev=synthetic; Path=/; HttpOnly; SameSite=Lax");
      headers.append("Set-Cookie", "eb_preauth_dev=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax");
      return new Response("{}", { status: 200, headers });
    };
    const request = () => new Request("http://localhost:3000/api/v1/auth/login", { method: "POST", body: "{}" });
    const response = await POST(request());
    assert.equal(response.headers.getSetCookie().length, 2);
    assert.match(response.headers.getSetCookie()[0], /HttpOnly/i);
    globalThis.fetch = async () => new Response(null, { status: 302, headers: { Location: "https://untrusted.example.invalid/" } });
    assert.equal((await POST(request())).status, 502);
  } finally {
    globalThis.fetch = oldFetch;
    for (const [key, value] of Object.entries({ API_UPSTREAM_ORIGIN: oldOrigin, API_UPSTREAM_ALLOWED_HOST: oldHost, NEXT_PUBLIC_APP_ENV: oldEnv })) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});
