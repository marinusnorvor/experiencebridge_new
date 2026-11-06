# ExperienceBridge — Product, UX & Journey Build Plan

**Owner:** Team JAMS (Marinus Norvor, lead) · **For:** Claude Code · **Date:** 5–6 Nov 2026
**Goal:** Turn ExperienceBridge from a working prototype into a real, coherent product. It needs a
public JAMS website, proper registration and sign-in, four connected role journeys
(Student, Organisation, Mentor/Supervisor, Admin) that hand work to each other seamlessly, and a
top-notch, fast, interactive UI.

This is a real product, not a demo. The XANIX submission (Fri 6 Nov, 6:00 PM) is a milestone
along the way. It is not the scope limit.

---

## 0. How Claude Code must work through this plan

1. **Read first, build second.** Before writing code, read `AGENTS.md`, `docs/01–06`, this plan,
   `apps/api/app/*/router.py`, `apps/api/app/*/models.py`, `packages/api-client/openapi.json`
   and `apps/web/features/*`. Produce `docs/GAP-ANALYSIS.md`: for every journey step in §4, list
   what exists (backend endpoint, frontend screen), what's broken, and what's missing.
   Show it to me before Phase 1.
2. **Branches.** One branch per phase (`feat/p1-foundation`, `feat/p2-journeys`, …). PR into `main`.
   Never push to `main` directly, never force-push. `main` must stay deployable at all times;
   it's live on Vercel with the production database.
3. **Tag the current live version first:** `git tag v0.1-build-live && git push origin v0.1-build-live`,
   so we can roll back.
4. **Ask before:** production database migrations, any change to auth or permission logic,
   deleting a teammate's module, adding a paid service.
5. **Every PR must pass:** backend tests, lint, typecheck, production build, plus the end-to-end
   journey tests from §9 once they exist. Include screenshots of the changed screens in the PR description.
6. **Keep a running log** in `docs/BUILD-LOG.md`: what changed, why, what you tested.
7. **Don't invent backend fields.** The UI uses the real API contract (OpenAPI → generated types).
   If a journey needs something the API lacks, propose the backend change in §7 and wait for my approval.
8. **No fake data on real screens.** Empty states must be honest and helpful. Demo or seed
   data is labelled and only created through `seed_demo.py`.

### Timeline guardrail

| When | What must be true |
|---|---|
| Fri 6 Nov, 3:00 PM | **Phase 1 merged and live** (landing page, auth, design system, clean portals). The submission uses this. |
| Fri 6 Nov, 4:00 PM → Sat after judging | Code freeze on `main`. Work continues on branches only. |
| From Sun 8 Nov | Phases 2–4 continue at full scope. |

If Phase 1 isn't done by 2:00 PM Friday, stop adding scope and finish what's started.

---

## 1. Product positioning (for the landing page and all copy)

**Brand:** JAMS (team) → **ExperienceBridge** (product).
**Tagline:** *Real work. Verified experience.*

**The problem (Ghana, first):** Young people finish school with skills but no proof of
experience. Even "entry-level" jobs ask for 1–2 years of it. One in five Ghanaians aged 15–35 is
unemployed (GSS, 2025), and research shows *years* of experience barely predict job
performance (Van Iddekinge et al., 2019: r ≈ 0.06). What matters is **what you've actually
done, and who can vouch for it.**

**What we do:** Organisations post short, real projects. Students and recent graduates deliver
them with guidance from a supervisor or mentor. Every completed project becomes a verified
entry in the student's **Experience Passport**: real deliverables, real feedback, real proof.

**Value by audience:**
- **Students and graduates:** real projects for your CV, feedback from professionals, and a
  Passport employers can trust.
- **Organisations:** get real work done, see talent in action before hiring, and build a
  pipeline of proven people.
- **Mentors and supervisors:** shape the next generation and give back with structured,
  lightweight reviews.
- **Universities and career services:** measurable employability outcomes for your students.

**JAMS values** (use on the About section): *Proof over promises · Access for everyone ·
Honest evidence · Learning by doing · Built in Ghana, for Africa.*

**Copy rules:** Plain, warm, confident English. No internal IDs or spec references on screen
("STU-01", "D2", "§6.8", "EB-012", "Strict provenance", "Cryptographic guarantee", "synthetic").
Never claim outcomes we don't have, such as partner logos, user counts or testimonials. Use real
numbers only from the database, or none.

---

## 2. Site map and routes

