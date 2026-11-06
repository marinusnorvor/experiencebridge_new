# ExperienceBridge — Overnight Sprint (overrides the timeline in PRODUCT-PLAN.md)

**Start:** Fri 6 Nov, ~00:15 · **Real users start testing on the live site:** Fri 6 Nov, **11:00 AM**
**XANIX submission closes:** Fri 6 Nov, 6:00 PM

Read `docs/PRODUCT-PLAN.md` first. This file changes **when** things happen and **what's in tonight's
scope**, and adds the design direction. Where they conflict, this file wins.

---

## 1. Working mode tonight

- **Work autonomously.** Don't wait for approval of the gap analysis. Write it in 15 minutes for
  the record, then build. Marinus checks in at the checkpoints in §6.
- **Still ask before:** production database migrations, changing permission logic, deleting a
  teammate's module. If you're blocked waiting for an answer, skip to the next task and come back.
- **One branch:** `feat/overnight-v1`. Commit small and often, with clear messages. Push after every
  completed block so work is never lost.
- **Use subagents in parallel** where areas don't overlap (e.g. marketing pages vs one portal),
  but integrate on the single branch and run the full checks after each merge.
- **Don't merge to `main`.** Marinus merges at the 8:30 AM checkpoint after testing locally.
- **Each block ends green:** backend tests, lint, typecheck, production build. Never leave the branch broken.
- **Log progress** in `docs/BUILD-LOG.md` (what's done, what's left, any blockers), so Marinus
  can catch up in 2 minutes.

---

## 2. Scope tonight

**IN (must work at 11 AM):**
1. Design system and app shell (§4 below).
2. Marketing site: `/` landing page, `/about`, `/how-it-works` (footer links to the rest can be "coming soon" sections on the same pages, not dead routes).
3. Sign-up (with Student / Organisation / Mentor choice), sign-in, forgot/reset, `/app` smart redirect.
4. Onboarding wizards for all three paths.
5. Role-aware navigation, workspace switcher, a proper "no access" page, and the **unlisted admin URL** (PRODUCT-PLAN §6).
6. **All four journeys end to end** (PRODUCT-PLAN §4.1–4.4) on the **existing** endpoints, with status
   badges, timelines and "what happens next" hints.
7. **Action Centre v1** (client-derived from existing list endpoints, PRODUCT-PLAN §4.5).
8. Experience Passport page, designed beautifully (the hero moment of the product).
9. Mobile layout for every screen at 375px.
10. **Feedback button** on every signed-in screen (§5.2). Real-user feedback is our evidence for judging.
11. **Rate-limit fix for a shared network** (§5.1).
12. Playwright happy-path end-to-end test (PRODUCT-PLAN §9) passing locally.

**OUT (after the user test, from Saturday):** notifications table and emails (B2–B3), org-nominated
supervisor backend (B4), public Passport share link (B6), PDF export, command palette, dark mode,
file/logo uploads, `/projects` public listing.

**If time runs short, cut in this order:** onboarding polish → `/how-it-works` → Action Centre
(replace with per-page badges) → mentor portal polish. **Never cut:** sign-up/sign-in, the
org → admin → student → mentor → passport flow, mobile, or the feedback button.

---

## 3. Design inspiration (Framer and skills)

- **Load design skills first.** If the `frontend-design` skill or any UI/design skill is available,
  load and follow it before writing UI. Run a quick design critique and accessibility check on each
  major screen before marking it done.
- **Framer as inspiration, not a source.** Study the patterns that make good Framer SaaS and startup
  templates and Framer component libraries feel premium, and apply them:
  - Oversized hero type with a tight line-height and one short supporting line.
  - A soft gradient or blurred colour glow behind the hero, plus a product visual (a styled
    Experience Passport card built in HTML/CSS).
  - Bento-grid feature sections (cards of different sizes, each with one idea).
  - A "logo strip" style row, but used for **audiences** (Students · Organisations · Mentors ·
    Universities), never fake partner logos.
  - Scroll-reveal fade/slide-up (150–300ms), number counters, hover lift on cards, a sticky
    blurred-glass header.
  - Pill-shaped badges and buttons, generous section padding (96–128px desktop), max width ~1200px.
  - Clean FAQ accordion, a big closing CTA band, a minimal footer.
