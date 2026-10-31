import assert from "node:assert/strict";
import { test } from "node:test";
import { createDemoState } from "../data/portal-fixtures.ts";
import { selectProjects } from "../lib/project-selectors.ts";

test("project list searches skills, filters every state and orders deadlines", () => {
  const { projects } = createDemoState();
  assert.equal(selectProjects(projects, "", "All", "deadline").length, 8);
  assert.equal(selectProjects(projects, "", "Active", "deadline").length, 2);
  assert.equal(selectProjects(projects, "  REACT ", "Active", "name")[0].id, "demo-health");
  assert.deepEqual(selectProjects(projects, "no-match", "All", "name"), []);
  assert.deepEqual(selectProjects(projects, "", "unknown-status", "name"), []);
  const names = selectProjects(projects, "", "All", "name").map((p) => p.title);
  assert.deepEqual(names, [...names].sort((a, b) => a.localeCompare(b)));
});

test("project list/detail routes render and unknown projects recover", { skip: !process.env.PORTAL_TEST_URL }, async () => {
  for (const [path, expected] of [["projects", "Your projects"], ["projects/demo-health", "The challenge"], ["projects/missing", "Project unavailable"]]) {
    const response = await fetch(`${process.env.PORTAL_TEST_URL}/organization/${path}`);
    const html = await response.text();
    assert.equal(response.status, 200);
    assert.ok(html.includes(expected), path);
    assert.ok(!/class="[^"]*\bundefined\b/.test(html));
    assert.ok(!html.includes('"digest":"'));
  }
});