### Public website (marketing, no sign-in)
| Route | Purpose |
|---|---|
| `/` | Landing page (see §5.1). **Not** a portal. |
| `/about` | JAMS team, mission, values, the research behind the idea |
| `/how-it-works` | Detailed flow for each audience, with FAQs |
| `/for-organisations` | Organisation pitch and "Post a project" CTA |
| `/for-students` | Student pitch and "Find a project" CTA |
| `/projects` *(optional, P2)* | Public read-only list of open projects (title, org, skills, duration). Applying needs sign-in. |
| `/passport/[shareId]` *(P3)* | Public, shareable, read-only Experience Passport (student opts in) |
| `/privacy`, `/terms` | Plain-language policies |

### Auth
`/sign-up`, `/sign-in`, `/forgot-password`, `/reset-password`, `/verify-email`, `/onboarding`

### Signed-in app
| Route | Who |
|---|---|
| `/app` | Smart redirect to the right home for the user's role(s) |
| `/student/*` | Students |
| `/organization/*` | Organisation members (owner / project_manager / reviewer) |
| `/mentor/*` | Mentors and supervisors |
| **Unlisted admin URL** (see §6) | Platform admins only |

**Navigation rule:** The header only shows portals the signed-in user can actually use. If a user
has several roles, show a **workspace switcher** (avatar menu → "Switch to Organisation" etc.),
not four top-level links.

---

## 3. Roles and how a user gets each one

The backend derives roles from records, not from a checkbox at sign-up. **Don't change that
model.** Design onboarding around it:

| Role | How it's granted (existing API) | UI entry point |
|---|---|---|
| Student | Default for every account | Automatic |
| Organisation member | `POST /organizations` (creator = owner) → `POST /organizations/{id}/submit-verification` → admin `POST /admin/organizations/{id}/decisions` | Onboarding "I represent an organisation", or later from the avatar menu |
| Mentor / supervisor | `PUT /me/mentor-profile` (→ `mentor_candidate`) → admin `POST /admin/mentors/{id}/eligibility` | Onboarding "I want to mentor", or later from the avatar menu |
| Platform admin | Server-side role grant / super-admin bootstrap only | Never self-service |

**Mentor vs supervisor (from mentor feedback, 3 Nov):** Organisations should be able to put
**their own trusted staff** forward as supervisors for their projects. External vetted mentors stay
optional. In the UI, call the role **"Mentor"** in general and **"Supervisor"** when the person
belongs to the project's organisation. Check §7 before adding any backend field for this.

---

## 4. Journey maps (the core of this plan)

Status values below are the real database statuses. Every screen must show the current status
with a consistent **status badge** and a **"what happens next / who's waiting on whom"** hint.

### 4.1 Organisation journey
1. **Sign up → onboarding:** create the organisation profile (name, sector, size, website, location,
   logo, contact). Organisation `verification_status`: `draft`.
2. **Submit for verification** → `submitted`. Show a clear "Under review by ExperienceBridge
   (usually within 48h)" state. The org can draft projects meanwhile but can't publish them.
3. Admin decision → `verified` / `changes_requested` (show the admin's reason inline and let them fix and
   resubmit) / `rejected`.
4. **Create project, a multi-step wizard with autosave:** basics → scope and deliverables →
   milestones → skills → duration and capacity → terms (compensation, IP, confidentiality,
   supervisor) → review. Project `status`: `draft`.
5. **Submit for review** → `pending_review` → admin → `open` / `changes_requested` / `rejected`.
6. **Applications inbox per project:** `submitted` → start review (`under_review`) → `shortlisted` →
   **offer** (creates an offer: `offered`) or `rejected`. Show applicant cards with skills,
   motivation, and their Passport if they have one.
7. Student accepts the offer → a **participation** is created (`active`). Project can be **started** (`in_progress`).
8. **Assign a supervisor or mentor** to the participation (`proposed` → mentor accepts/declines).
9. **Review submissions** after the mentor review: `accepted` / `revisions_requested` / `rejected`, with
   written feedback.
10. **Finalise the participation and complete the project** → `completed`. This writes to the student's Passport.

### 4.2 Student journey
1. **Sign up → onboarding:** name, institution, programme, graduation year, skills (tag input),
   interests, short bio, optional LinkedIn/GitHub/portfolio links. Show a profile completeness meter.
2. **Discover:** browse `open` projects with search, skill and duration filters, and saved projects.
   Project detail shows the org (verified badge), scope, deliverables, milestones, compensation
   terms and capacity.
