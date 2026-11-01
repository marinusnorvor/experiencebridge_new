import test from "node:test";
import assert from "node:assert/strict";
import { createDemoState } from "../data/portal-fixtures.ts";
import "./register-typescript.mjs";
const { reviewSubmission, demoActor } = await import("../lib/demo-transitions.ts");
const context = { actor: demoActor, revision: 0, id: "review-test", at: "2026-10-31T12:00:00Z" };
test("acceptance requires every criterion on the latest version and preserves independent assessment", () => {
  const state = createDemoState();
  const act = (version, criteria) => reviewSubmission(state, context, "review-wireframes", version, "Accepted", criteria, "All sample journeys and labels are evidenced.");
  assert.throws(() => act(1, [true, true]), /latest/);
  assert.throws(() => act(2, [true, false]), /every criterion/);
  assert.throws(() => act(2, [true]), /every original/);
  const next = act(2, [true, true]);
  assert.equal(next.submissions[0].status, "Accepted");
  assert.deepEqual(next.submissions[0].versions, state.submissions[0].versions);
  assert.equal(next.submissions[0].sharedMentorNote, state.submissions[0].sharedMentorNote);
  assert.deepEqual(next.projects, state.projects);
  assert.equal(next.submissions[0].reviews[0].actor, demoActor);
  assert.throws(() => reviewSubmission(next, { ...context, revision: 1, id: "again" }, "review-wireframes", 2, "Changes requested", [false, false], "Changed my mind."), /already recorded/);
});
test("revision needs actionable rationale; unauthorized and stale decisions fail", () => {
  const state = createDemoState();
  const act = (ctx, reason) => reviewSubmission(state, ctx, "review-wireframes", 2, "Changes requested", [true, false], reason);
  assert.throws(() => act(context, ""), /Explain/);
  assert.throws(() => act({ ...context, actor: "Student" }, "Add visible field labels."), /manager/);
  assert.throws(() => act({ ...context, revision: 3 }, "Add visible field labels."), /changed/);
  assert.equal(act(context, "Add visible field labels.").submissions[0].status, "Changes requested");
});
test("review queue, exact versioned submission and missing-state routes render", { skip: !process.env.PORTAL_TEST_URL }, async () => {
  for (const query of ["", "?submission=review-wireframes", "?submission=missing"]) {
    const response = await fetch(`${process.env.PORTAL_TEST_URL}/organization/reviews${query}`);
    const html = await response.text(); assert.equal(response.status, 200);
    assert.match(html, query.includes("missing") ? /Submission unavailable/ : /SYNTHETIC EVIDENCE v2/);
  }
});
