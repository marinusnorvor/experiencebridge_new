import assert from "node:assert/strict";
import { test } from "node:test";
import { isPortalPresentationMode } from "../lib/auth/portal-presentation.ts";

test("anonymous presentation is limited to local development", (t) => {
  const keys = ["NODE_ENV", "NEXT_PUBLIC_APP_ENV", "VERCEL", "NEXT_PUBLIC_PORTAL_PREVIEW"];
  const original = keys.map((key) => process.env[key]);
  function setEnvironment(values) {
    keys.forEach((key, index) => {
      if (values[index] === undefined) delete process.env[key];
      else process.env[key] = values[index];
    });
  }
  t.after(() => setEnvironment(original));
  setEnvironment(["development", undefined, undefined, undefined]);
  assert.equal(isPortalPresentationMode(), false, "Live authentication is the default even locally");
  const cases = [
    ["development", undefined, undefined, true],
    ["development", "development", undefined, true],
    ["production", "development", undefined, false],
    ["production", "production", undefined, false],
    ["development", "staging", undefined, false],
    ["development", "production", undefined, false],
    ["development", "development", "1", false],
    ["development", "unexpected", undefined, false],
    ["test", undefined, undefined, false],
  ];
  for (const [nodeEnv, appEnv, vercel, expected] of cases) {
    setEnvironment([nodeEnv, appEnv, vercel, "true"]);
    assert.equal(isPortalPresentationMode(), expected, JSON.stringify({ nodeEnv, appEnv, vercel }));
  }
});
