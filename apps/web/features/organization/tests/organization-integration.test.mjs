import test from "node:test";
import assert from "node:assert/strict";
import { createDemoState } from "../data/portal-fixtures.ts";
import { portalDashboard } from "../lib/portal-dashboard.ts";
import { getDashboardMetrics, selectDashboardRecords } from "../lib/dashboard-selectors.ts";
import "./register-typescript.mjs";
const { decideApplication, reviewSubmission, demoActor } = await import("../lib/demo-transitions.ts");
test("dashboard counts and attention follow applicant and deliverable decisions", () => {
  const state = createDemoState();
  const context = { actor: demoActor, revision: 0, id: "offer", at: "2026-10-31T12:00:00Z" };
  const offered = decideApplication(state, context, "application-a", "Offered", "Suitable sample evidence.", "2026-11-07");
  const reviewed = reviewSubmission(offered, { ...context, revision: 1, id: "review" }, "review-wireframes", 2, "Accepted", [true, true], "All sample criteria are demonstrated.");
  const snapshot = portalDashboard(reviewed);
  assert.equal(getDashboardMetrics(snapshot).find((item) => item.id === "applications").value, 4);
  assert.equal(getDashboardMetrics(snapshot).find((item) => item.id === "reviews").value, 0);
  assert.equal(selectDashboardRecords(snapshot, "reviews").length, 0);
  assert.ok(!snapshot.attention.some((item) => item.recordId === "review-wireframes"));
  assert.equal(snapshot.activity[0].href, "/organization/reviews?submission=review-wireframes");
  assert.ok(snapshot.attention.every((item) => snapshot.records.some((record) => record.id === item.recordId)));
});
test("feature routes recover from missing addresses and expose real loading/error previews", { skip: !process.env.PORTAL_TEST_URL }, async () => {
  for (const [path, marker] of [["unknown", "Page unavailable"], ["projects?sample=loading", "Loading your workspace"], ["projects?sample=error", "workspace couldn’t load"]]) {
    const response = await fetch(`${process.env.PORTAL_TEST_URL}/organization/${path}`);
    const html = await response.text(); assert.equal(response.status, 200); assert.ok(html.includes(marker), path); assert.ok(!html.includes('"digest":"'));
  }
});
test("new screen CSS Modules have real matching rules alongside Tailwind", { skip: !process.env.PORTAL_TEST_URL }, async () => {
  for (const path of ["projects", "projects/new", "applications", "reviews", "messages", "settings"]) {
    const html = await (await fetch(`${process.env.PORTAL_TEST_URL}/organization/${path}`)).text();
    const links = [...html.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g)].map((match) => match[1]);
    const css = (await Promise.all(links.map(async (href) => { const response = await fetch(new URL(href.replaceAll("&amp;", "&"), process.env.PORTAL_TEST_URL)); assert.equal(response.status, 200); return response.text(); }))).join("\n");
    const mainClass = [...html.matchAll(/<main class="([^"]+)"/g)].map((match) => match[1]).find((name) => name.includes("portal-module"));
    assert.ok(mainClass, path); assert.ok(css.includes(`.${mainClass}`), `${path}: missing main CSS`);
    assert.doesNotMatch(html, /class="[^"]*\bundefined\b/); assert.match(css, /prefers-reduced-motion/);
  }
});
