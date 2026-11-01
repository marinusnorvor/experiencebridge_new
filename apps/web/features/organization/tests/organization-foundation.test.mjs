import assert from "node:assert/strict";
import { test } from "node:test";
import { getActiveOrganizationNavItem, getNavItemByPath } from "../lib/organization-routes.ts";
import { syntheticOrganizationData } from "../data/synthetic-organization-data.ts";

test("navigation follows nested project routes without confusing create and list", () => {
  for (const [path, expected] of [
    ["/organization", "dashboard"],
    ["/organization/dashboard/", "dashboard"],
    ["/organization/projects", "projects"],
    ["/organization/projects/example/workspace", "projects"],
    ["/organization/projects/new", "create-project"],
    ["/organization/projects/new/", "create-project"],
    ["/organization/projects-other", undefined],
    ["/student/dashboard", undefined],
  ]) assert.equal(getActiveOrganizationNavItem(path)?.id, expected, path);
  assert.equal(getNavItemByPath("/organization/reviews/")?.id, "reviews");
});

test("organization fixture never claims real verification", () => {
  assert.equal(syntheticOrganizationData.isSynthetic, true);
  assert.match(syntheticOrganizationData.organizationName, /^DEMO /);
  assert.equal(syntheticOrganizationData.verificationLabel, "Not independently verified");
});

test("local organization routes render their shell and disclose synthetic content", { skip: !process.env.PORTAL_TEST_URL }, async () => {
  for (const path of ["dashboard", "projects", "projects/new", "applications", "reviews", "messages", "settings"]) {
    const response = await fetch(`${process.env.PORTAL_TEST_URL}/organization/${path}`);
    assert.equal(response.status, 200, path);
    const html = (await response.text()).replace(/<!--[\s\S]*?-->/g, "");
    assert.match(html, /DEMO Acme Technologies/);
    assert.match(html, /Not independently verified/);
    assert.match(html, /Skip to organization content/);
    assert.ok(!html.includes('"digest":"'), "No server rendering error");
    assert.ok(!html.includes('src="https://clerk.'), "No Clerk SDK in local presentation");
    if (path === "dashboard") assert.match(html, /Overview Metrics/);
  }
});
