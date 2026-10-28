import assert from "node:assert/strict";
import { test } from "node:test";
import { portalLinks } from "../lib/portal-routes.ts";

const baseUrl = process.env.PORTAL_TEST_URL;

test("anonymous portal route smoke checks", { skip: !baseUrl }, async (t) => {
  const routes = ["/", ...portalLinks.map((portal) => portal.href)];
  for (const path of routes) {
    await t.test(path, async () => {
      const response = await fetch(new URL(path, baseUrl), { redirect: "manual" });
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("location"), null);
      const html = (await response.text()).replace(/<!--[\s\S]*?-->/g, "");
      assert.match(html, /<main[\s>]/, "Route should render its page content");
      assert.ok(!html.includes('src="https://clerk.'), "Portal should not load Clerk SDK");
      assert.ok(!html.includes('href="/demo/'), "Obsolete demo navigation");
      assert.ok(!html.includes('"digest":"'), "Server render error");
      if (path === "/") {
        for (const portal of portalLinks) {
          assert.ok(html.includes(`href="${portal.href}"`), `Missing ${portal.label} route`);
        }
      }
    });
  }
});
