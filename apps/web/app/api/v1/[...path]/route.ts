/** Same-origin gateway to the configured FastAPI origin. */
import { isIP } from "node:net";
import { createHmac } from "node:crypto";

const requestHeaders = ["accept", "content-type", "cookie", "origin", "x-csrf-token", "idempotency-key", "if-match", "if-none-match", "x-request-id"];
const responseHeaders = ["content-type", "cache-control", "etag", "x-request-id", "retry-after"];

async function forward(request: Request): Promise<Response> {
  const configured = process.env.API_UPSTREAM_ORIGIN;
  const allowedHost = process.env.API_UPSTREAM_ALLOWED_HOST;
  if (!configured || !allowedHost) return Response.json({ error: { code: "TEMPORARY_UNAVAILABLE", message: "API gateway is not configured." } }, { status: 503 });
  let upstream: URL;
  try { upstream = new URL(configured); } catch { return Response.json({ error: { code: "TEMPORARY_UNAVAILABLE", message: "API gateway configuration is invalid." } }, { status: 503 }); }
  const incoming = new URL(request.url);
  const production = process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_APP_ENV !== "development";
  const unsafeHost = isIP(upstream.hostname.replace(/^\[|\]$/g, "")) !== 0 || upstream.hostname === "localhost" || upstream.hostname.endsWith(".local");
  if (!(["http:", "https:"].includes(upstream.protocol)) || upstream.username || upstream.password || upstream.pathname !== "/" || upstream.search || upstream.hash || upstream.hostname !== allowedHost || upstream.origin === incoming.origin || (production && (upstream.protocol !== "https:" || unsafeHost))) {
    return Response.json({ error: { code: "TEMPORARY_UNAVAILABLE", message: "API gateway configuration is invalid." } }, { status: 503 });
  }
  if (!incoming.pathname.startsWith("/api/v1/") || /%2f|%5c/i.test(incoming.pathname)) return new Response(null, { status: 400 });
  const target = new URL(incoming.pathname + incoming.search, upstream.origin);
  if (target.origin !== upstream.origin || !target.pathname.startsWith("/api/v1/")) return new Response(null, { status: 400 });
  const headers = new Headers();
  for (const key of requestHeaders) { const value = request.headers.get(key); if (value) headers.set(key, value); }
  if (production) {
    if (process.env.VERCEL !== "1") return Response.json({ error: { code: "TEMPORARY_UNAVAILABLE", message: "API gateway platform is unavailable." } }, { status: 503 });
    const clientIp = request.headers.get("x-vercel-forwarded-for")?.trim();
    const secret = process.env.AUTH_PROXY_SECRET;
    if (!clientIp || isIP(clientIp) === 0 || !secret || Buffer.byteLength(secret) < 32) return Response.json({ error: { code: "TEMPORARY_UNAVAILABLE", message: "API gateway identity is unavailable." } }, { status: 503 });
    const timestamp = Math.floor(Date.now() / 1000).toString();
    headers.set("X-EB-Client-IP", clientIp);
    headers.set("X-EB-Proxy-Time", timestamp);
    headers.set("X-EB-Proxy-Signature", createHmac("sha256", secret).update(`${timestamp}.${clientIp}.${request.method}.${incoming.pathname}`).digest("hex"));
  }
  try {
    const response = await fetch(target, { method: request.method, headers, body: ["GET", "HEAD"].includes(request.method) ? undefined : await request.arrayBuffer(), redirect: "manual", cache: "no-store" });
    if (response.status >= 300 && response.status < 400) return Response.json({ error: { code: "TEMPORARY_UNAVAILABLE", message: "API returned an unexpected redirect." } }, { status: 502 });
    const output = new Headers();
    for (const key of responseHeaders) { const value = response.headers.get(key); if (value) output.set(key, value); }
    for (const cookie of response.headers.getSetCookie()) output.append("set-cookie", cookie);
    return new Response(response.body, { status: response.status, headers: output });
  } catch {
    return Response.json({ error: { code: "TEMPORARY_UNAVAILABLE", message: "API is unavailable." } }, { status: 503 });
  }
}

export const GET = forward;
export const POST = forward;
export const PUT = forward;
export const PATCH = forward;
export const DELETE = forward;
