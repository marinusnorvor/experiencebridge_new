import test from "node:test";
import assert from "node:assert/strict";
import { createDemoState } from "../data/portal-fixtures.ts";
import "./register-typescript.mjs";
const { updateMilestone, postProjectText, closeProject, demoActor } = await import("../lib/demo-transitions.ts");
const context = { actor: demoActor, revision: 0, id: "workspace-test", at: "2026-10-31T12:00:00Z" };
test("progress is project-scoped and does not accept deliverables or complete projects", () => {
  const state = createDemoState();
  const next = updateMilestone(state, context, "demo-health", "demo-health-prototype", true, "");
  assert.equal(next.projects[0].milestones[1].done, true);
  assert.equal(next.projects[0].status, "Active");
  assert.deepEqual(next.submissions, state.submissions);
  assert.throws(() => updateMilestone(state, context, "demo-market", "demo-health-prototype", true, ""));
  assert.throws(() => updateMilestone(state, context, "demo-health", "demo-health-prototype", true, "Waiting for input"), /blocker/);
});
test("project messages and updates are isolated, bounded, attributed and read-only after closure", () => {
  const state = createDemoState();
  const next = postProjectText(state, context, "demo-health", "A useful sample reply", "message");
  assert.equal(next.messages.at(-1).projectId, "demo-health");
  assert.equal(next.messages.at(-1).author, demoActor);
  assert.equal(next.messages.filter((item) => item.projectId === "demo-market").length, 1);
  assert.throws(() => postProjectText(state, context, "demo-closed", "Reply", "message"), /read-only/);
  assert.throws(() => postProjectText(state, context, "unknown", "Reply", "message"));
  assert.throws(() => postProjectText(state, { ...context, actor: "Student" }, "demo-health", "Reply", "message"), /manager/);
  assert.throws(() => postProjectText(state, context, "demo-health", " ", "update"));
  assert.throws(() => postProjectText(next, context, "demo-health", "Reply", "message"), /changed/);
});
test("archive preserves records and is limited to completed samples", () => {
  const state = createDemoState();
  assert.throws(() => closeProject(state, context, "demo-health", "All sample work reviewed."), /already-completed/);
  const next = closeProject(state, context, "demo-completed", "Archive this completed sample.");
  assert.equal(next.projects.find((item) => item.id === "demo-completed").status, "Closed");
  assert.deepEqual(next.submissions, state.submissions);
  assert.throws(() => closeProject(next, { ...context, revision: 1, id: "again" }, "demo-completed", "Archive again."));
});
test("all six workspace sections and missing project recovery render", { skip: !process.env.PORTAL_TEST_URL }, async () => {
  for (const tab of ["overview", "team", "milestones", "updates", "deliverables", "discussion"]) {
    const response = await fetch(`${process.env.PORTAL_TEST_URL}/organization/projects/demo-health/workspace?tab=${tab}`);
    const html = await response.text(); assert.equal(response.status, 200); assert.match(html, /Project workspace sections/); assert.doesNotMatch(html, /class="undefined"/);
  }
  const html = await (await fetch(`${process.env.PORTAL_TEST_URL}/organization/projects/missing/workspace`)).text();
  assert.match(html, /Workspace unavailable/);
});