- **Do not copy** any specific paid Framer template's layout, copy or assets one-to-one. Take the
  patterns, not the template. Similar references: Linear, Vercel, Stripe, Raycast, Mercury.
- If Framer or another site can't be reached from your environment, work from the pattern list above.

---

## 4. Design system: colours and type chosen for what we offer

**The idea behind the palette:** ExperienceBridge turns *real work* into *trusted proof*.
- **Teal = growth and trust** (the bridge, the path forward), the primary action colour.
- **Gold = verified achievement** (a seal on a passport), with a nod to the kente gold of Ghana.
  Used for verified badges, Passport highlights and celebration moments. **Never for plain buttons.**
- **Deep ink navy = credibility** (official documents, passports), used for headings and the hero background option.

### Tokens (CSS variables in `globals.css`, exposed to Tailwind v4 `@theme`)

| Token | Hex | Use |
|---|---|---|
| `--brand-600` (primary) | `#0F766E` | Primary buttons, links, active nav |
| `--brand-700` | `#115E59` | Primary hover/pressed |
| `--brand-50` | `#F0FDFA` | Tinted backgrounds, selected rows |
| `--brand-100` | `#CCFBF1` | Subtle highlights, focus glow |
| `--gold-500` (verified) | `#D97706` | Verified seal icon, Passport accents |
| `--gold-400` | `#F59E0B` | Celebration, highlight strokes |
| `--gold-50` | `#FFFBEB` | Verified badge background |
| `--ink-900` | `#0B1324` | Headings, dark hero sections |
| `--ink-700` | `#334155` | Body text |
| `--ink-500` | `#64748B` | Secondary text |
| `--line` | `#E2E8F0` | Borders, dividers |
| `--surface` | `#FFFFFF` | Cards |
| `--canvas` | `#F8FAFC` | App background |
| `--success` | `#16A34A` | Accepted, completed |
| `--warning` | `#CA8A04` | Pending, under review |
| `--danger` | `#DC2626` | Rejected, destructive |
| `--info` | `#2563EB` | Informational, submitted |

- **Check contrast:** white text on `--brand-600` and body text on `--canvas` must pass WCAG AA.
  Adjust the shade, not the hue, if anything fails.
- **Status colour mapping** (one `StatusBadge` component for every status in the database):
  draft → neutral grey · submitted/pending_review/proposed → info blue · under_review/shortlisted/
  changes_requested/revision_requested → warning · open/active/approved/accepted/verified → brand teal ·
  offered → gold · completed → success green with a check · rejected/declined/withdrawn/cancelled/
  expired/revoked → muted red or grey.
- **Type:** Geist Sans (via `next/font`), with Geist Mono for IDs and dates only if needed.
  Marketing display: 56–72px desktop / 36–40px mobile, weight 600–700, tracking -0.02em.
  App: 14px body / 16px inputs (prevents mobile zoom), 20/24/30px headings.
- **Shape and depth:** radius 12px on cards, 10px on inputs and buttons, full pills on badges. Shadows:
  `sm` for cards, `lg` for popovers and dialogs, plus a soft coloured glow on the hero visual only.
- **Spacing:** 4/8px grid. App content max width 1200px. Cards use 20–24px padding.
- **One light theme for all four portals and the marketing site.** Admin uses denser tables, not a different brand.

### Stack (install once)
shadcn/ui (Radix) · lucide-react · motion (Framer Motion) · @tanstack/react-query ·
react-hook-form + zod · sonner (toasts) · @playwright/test (dev). Configure shadcn to use the tokens above.

### Core components to build first
AppShell (desktop sidebar plus a mobile bottom tab bar) · PageHeader · StatusBadge · StatusTimeline ·
NextStepHint ("Waiting on: Admin review · usually within 24h") · EmptyState (icon, one line, one
action) · Skeleton set · DataTable (search, filter, sort, paginate) · StatCard · FormWizard (steps,
progress, autosave) · ConfirmDialog · WorkspaceSwitcher · ActionCentre (bell plus panel) ·
PassportCard · FeedbackButton.

