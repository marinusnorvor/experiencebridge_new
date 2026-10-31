import assert from "node:assert/strict";
import { test } from "node:test";

const baseUrl = process.env.PORTAL_TEST_URL;

test("organization CSS Module bindings have matching, successfully served stylesheet rules", { skip: !baseUrl }, async () => {
  const response = await fetch(new URL("/organization/dashboard", baseUrl));
  assert.equal(response.status, 200);
  const html = await response.text();
  const styleLinks = [...html.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g)].map((match) => match[1]);
  assert.ok(styleLinks.length, "Page must link stylesheets");
  const sheets = await Promise.all(styleLinks.map(async (path) => {
    const sheet = await fetch(new URL(path.replaceAll("&amp;", "&"), baseUrl));
    assert.equal(sheet.status, 200, `Stylesheet ${path}`);
    assert.match(sheet.headers.get("content-type") ?? "", /text\/css/, path);
    return sheet.text();
  }));
  const css = sheets.join("\n");

  for (const [name, marker] of [
    ["sidebar", /<aside\b[^>]*aria-label="Organization portal sidebar"[^>]*>/],
    ["dashboard", /<main\b[^>]*aria-labelledby="org-dashboard-title"[^>]*>/],
    ["metrics", /<section\b[^>]*aria-label="Overview Metrics"[^>]*>/],
    ["attention", /<section\b[^>]*aria-labelledby="attention-heading"[^>]*>/],
    ["mobile drawer", /<dialog\b[^>]*id="organization-navigation-drawer"[^>]*>/],
  ]) {
    const element = html.match(marker)?.[0];
    assert.ok(element, `${name} element must render`);
    const classNames = element.match(/class="([^"]+)"/)?.[1];
    assert.ok(classNames, `${name} is missing its CSS Module class binding`);
    assert.ok(!classNames.includes("undefined"), `${name} has an undefined CSS Module export`);
    for (const className of classNames.split(/\s+/)) {
      assert.ok(css.includes(`.${className}`), `${name}: stylesheet must contain selector for ${className}`);
    }
  }

  assert.ok(!/class="[^"]*\bundefined\b/.test(html), "No undefined classes in rendered HTML");
  // Both modules use .eyebrow/.avatar/.dialog; they must remain locally scoped.
  assert.ok(!/(?:^|\n)\.(?:shell|dashboard|eyebrow|dialog)\s*\{/.test(css), "CSS Module selectors must not be emitted globally");
  assert.match(css, /grid-template-columns:/, "Dashboard grid rules are emitted");
  assert.match(css, /prefers-reduced-motion/, "Reduced-motion rules are emitted");
  assert.match(css, /\.flex\s*\{[^}]*display:\s*flex/, "Global Tailwind utilities remain available");
});
