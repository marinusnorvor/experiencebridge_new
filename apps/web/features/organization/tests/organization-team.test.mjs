import test from "node:test";
import assert from "node:assert/strict";
import { createDemoState } from "../data/portal-fixtures.ts";
import "./register-typescript.mjs";
const { inviteMentor, demoActor } = await import("../lib/demo-transitions.ts");
const context = { actor: demoActor, revision: 0, id: "invite-test", at: "2026-10-31T12:00:00Z" };
test("mentor invitation is pending, scoped and attributed; it never grants assignment", () => {
  const state = createDemoState();
  const next = inviteMentor(state, context, "demo-library", "mentor-c", "One hour weekly for three weeks.");
  assert.equal(next.invitations.at(-1).status, "Pending");
  assert.equal(next.invitations.at(-1).projectId, "demo-library");
  assert.deepEqual(next.projects, state.projects);
  assert.equal(next.events[0].actor, demoActor);
  assert.throws(() => inviteMentor(next, { ...context, revision: 1, id: "again" }, "demo-library", "mentor-c", "One hour weekly."), /already/);
});
test("ineligible mentors, closed or missing projects, wrong actors and stale requests are rejected", () => {
  const state = createDemoState();
  for (const [project, mentor] of [["demo-library", "mentor-d"], ["demo-closed", "mentor-c"], ["unknown", "mentor-a"], ["demo-health", "mentor-a"]]) assert.throws(() => inviteMentor(state, context, project, mentor, "One hour weekly."));
  assert.throws(() => inviteMentor(state, { ...context, actor: "Mentor" }, "demo-library", "mentor-c", "One hour weekly."), /manager/);
  assert.throws(() => inviteMentor(state, { ...context, revision: 1 }, "demo-library", "mentor-c", "One hour weekly."), /changed/);
});
test("team route exposes accepted assignments separately from pending invitations", { skip: !process.env.PORTAL_TEST_URL }, async () => {
  const response = await fetch(`${process.env.PORTAL_TEST_URL}/organization/projects/demo-health/team`);
  const html = await response.text(); assert.equal(response.status, 200);
  assert.match(html, /Confirmed sample team/); assert.match(html, /Demo Student A/); assert.match(html, /Awaiting|Accepted/);
});
