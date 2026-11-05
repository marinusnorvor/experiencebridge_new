import test from "node:test";
import assert from "node:assert/strict";
import { authClient, bootstrapCsrf, clearCsrf } from "../lib/auth/client.ts";

test("shared client bootstraps CSRF, uses credentials and documented field names", async () => {
  const oldFetch = globalThis.fetch;
  const calls = [];
  clearCsrf();
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init });
    if (url === "/api/v1/auth/csrf") return Response.json({ csrf_token: "synthetic-csrf" });
    return Response.json({ message: "If eligible, check your email for next steps." }, { status: 202 });
  };
  try {
    await authClient.register("synthetic@example.invalid", "synthetic password", "Synthetic User");
    assert.equal(calls.length, 2);
    assert.equal(calls[1].url, "/api/v1/auth/register");
    assert.equal(calls[1].init.credentials, "include");
    assert.equal(calls[1].init.headers["X-CSRF-Token"], "synthetic-csrf");
    assert.deepEqual(JSON.parse(calls[1].init.body), { email: "synthetic@example.invalid", password: "synthetic password", display_name: "Synthetic User" });
  } finally { globalThis.fetch = oldFetch; clearCsrf(); }
});

test("invalidating an in-flight CSRF bootstrap fetches a fresh context", async () => {
  const oldFetch = globalThis.fetch;
  let release;
  let calls = 0;
  clearCsrf();
  globalThis.fetch = async () => {
    calls += 1;
    if (calls === 1) return await new Promise(resolve => { release = () => resolve(Response.json({ csrf_token: "old-context" })); });
    return Response.json({ csrf_token: "new-context" });
  };
  try {
    const pending = bootstrapCsrf();
    clearCsrf();
    release();
    assert.equal(await pending, "new-context");
    assert.equal(await bootstrapCsrf(), "new-context");
    assert.equal(calls, 2);
  } finally { globalThis.fetch = oldFetch; clearCsrf(); }
});
