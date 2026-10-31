import test from "node:test";
import assert from "node:assert/strict";
import { createDemoState } from "../data/portal-fixtures.ts";
import "./register-typescript.mjs";
const { decideApplication, demoActor } = await import("../lib/demo-transitions.ts");
const context = { actor: demoActor, revision: 0, id: "decision", at: "2026-10-31T12:00:00Z" };
test("offers reserve capacity without creating membership and preserve decision attribution", () => {
  const original = createDemoState();
  const offered = decideApplication(original, context, "application-a", "Offered", "Suitable sample research evidence.", "2026-11-07");
  assert.equal(offered.applications[0].status, "Offered");
  assert.deepEqual(offered.projects, original.projects);
  assert.equal(offered.events[0].actor, demoActor);
  assert.match(offered.events[0].href, /application=application-a/);
  assert.throws(() => decideApplication(offered, { ...context, revision: 1, id: "second" }, "application-a", "Offered", "Relevant evidence", "2026-11-07"), /no longer/);
  const full = { ...original, projects: original.projects.map((project) => project.id === "demo-library" ? { ...project, seats: 0 } : project) };
  assert.throws(() => decideApplication(full, context, "application-b", "Offered", "Relevant evidence", "2026-11-07"), /places/);
});
test("application decisions reject wrong actor, stale state, changed terms, invalid dates and empty reasons", () => {
  const state = createDemoState();
  const act = (source = state, ctx = context, reason = "Relevant evidence", expiry = "2026-11-07") => decideApplication(source, ctx, "application-a", "Offered", reason, expiry);
  assert.throws(() => act(state, { ...context, actor: "Student" }), /manager/);
  assert.throws(() => act(state, { ...context, revision: 2 }), /changed/);
  assert.throws(() => act(state, context, ""), /reason/);
  assert.throws(() => act(state, context, "Relevant evidence", "2026-10-30"), /expiry/);
  state.applications[0].termsVersion = 0;
  assert.throws(() => act(), /terms/);
});
test("application list and exact applicant deep link render", { skip: !process.env.PORTAL_TEST_URL }, async () => {
  for (const suffix of ["", "?application=application-a"]) {
    const response = await fetch(`${process.env.PORTAL_TEST_URL}/organization/applications${suffix}`);
    const html = await response.text(); assert.equal(response.status, 200);
    assert.match(html, /People with potential/); assert.match(html, /Demo Applicant A/);
  }
});
