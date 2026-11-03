import assert from "node:assert/strict";
import test from "node:test";
import { getClerkPublishableKey } from "../lib/auth/clerk-config.ts";
import { getPublicApiBaseUrl } from "../lib/api/base-url.ts";
import { isPortalPresentationMode } from "../lib/auth/portal-presentation.ts";

const keys = ["NODE_ENV", "NEXT_PUBLIC_APP_ENV", "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "NEXT_PUBLIC_API_BASE_URL", "NEXT_PUBLIC_PORTAL_PREVIEW"];
function configure(t, values) {
  const saved = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  for (const key of keys) delete process.env[key];
  Object.assign(process.env, values);
  t.after(() => { for (const key of keys) { if (saved[key] === undefined) delete process.env[key]; else process.env[key] = saved[key]; } });
}

test("production never substitutes a fallback Clerk key", t => {
  configure(t, { NODE_ENV: "production" });
  assert.throws(getClerkPublishableKey, /required/);
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = "pk_test_synthetic";
  assert.throws(getClerkPublishableKey, /live key/);
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = "pk_live_invalid";
  assert.throws(getClerkPublishableKey, /valid Clerk domain/);
});

test("a local production-profile process uses live keys, HTTPS and no preview", t => {
  const key = `pk_live_${Buffer.from("clerk.example.com$").toString("base64")}`;
  configure(t, { NODE_ENV: "development", NEXT_PUBLIC_APP_ENV: "production", NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: key,
    NEXT_PUBLIC_API_BASE_URL: "https://api.example.com", NEXT_PUBLIC_PORTAL_PREVIEW: "true" });
  assert.equal(getClerkPublishableKey(), key);
  assert.equal(getPublicApiBaseUrl(), "https://api.example.com");
  assert.equal(isPortalPresentationMode(), false);
});

test("production rejects insecure or credential-bearing API origins", t => {
  configure(t, { NODE_ENV: "production", NEXT_PUBLIC_APP_ENV: "production" });
  for (const url of ["http://api.example.com", "http://localhost:8000", "https://user:private@api.example.com", "https://api.example.com/v1", "https://api.example.com?token=private"]) {
    process.env.NEXT_PUBLIC_API_BASE_URL = url;
    assert.throws(getPublicApiBaseUrl);
  }
});

test("explicit isolated development still accepts local API and test identity", t => {
  configure(t, { NODE_ENV: "production", NEXT_PUBLIC_APP_ENV: "development", NEXT_PUBLIC_API_BASE_URL: "http://127.0.0.1:8000", NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_synthetic", NEXT_PUBLIC_PORTAL_PREVIEW: "true" });
  assert.equal(getPublicApiBaseUrl(), "http://127.0.0.1:8000");
  assert.equal(getClerkPublishableKey(), "pk_test_synthetic");
  assert.equal(isPortalPresentationMode(), false, "An optimized build never enables presentation bypass");
});