3. **Apply:** short form (motivation, relevant skills, availability) plus explicit consent to the
   project's terms version. Application status timeline: `submitted → under_review → shortlisted →
   offered`, or `rejected` / `withdrawn`. The student can withdraw.
4. **Offer:** accept or decline before it expires. Accepting creates a participation.
5. **Workspace (participation `active`):** milestones checklist, submission drafts (text plus
   external links/artifacts), submit → `submitted`. Show mentor and org feedback threads per
   submission, and handle `revision_requested` with a clear "Revise and resubmit" action.
6. **Completion** (`completed` / `partially_completed`) → **Experience Passport** entry: project,
   org, role, dates, deliverables, skills demonstrated, mentor rubric scores, and org acceptance
   quote. Passport page is beautiful, printable (PDF), and later shareable via a public link (P3).

### 4.3 Mentor / supervisor journey
1. **Sign up → onboarding:** mentor profile (expertise, years of experience, industries,
   availability, LinkedIn) → `mentor_candidate` → "Awaiting approval".
2. Admin marks them eligible → `approved`.
3. **Assignment inbox:** proposed assignments with project and student context → accept / decline.
4. **Review queue:** submissions awaiting mentor review, sorted by waiting time. Review form:
   rubric per skill (structured scores), written feedback, decision (`reviewed` /
   `revision_requested` / `unable_to_assess`).
5. **My mentees:** progress per participation, and end the assignment when it's done.

### 4.4 Admin journey (unlisted URL)
1. **Overview:** queues first ("3 organisations awaiting verification, 2 projects awaiting
   review, 1 mentor awaiting approval"), then platform stats.
2. **Organisation verification queue:** details, verify / request changes (required reason) / reject.
3. **Project moderation queue:** full brief and terms, approve / request changes / reject, with a reason.
4. **Mentor eligibility queue.**
5. **Oversight:** users, applications, participations, with search and filters, read-only.
6. **Audit log:** every decision, with who, when and why.

### 4.5 Cross-role coordination (the "everything works together" contract)

Every handoff must be visible to the person who now has to act. Build an **Action Centre**
(a bell icon plus a "Needs your attention" panel on each home screen).

| Event | Who must see it, and where |
|---|---|
| Org submits verification | Admin queue count and Action Centre |
| Admin verifies / requests changes on org | Org owner: banner and Action Centre, with the reason |
| Org submits project for review | Admin project queue |
| Admin approves project (`open`) | Org: "Your project is live". Students: appears in Discover |
| Student applies | Org: applications inbox badge |
| Org shortlists / offers / rejects | Student: application timeline and Action Centre |
| Student accepts offer | Org: participant added. Student: workspace unlocked |
| Mentor assigned | Mentor: assignment inbox |
| Student submits work | Mentor review queue, then org review queue |
| Mentor or org requests revision | Student: workspace banner with feedback |
| Org finalises | Student: Passport updated, celebration moment |

**Phase 2 implementation:** derive the Action Centre on the client from existing list endpoints
(`/me/applications`, `/me/offers`, `/me/participations`, `/me/mentor-assignments`,
`/admin/*/pending`, `/organizations/{id}/projects`). Poll on focus and every 30–60s.
**Phase 3:** a real `notifications` table and endpoint, plus optional email via Resend (see §7).

---

## 5. Key screens

### 5.1 Landing page `/`
Feels like a premium Framer site: big confident type, generous whitespace, subtle motion.
1. **Hero:** headline (*"Real work. Verified experience."*), one-line subhead, two CTAs
   ("Find a project" → sign-up as student, "Post a project" → sign-up as organisation), and a
   product visual (a styled mock of an Experience Passport card, built in HTML/CSS, not a stock photo).
2. **The experience trap:** three short stat cards from §1, with sources in small text.
3. **How it works:** three steps with icons, animated on scroll.
4. **For each audience:** tabbed or segmented cards for Students / Organisations / Mentors / Universities.
5. **The Experience Passport:** an interactive preview (hover or tilt card, skills chips, a review quote marked "example").
6. **Values and team (JAMS):** values grid and team members (names and roles only, no photos unless provided).
7. **FAQ:** accordion.
8. **Final CTA band and footer:** links, contact email, © JAMS 2026.

### 5.2 Registration `/sign-up`
- Two-pane layout: form on one side, brand panel on the other (tagline, rotating value statement).
  A single column on mobile.
- Step 1: **"I'm joining as…"** cards: Student / Organisation / Mentor (sets the onboarding path; still
  a normal account underneath).
- Step 2: full name, email, password with a live strength meter and rules checklist, show/hide toggle,
  confirm password, and a terms consent checkbox.
- Inline validation on blur, a friendly error per field, the submit button shows a loading state,
  no double submits, and API errors mapped to human messages (rate-limited, email in use, etc.).
- Success → auto sign-in (if the API allows; otherwise go to sign-in with the email prefilled) → `/onboarding`.

### 5.3 Sign-in `/sign-in`
Email and password, show/hide, "Forgot password?", errors that don't reveal whether an account
exists, a loading state, and a redirect back to the page the user came from (`?next=`) or `/app`.

### 5.4 Onboarding `/onboarding`
A step wizard for the chosen path (§3), with a progress bar, skippable optional steps, autosave,
and it ends on the right home screen.

### 5.5 Portal homes
Each home has the same anatomy: greeting · **Needs your attention** (Action Centre items) ·
key numbers · recent activity · a primary next action. Never show an empty dashboard without a next step.

---

## 6. Unlisted admin URL

- Server-only env var `ADMIN_PATH_SECRET` (random, e.g. 24+ characters). **Never** in a `NEXT_PUBLIC_*`
  variable or any client bundle or link.
- In `apps/web/proxy.ts`, rewrite `/{ADMIN_PATH_SECRET}/*` → the internal `/admin/*` routes.
  Requests straight to `/admin/*` return **404** (not 403, so the URL isn't advertised).
- Admin is never shown in the public nav. Admins reach it by bookmark. After an admin signs in,
  `/app` redirects to the secret path server-side.
- **The hidden URL is not the security.** Every admin API endpoint keeps its server-side
  `platform_admin` check, and that check must not change. Add a test proving that a signed-in
  non-admin gets 404 at both the hidden path and `/admin`.

---

## 7. Backend changes to propose (require my approval before building)

| # | Change | Why | Phase |
|---|---|---|---|
| B1 | `EB_BUILD_DEMO_WORKFLOWS` gate → rename/replace with a proper `WORKFLOWS_ENABLED` production readiness setting | It's a real product now | 2 |
| B2 | `notifications` table, `GET /me/notifications`, mark-read, written on every handoff in §4.5 | Real Action Centre | 3 |
| B3 | Transactional emails via Resend for key handoffs (with an opt-out) | Users aren't always signed in | 3 |
| B4 | Org-nominated supervisors: allow an org owner to nominate a member as mentor for their own project (fast-track eligibility scoped to that org) | Mentor supply bottleneck (judges' feedback) | 3 |
| B5 | Student profile fields (institution, programme, grad year, skills, links) if not already in the API | Onboarding and Passport | 2 |
| B6 | Public Passport share link: `share_id`, opt-in, revocable, read-only endpoint | Employers can verify | 3 |
| B7 | Org logo / avatar upload (Vercel Blob) | Polish | 4 |

---

## 8. Design system and interaction quality

**Inspiration:** Framer-made SaaS sites, Linear, Vercel, Stripe, Raycast: clean, confident,
fast, with tasteful motion. If the `frontend-design` skill (or any design skill) is
available in Claude Code, load it before Phase 1 UI work and follow it. Run a design critique
and an accessibility pass on each major screen before opening its PR.

**Foundations (set up once in Phase 1, used everywhere):**
- **Stack:** Tailwind v4 (already present), **shadcn/ui** (Radix primitives) for accessible components,
  **lucide-react** icons, **Framer Motion** (`motion`) for animation, **TanStack Query** for data
  fetching, caching, optimistic updates and background refresh, **react-hook-form + zod** for forms,
  and **sonner** for toasts.
- **Tokens (CSS variables):** one brand colour (deep teal `#0F766E`, used for primary actions), a warm
  accent for highlights (amber), neutral slate greys, and semantic success/warning/danger/info.
  Radius 10–12px, a soft shadow scale, and an 8px spacing grid. The **same light theme across all four
  portals** (admin can use a denser layout, not a different brand). Dark mode is P4.
- **Type:** Geist or Inter. A display size for the marketing hero and a tight scale in the app (14/16 body).
- **Components:** App shell (sidebar on desktop, bottom tabs or drawer on mobile), page header,
  StatusBadge (one colour mapping for every status in §4), Timeline/Stepper, EmptyState,
  Skeletons, DataTable (search, filter, sort, pagination), Stat card, multi-step Form wizard,
  Command palette (⌘K: jump to pages and projects), workspace switcher, Action Centre panel,
  ConfirmDialog for destructive or irreversible actions (offers, rejections, finalise).
- **Interaction rules:**
  - Every async action shows immediate feedback (button spinner or optimistic update) and a toast.
  - Skeletons, not spinners, for page loads. Navigation feels instant (prefetch and cached queries).
  - Every error is human and has a retry. No raw JSON or stack traces.
  - Destructive and irreversible actions need confirmation and explain the consequence.
  - Micro-motion only (150–250ms ease-out). Respect `prefers-reduced-motion`.
  - Keyboard: everything reachable, visible focus rings, `Esc` closes dialogs.
  - Mobile-first: every journey must work at 375px wide. Many Ghanaian users are on phones.
  - Performance budget: landing page LCP < 2.5s on a mid-range phone; JS per route kept lean; images
    via `next/image`.
- **Accessibility:** WCAG 2.1 AA contrast, labelled inputs, aria-live for toasts and errors.

---

## 9. Testing: "everything works together" must be proven

- Add **Playwright** end-to-end tests (`apps/web/e2e/`) that run the full journey with 4 browser
  contexts (org, admin, student, mentor) against a local API and the dev database:
  org signs up → creates org → submits verification → admin verifies → org creates and submits
  project → admin approves → student sees it, applies → org shortlists and offers → student accepts →
  mentor assigned and accepts → student submits → mentor reviews → org accepts → org finalises →
  student's Passport shows the entry. Plus the negative paths (revision requested, rejection,
  withdrawal, non-admin blocked from admin).
- Keep the backend pytest suite green, and add tests for every backend change in §7.
- Before each phase PR: run the e2e suite, then manually check on mobile width and in an incognito window.

---

## 10. Phases and acceptance criteria

### Phase 0: Prepare (≈1h)
Tag `v0.1-build-live`, write the gap analysis, install the UI stack (§8), confirm the build still passes.
**Done when:** gap analysis is approved by me.

### Phase 1: Foundation and first impression (target: live by Fri 3:00 PM)
- Design tokens, app shell, core components (§8).
- Landing page `/` (§5.1) plus `/about`. Other marketing pages can be stubs linked from the footer.
- New sign-up (with role choice), sign-in, forgot/reset password (§5.2–5.3).
- `/app` smart redirect, role-aware nav and workspace switcher, a proper "no access" page.
- Unlisted admin URL (§6).
- Remove all internal labels and dev jargon from existing portal screens. Restyle the existing
  portal pages to the new design system **without changing their logic**.
**Done when:** a new visitor understands JAMS from the landing page, can register and sign in
smoothly, lands in the right place, and no screen shows developer jargon. Lint, typecheck, build and
backend tests are green, and it's deployed and checked live.

### Phase 2: Connected journeys
- Onboarding wizards (student, org, mentor).
- Complete every step in §4.1–4.4 using existing endpoints, with status badges, timelines and next-step hints.
- Action Centre v1 (client-derived, §4.5).
- Playwright happy-path e2e.
**Done when:** the full e2e journey passes and every handoff in §4.5 is visible to the right person.

### Phase 3: Real coordination
- Backend B2–B4, B6 (after approval). Notifications, emails, org-nominated supervisors, shareable Passport.
**Done when:** a user who is signed out gets an email for the actions that need them, and the
Passport share link works in incognito.

### Phase 4: Polish and scale
- Command palette, saved projects, PDF Passport export, logo uploads, dark mode, analytics on the
  admin overview, performance and accessibility audit fixes.

---

## 11. Do not

- Don't weaken or bypass any server-side permission check to make the UI easier.
- Don't put secrets or the admin path in client code, `NEXT_PUBLIC_*` variables, or git.
- Don't show fake partners, testimonials, numbers or "verified" claims.
- Don't rewrite a working module from scratch when restyling it is enough.
- Don't merge to `main` without green checks and my approval.

## 12. Decisions I (Marinus) still owe the team
1. Final naming: "Mentor" vs "Supervisor" in the UI (default: both, as in §3).
2. Whether organisations pay (and how) — affects project terms copy. Default: show what the
   org entered; no payments in the platform yet.
3. Team bios and contact email for `/about` and the footer.
4. Whether `/projects` is public (default: yes, read-only, P2).
