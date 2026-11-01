import assert from "node:assert/strict";
import { test } from "node:test";
import { syntheticDashboard as snapshot } from "../data/synthetic-dashboard.ts";
import { dashboardHref, formatDashboardDate, getDashboardMetrics, parseDashboardView, selectAttention, selectDashboardRecords } from "../lib/dashboard-selectors.ts";

test("each metric equals its underlying collection, excluding overdue deadlines", () => {
  const metrics = getDashboardMetrics(snapshot);
  assert.deepEqual(metrics.map((metric) => metric.value), [2, 5, 1, 3]);
  for (const metric of metrics) {
    const records = metric.id === "projects" ? snapshot.projects.filter((project) => project.state === "Active") : selectDashboardRecords(snapshot, metric.id);
    assert.equal(metric.value, records.length, metric.id);
  }
  assert.ok(!selectDashboardRecords(snapshot, "deadlines").some((record) => record.id === "deadline-research"));
  const milestone = snapshot.records.find((record) => record.id === "deadline-prototype");
  const dates = { ...snapshot, records: ["2026-10-30", "2026-10-31", "2026-11-07", "2026-11-08"].map((date) => ({ ...milestone, date })) };
  assert.deepEqual(selectDashboardRecords(dates, "deadlines").map((record) => record.date), ["2026-10-31", "2026-11-07"]);
});

test("attention filters combine category and project without leaking other project records", () => {
  assert.equal(selectAttention(snapshot, "all", "all").length, 4);
  assert.equal(selectAttention(snapshot, "reviews", "demo-health").length, 1);
  assert.equal(selectAttention(snapshot, "reviews", "demo-market").length, 0);
  assert.equal(selectAttention(snapshot, "all", "unknown-project").length, 0);
  assert.deepEqual(selectAttention(snapshot, "all", "all").map((item) => item.priority), ["High", "High", "Normal", "Normal"]);
});

test("search matches names, skills and project titles; unknown views are rejected", () => {
  assert.equal(selectDashboardRecords(snapshot, "applications", "  APPLICANT A  ").length, 1);
  assert.equal(selectDashboardRecords(snapshot, "applications", "library").length, 5);
  assert.equal(selectDashboardRecords(snapshot, "applications", "no match").length, 0);
  assert.equal(parseDashboardView("reviews"), "reviews");
  assert.equal(parseDashboardView("admin"), null);
  assert.equal(parseDashboardView(null), null);
});

test("empty collections and direct record links remain deterministic", () => {
  const empty = { ...snapshot, projects: [], records: [], attention: [], activity: [] };
  assert.deepEqual(getDashboardMetrics(empty).map((item) => item.value), [0, 0, 0, 0]);
  assert.deepEqual(selectAttention(empty, "all", "all"), []);
  assert.equal(dashboardHref("reviews", "version/2 & draft"), "/organization/dashboard?view=reviews&record=version%2F2+%26+draft");
  assert.equal(formatDashboardDate("2026-11-04"), "4 Nov");
});

test("fixture links resolve and progress does not exceed the milestone total", () => {
  for (const project of snapshot.projects) {
    assert.ok(project.completedMilestones <= project.totalMilestones);
    assert.ok(project.members.every((member) => member.startsWith("Demo ")));
  }
  for (const record of snapshot.records) assert.ok(snapshot.projects.some((project) => project.id === record.projectId));
  for (const item of [...snapshot.attention, ...snapshot.activity]) assert.ok(snapshot.records.some((record) => record.id === item.recordId));
});

test("dashboard HTTP response exposes record links and safe QA states", { skip: !process.env.PORTAL_TEST_URL }, async () => {
  const base = `${process.env.PORTAL_TEST_URL}/organization/dashboard`;
  for (const [query, expected] of [
    ["", /Good work starts with a clear view/],
    ["?view=reviews&record=review-wireframes", /dashboard-detail-title/],
    ["?sample=empty", /Your next collaboration belongs here/],
    ["?sample=error", /The overview couldn’t load/],
    ["?sample=loading", /Loading your organization overview/],
    ["?view=reviews&record=missing", /requested record is not in this sample collection/],
    ["?view=admin", /That dashboard view is unavailable/],
  ]) {
    const response = await fetch(base + query);
    assert.equal(response.status, 200, query);
    const html = (await response.text()).replace(/<!--[\s\S]*?-->/g, "");
    assert.match(html, expected, query);
    assert.ok(!html.includes('"digest":"'), query);
  }
});
