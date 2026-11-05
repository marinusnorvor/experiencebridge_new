import assert from "node:assert/strict";
import test from "node:test";
import { isPortalPresentationMode } from "../lib/auth/portal-presentation.ts";
import { GET } from "../app/api/v1/[...path]/route.ts";

test("production refuses an unconfigured API gateway", async t => {
  const keys = ["NODE_ENV", "NEXT_PUBLIC_APP_ENV", "API_UPSTREAM_ORIGIN", "API_UPSTREAM_ALLOWED_HOST"];
  const saved = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  process.env.NODE_ENV = "production"; process.env.NEXT_PUBLIC_APP_ENV = "production";
  delete process.env.API_UPSTREAM_ORIGIN; delete process.env.API_UPSTREAM_ALLOWED_HOST;
  t.after(() => { for (const key of keys) { if (saved[key] === undefined) delete process.env[key]; else process.env[key] = saved[key]; } });
  assert.equal(isPortalPresentationMode(), false);
  assert.equal((await GET(new Request("https://app.example.invalid/api/v1/me"))).status, 503);
});