### Interaction standard
Optimistic updates plus a toast for every action · skeletons on load · prefetch on hover · inline
validation · every error human, with a retry · confirm irreversible actions · `prefers-reduced-motion`
respected · visible focus rings · everything usable at 375px · celebrate milestones (application
sent, offer accepted, Passport entry earned) with a short confetti or seal animation.

---

## 5. Real-user readiness (must be in before 8:30 AM)

### 5.1 Rate limits on a shared network
Testers will share one IP (campus Wi-Fi). In `apps/api/app/identity/auth_router.py` `_limit()`, the
per-IP limits are 20 registrations/hour and 30 logins/15 min. **Ask Marinus before changing this.**
Proposed change: read the per-IP limits from env vars (`AUTH_REGISTER_PER_IP_PER_HOUR`, default 20;
`AUTH_LOGIN_PER_IP_PER_15MIN`, default 30). Marinus sets them to 300/300 in Vercel for the test day.
Keep the per-email limits unchanged. Add a test.

### 5.2 Feedback button
A floating "Give feedback" button on every signed-in page. It opens a small dialog: a 1–5 rating, "What were
you trying to do?", "What went wrong or what would you change?", and an optional email. **Default
implementation with no backend change:** open a prefilled link to a form whose URL Marinus provides
in `NEXT_PUBLIC_FEEDBACK_URL` (Google Form/Tally), passing the page and role as query params. If no URL
is set, hide the button. (A database-backed feedback table can come later.)

### 5.3 Test-day safety
- `seed_demo.py` must **not** run against production unless Marinus asks. Real testers create their own accounts.
- Every empty state must guide a first-time user (e.g. "No open projects yet. Check back soon
  or switch to the Organisation workspace to post one").
- Add Vercel Web Analytics (`@vercel/analytics`, `<Analytics />` in the root layout). It's free and
  shows usage for our evidence.
- Password reset email: if Resend uses `onboarding@resend.dev`, it only delivers to the account owner.
  Note this in the BUILD-LOG so Marinus can reset passwords manually if needed.

---

## 6. Schedule and checkpoints

| Time | Block | Done when |
|---|---|---|
| 00:15–00:45 | **B0:** tag `v0.1-build-live`, branch, install the stack, tokens and fonts, write a 1-page `GAP-ANALYSIS.md` | Build green with the new stack |
| 00:45–02:30 | **B1:** core components, AppShell, role-aware nav, workspace switcher, no-access page, unlisted admin URL | Every existing portal page renders inside the new shell |
| 02:30–04:00 | **B2:** landing page, `/about`, `/how-it-works`, sign-up, sign-in, forgot/reset, `/app` redirect, onboarding wizards | A new visitor can go landing → sign up → onboarding → correct home |
| 04:00–06:30 | **B3:** journeys: Organisation (org setup → verification → project wizard → applications → offers → reviews → finalise) and Admin queues | Org and admin halves of the flow work in the browser |
| 06:30–08:00 | **B4:** Student (discover → apply → offer → workspace → submit → feedback → Passport) and Mentor (assignments → review). Action Centre. Feedback button. Rate-limit change (after approval) | Full flow works across 4 browser windows locally |
| 08:00–08:30 | **B5:** Playwright happy-path e2e, mobile pass at 375px, remove leftover jargon, final checks | All checks green, BUILD-LOG updated |
| **08:30** | **Checkpoint: Marinus tests locally** (15–20 min), then merges the PR into `main` → Vercel deploys | Live site updated |
| 08:45–10:00 | **B6:** live smoke test on production (sign up, every role, the full flow with fresh test accounts), fix anything urgent with small PRs | Full flow works live |
| **10:00** | **Code freeze.** Only critical fixes (crashes, blocked sign-in) until testing ends | |
| 10:00–11:00 | Marinus: set rate-limit env vars and the feedback URL in Vercel, redeploy, prepare tester instructions | Ready |
| **11:00** | **Real users testing** | |

**Checkpoint rule:** if a block runs over by more than 30 minutes, cut scope using the order in §2.
Don't push the 08:30 checkpoint later.

---

## 7. Reply to Marinus at each checkpoint (short)

- What's done (with routes to click)
- What's not done and the fallback
- Anything needing his decision or env vars (exact names and values)
- How to test it in under 10 minutes
