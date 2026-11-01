import test from "node:test";
import assert from "node:assert/strict";
import { createDemoState, emptyBrief } from "../data/portal-fixtures.ts";
import { parseSavedBrief, validateBrief } from "../lib/brief-validation.ts";
import "./register-typescript.mjs";
const { demoActor, saveProject } = await import("../lib/demo-transitions.ts");
const context = { actor: demoActor, revision: 0, id: "action-test", at: "2026-10-31T12:00:00Z" };
test("wizard requires a complete, paid brief and sensible capacity and dates", () => {
  assert.ok(Object.keys(validateBrief(emptyBrief)).length > 15);
  const brief = createDemoState().projects[0];
  assert.deepEqual(validateBrief(brief), {});
  const invalid = validateBrief({ ...brief, fee: "0", due: brief.start, seats: 1.5, hours: NaN });
  for (const key of ["fee", "due", "seats", "hours"]) assert.ok(invalid[key]);
  assert.ok(validateBrief({ ...brief, start: "2026-02-31" }).start);
  assert.ok(validateBrief({ ...brief, fee: "9".repeat(400) }).fee);
  assert.equal(parseSavedBrief('{"brief":{}}', emptyBrief), null);
  assert.equal(parseSavedBrief("invalid", emptyBrief), null);
  assert.deepEqual(parseSavedBrief(JSON.stringify({ brief: emptyBrief }), emptyBrief), emptyBrief);
});
test("draft save and submit audit the manager without publishing or enrolling people", () => {
  const original = createDemoState();
  const saved = saveProject(original, context, "draft-test", { ...emptyBrief, title: "A sample draft" }, false);
  assert.equal(saved.projects[0].status, "Draft");
  assert.equal(original.projects.length + 1, saved.projects.length);
  assert.throws(() => saveProject(original, context, "draft-test", emptyBrief, true));
  const submitted = saveProject(original, context, "submitted-test", original.projects[0], true);
  assert.equal(submitted.projects[0].status, "In review");
  assert.deepEqual(submitted.projects[0].members, []);
  assert.equal(submitted.events[0].actor, demoActor);
  assert.throws(() => saveProject(submitted, { ...context, revision: 1, id: "new-action" }, "submitted-test", original.projects[0], false), /locked/);
  assert.throws(() => saveProject(original, { ...context, actor: "Student" }, "x", original.projects[0], true), /manager/);
  assert.throws(() => saveProject(saved, context, "x", original.projects[0], true), /changed/);
  assert.throws(() => saveProject(saved, { ...context, revision: 1 }, "x", original.projects[0], true), /already/);
});
test("wizard and existing draft routes render", { skip: !process.env.PORTAL_TEST_URL }, async () => {
  for (const path of ["new", "demo-draft/edit"]) {
    const response = await fetch(`${process.env.PORTAL_TEST_URL}/organization/projects/${path}`);
    const html = await response.text();
    assert.equal(response.status, 200);
    assert.match(html, /Step .*?1.*? of 5/);
    assert.match(html, /Save draft/);
    assert.doesNotMatch(html, /class="undefined"/);
  }
});
