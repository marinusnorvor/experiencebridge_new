# Organization Portal CSS rendering diagnosis

## Confirmed failure before the fix

The local dashboard returns HTTP 200. Both linked CSS files return HTTP 200 with
`text/css; charset=UTF-8`: the global stylesheet and the organization stylesheet.
The global file contains compiled Tailwind utilities.

The actual rendered HTML has no CSS Module class on the organization sidebar,
dashboard, metric strip or sections. Composite classes render as
`class="undefined undefined"`. The emitted stylesheet identifies source files as
`organization-shell.module.css.css` and `dashboard.module.css.css`, with global
selectors such as `.shell` and `.dashboard` instead of scoped module selectors.

`apps/web/next.config.ts` applies the Tailwind Turbopack loader to `*.css` and uses
`as: "*.css"`. This also matches CSS Modules, reclassifying the loader output as
ordinary CSS and losing their imported class maps. The component imports and
source selectors match; stylesheet delivery works. The failure is in compilation
classification, not a missing import, a 404, or absent Tailwind utility generation.

The new regression test fails before the fix with:

```text
sidebar is missing its CSS Module class binding
```

It fetches the rendered HTML and linked stylesheets, verifies CSS MIME/status,
checks component class bindings against actual emitted selectors, rejects
`undefined` classes and unscoped module selectors, and checks that grid,
reduced-motion and global Tailwind utility rules remain present.

## Applied minimal fix — explicitly approved

The user explicitly approved the narrow shared configuration change. Added this
condition to the existing CSS loader rule in `apps/web/next.config.ts`:

```ts
"*.css": {
  condition: { not: { path: "*.module.css" } },
  loaders: [tailwindTurbopackLoader],
  as: "*.css",
},
```

This retains Tailwind processing for ordinary CSS and lets Next.js process these
plain CSS Modules natively. No component redesign, dependencies, global stylesheet
edits, synthetic-data changes or teammate portal changes are needed.

## Confirmed result and validation

- Before fix: CSS/HTML regression FAIL (expected reproduction).
- After fix: CSS/HTML regression PASS. Sidebar HTML now contains
  `organization-shell-module__K0n2bW__sidebar`; dashboard and metric strip contain
  `dashboard-module__bh2PeG__dashboard` and `dashboard-module__bh2PeG__metrics`.
  These exact selectors exist in the linked organization stylesheet.
- Both stylesheets return HTTP 200 and CSS MIME type. Global Tailwind utilities
  remain present; global stylesheet length is unchanged at 71,628 characters.
  Organization CSS now contains scoped selectors (21,823 characters rather than
  16,810 unscoped characters in this development session).
- The existing dev server picked up the config change automatically. No cache
  purge, component rewrite, second server or dependency change was needed.
- Full frontend lint, typecheck, production build: PASS.
- All 11 Node tests: PASS, no failures or skips, including live route/CSS checks.
- Browser visual/interaction QA: pending. Browser access host unavailable.
- Available dev log: React DevTools informational entries, no browser CSS error.
  This is not a live browser console/network/computed-style inspection.

Run the regression from the repository root while the dev server is running:

```bash
PORTAL_TEST_URL=http://localhost:3002 node --test apps/web/features/organization/tests/organization-styling.test.mjs
```

Full validation commands (repository root):

```bash
npm run lint --workspace apps/web
npm run typecheck --workspace apps/web
npm run build --workspace apps/web
PORTAL_TEST_URL=http://localhost:3002 node --test apps/web/features/organization/tests/*.test.mjs apps/web/tests/portal-presentation.test.mjs
git diff --check
```

The agent used `npm.cmd` in PowerShell; `npm` above is appropriate for Git Bash.

## Files changed in this repair

- `apps/web/next.config.ts` — approved one-line CSS Module exclusion.
- `apps/web/features/organization/tests/organization-styling.test.mjs` — regression
  linking rendered class bindings to successfully served CSS.
- `apps/web/features/organization/UI_RENDERING_FIX.md` — evidence and handoff.
- `apps/web/features/organization/README.md` — corrective follow-up notice.

No Student, Mentor, Admin, authentication, backend, global CSS or synthetic-data
changes. Existing work and the already-staged unrelated ADR were preserved.

## Manual visual verification still required

Refresh `http://localhost:3002/organization/dashboard`. Check 375, 768, 1280 and
1440px; sidebar/header/grid; typography; card/button styling; mobile drawer;
keyboard focus; filters/dialogs; hover and reduced motion. HTML/CSS checks do not
substitute for screenshots or computed styles. O02 visual acceptance stays pending.

Suggested commit: `fix(organization): restore CSS module styling`

Commit just this repair from the repository root in Git Bash, excluding the
unrelated staged ADR (existing foundation/dashboard work remains separate):

```bash
paths=(apps/web/next.config.ts apps/web/features/organization/tests/organization-styling.test.mjs apps/web/features/organization/UI_RENDERING_FIX.md apps/web/features/organization/README.md)
git status --short
git add -- "${paths[@]}"
git diff --cached --check
git diff --cached -- "${paths[@]}"
git commit --only -m "fix(organization): restore CSS module styling" -- "${paths[@]}"
git push origin lib
```

No commit or push performed. The user's existing development server was retained.
