import test from "node:test";
import assert from "node:assert/strict";
import { createDemoState } from "../data/portal-fixtures.ts";
import { validateProfile } from "../lib/profile-validation.ts";
import "./register-typescript.mjs";
const { markRead, saveProfile, requestVerification, demoActor } = await import("../lib/demo-transitions.ts");
const context = { actor: demoActor, revision: 0, id: "communications-test", at: "2026-10-31T12:00:00Z" };
test("read actions are scoped and idempotent without deleting history", () => {
  const state = createDemoState();
  const next = markRead(state, context, "messages", "demo-health");
  assert.equal(next.messages[0].read, true); assert.equal(next.messages[1].read, false);
  assert.deepEqual(next.events, state.events);
  assert.strictEqual(markRead(next, { ...context, revision: 1 }, "messages", "demo-health"), next);
  const all = markRead(state, context, "notifications", "all");
  assert.ok(all.events.every((event) => event.read)); assert.equal(all.events.length, state.events.length);
  assert.throws(() => markRead(state, { ...context, actor: "Student" }, "notifications", "all"), /manager/);
});
test("profile stays synthetic, validates contact fields, and cannot self-verify", () => {
  const state = createDemoState();
  assert.deepEqual(validateProfile(state.profile), {});
  for (const patch of [{ name: "Real organization" }, { email: "invalid" }, { website: "javascript:alert(1)" }, { website: "https://secret:password@example.invalid" }]) assert.ok(Object.keys(validateProfile({ ...state.profile, ...patch })).length);
  const saved = saveProfile(state, context, { ...state.profile, name: "DEMO New Company", verification: "Pending demo review" });
  assert.equal(saved.profile.verification, "Not verified");
  const requested = requestVerification(state, context);
  assert.equal(requested.profile.verification, "Pending demo review");
  assert.throws(() => requestVerification(requested, { ...context, revision: 1, id: "again" }), /already pending/);
  assert.throws(() => saveProfile(state, { ...context, actor: "Admin" }, state.profile), /manager/);
});
test("messages, notifications, settings and missing conversation render", { skip: !process.env.PORTAL_TEST_URL }, async () => {
  for (const [path, marker] of [["messages", "Project conversations"], ["messages?project=missing", "Conversation unavailable"], ["notifications", "workspace inbox"], ["settings", "Organization profile"]]) {
    const response = await fetch(`${process.env.PORTAL_TEST_URL}/organization/${path}`);
    const html = await response.text(); assert.equal(response.status, 200); assert.ok(html.includes(marker)); assert.doesNotMatch(html, /class="undefined"/);
  }
});
