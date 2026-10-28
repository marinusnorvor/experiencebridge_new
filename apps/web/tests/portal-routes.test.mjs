import assert from "node:assert/strict";
import { test } from "node:test";
import { portalLinks } from "../lib/portal-routes.ts";

const baseUrl = process.env.PORTAL_TEST_URL;

test("anonymous portal route smoke checks", { skip: !baseUrl }, async (t) => {
  const routes = [
    ["/", "Open Student Portal"],
    [portalLinks[0].href, "Student Portal"],
    [portalLinks[1].href, "Assignment proposals"],
    [portalLinks[2].href, "Organization dashboard"],
    [portalLinks[3].href, "Admin dashboard"],
    ["/student/profile", "Experience Passport"],
    ["/student/applications", "Applications"],
    ["/student/projects", "Projects"],
    ["/student/applications/app-101", "Application"],
    ["/student/projects/part-healthnet-01", "Community Health Tracker"],
    ["/student/applications/does-not-exist", "Application Not Found"],
    ["/student/projects/does-not-exist", "Workspace not available"],
    ["/mentor/assignments/sample-proposal-1", "Community information site"],
    ["/mentor/participations/sample-participation-1", "Mobile-friendly resource guide"],
    ["/mentor/assignments/does-not-exist", "Assignment proposal not found"],
    ["/mentor/participations/does-not-exist", "Participation not found"],
  ];
  for (const [path, content] of routes) {
    await t.test(path, async () => {
      const response = await fetch(new URL(path, baseUrl), { redirect: "manual" });
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("location"), null);
      const html = (await response.text()).replace(/<!--[\s\S]*?-->/g, "");
      assert.ok(html.toLowerCase().includes(content.toLowerCase()), `Missing ${content}`);
      assert.ok(!html.includes('src="https://clerk.'), "Portal should not load Clerk SDK");
      assert.ok(!html.includes('href="/demo/'), "Obsolete demo navigation");
      assert.ok(!html.includes('"digest":"'), "Server render error");
    });
  }
});
