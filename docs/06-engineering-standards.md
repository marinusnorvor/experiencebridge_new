# ExperienceBridge — Team Collaboration & Engineering Standards

**Document ID:** EB-ENG-006  
**Version:** 0.2.0 — Coordinated architecture and release-policy update  
**Prepared:** 25 October 2026  
**Status:** **DRAFT / NOT YET RATIFIED**  
**Project:** JAMS — ExperienceBridge (XANIX Challenge 2026)  
**Repository path:** `docs/06-engineering-standards.md`  
**Audience:** Four active developers (D1–D4), reviewers, deployment owners, AI coding agents and future contributors  
**Depends on:** `01-product-requirements.md`, `02-system-architecture.md`, `03-database-api.md`, `04-ui-ux.md`, `05-development-roadmap.md`  
**Separate implementation companions (not part of the six-document update):** root `AGENTS.md`, `CONTRIBUTING.md`, GitHub templates, CI workflows and executable contracts.

> **Read this first.** This is a proposed collaboration standard, not evidence of implemented branch protections, CI jobs, verified compliance, production infrastructure or completed human reviews. All team and platform policies marked **PROPOSED** require JAMS agreement. Where product/legal/security decisions remain **BLOCKED**, contributors may use clearly synthetic fixtures in isolated development but must not claim production readiness. **AGREED** refers to directions explicitly selected by JAMS: a four-developer AI-assisted team; a complete long-term product delivered in increments; paid and appropriately safeguarded unpaid project categories; human review before merge.

> **Approved branching/deployment override (ADR-011):** Any older section advising feature branches off `main`, deploying `main` into staging, or deploying from ordinary PR commits is superseded. Begin feature branches from current protected `staging`; feature PRs target `staging`. A human-reviewed, green merge deploys staging via GitHub Actions. A tested and approved `staging` → `main` release PR deploys production. Codex review is advisory; human approval and required checks are mandatory.


---

> **Document-only update (25 October 2026).** This revision records the architecture and team workflow selected in the planning conversation. It does **not** mean a GitHub repository, Vercel project, Neon database, Codex integration, or CI/CD workflow has been configured or deployed. Do not treat proposed implementation details as approved product contracts. All six documents remain subject to review.

## Agreed delivery controls and agent review policy (25 October 2026)

**Source branch policy:** `main` is **production**, `staging` is **integrated testing**, and each developer works on a short-lived feature branch cut from current `staging`. A feature PR targets `staging`, not `main`. Direct pushes to both protected branches and self-approval should be disallowed where the platform's protection rules support enforcement.

**Required feature PR sequence:** Open PR → CI (type checks, tests, lint, build, relevant API/authorization/migration checks) + **automatic Codex review request** once a supported integration has been configured → author addresses findings → technical lead's human review/approval, plus an independent reviewer for the lead's own changes → merge into `staging` only if checks are green. The user's requested Codex-through-MCP arrangement is an integration goal, **not a currently configured or independently verified merge gate**. AI review may be incomplete or mistaken; it cannot waive human review or required tests.

**Automatic staging deployment:** Merge into `staging` triggers a GitHub Actions-controlled deployment of the decoupled FastAPI and Next.js Vercel projects to staging URLs, using a Neon staging database branch and staging-only secrets. Run API health plus frontend end-to-end smoke tests. Developer feature branch push and unmerged PR code **must not deploy to shared staging or production**. Optional PR preview deployments, if enabled later, must be isolated from sensitive resources.

**Production promotion:** After staging acceptance evidence, create a separate `staging` → `main` release PR; review and approve it. A successful merge into protected `main` triggers GitHub Actions-controlled production deployment of the two Vercel applications using production-specific backend secrets, frontend API base URL, and Neon production. Restrict privileged deployment tokens to trusted protected-branch workflows. No separate Vercel Git trigger should bypass those gates or create unreviewed duplicate deployments.

**Database safety:** Neon's Git-independent staging and production branches must remain isolated. Reviewed Alembic migrations need explicit orchestration and rollout/rollback planning; a Git merge alone does not mutate a Neon database schema. Never place DB credentials in Next.js public environment variables or share production secrets with agents/contributors.

**Operational caveat:** This document specifies the future control process only. No GitHub rulesets, CI/CD jobs, Vercel project links, Neon branches or Codex/MCP connections are claimed to have been created or tested.

---

## 0. Purpose, authority, status and conflicts

### 0.1 Purpose

This document defines **how** JAMS builds and maintains ExperienceBridge. It complements, but does not replace, the product, architecture, API, UX and delivery specifications. It should let a new developer—or their AI assistant—answer:

1. What am I allowed to build, and which decisions have already been made?
2. What is the agreed source of truth for a requirement, endpoint or screen?
3. What code structure and interfaces must I preserve?
4. What tests and evidence must I supply before requesting a merge?
5. Who reviews the work, who approves exceptions, and what happens if something is blocked?
6. How do we avoid unsafe or misleading AI-generated functionality?

### 0.2 Document hierarchy (not a license to ignore contradictions)

| Artifact | Governs | Implementation rule |
|---|---|---|
| `docs/01-product-requirements.md` | Product purpose, user rights, paid/unpaid policy, requirement IDs | The agent must not change product policy. |
| `docs/02-system-architecture.md` + approved ADRs | Deployment and module boundaries, identity model, trust boundaries | Architecture changes require an ADR. |
| `docs/03-database-api.md` + approved OpenAPI/migrations | Relational entities, state transitions, authorization predicates, response contracts | Implement approved contract; do not invent DTOs/statuses. |
| `docs/04-ui-ux.md` | Routes, screen IDs, wording and accessible states | Follow consistent screen behavior and disclosure rules. |
| `docs/05-development-roadmap.md` + GitHub Issues | Delivery scope, D1–D4 ownership, dependencies, milestones | No task is implementation-ready if blockers remain. |
| **This document** | Branches, tests, reviews, security hygiene, agent rules, releases | Enforce consistently across all PRs. |
| Root `AGENTS.md` | Agent onboarding and pointers to the above | A short entry point, **not** an override. |
| Executable code and generated OpenAPI | What is presently implemented | Drift versus approved specs is a defect to be resolved, **not** automatic permission to change the spec. |

**Conflict protocol — ENG-001:** If two sources disagree, stop the affected feature, create or link a decision issue, name the conflicting sections, assess impact, and obtain the required human sign-off. Do **not** choose whichever interpretation makes AI-generated code easiest.

### 0.3 Known conflicts that must not be silently resolved

- **ADR-001 — APPROVED:** Next.js + TypeScript frontend and separately deployed FastAPI/Python backend; do not duplicate backend domain behavior in Next.js.
- **ADR-002 — APPROVED:** Clerk managed identity, Next.js session handling, and FastAPI JWKS verification; see [ADR-002](decisions/ADR-002-clerk-authentication.md).
- **ADR-003 — lifecycle:** PRD §6 has conceptual compound submission states; DB/API §5.5 separately models submission, mentor review and organization review. The team must reconcile these before contract freeze. DB/API §14.1 additionally notes an application reapplication/uniqueness mismatch.
- **ADR-004 — participation:** Solo-first vs teams and individual attribution is pending.
- **ADR-005/006 — evidence and sharing:** File storage and public passport sharing details remain gated.
- **ADR-007/008 — paid/unpaid legality, privacy, IP, organization/mentor verification:** Human and appropriately qualified review precedes real onboarding and external claims.
- **ADR-009 — APPROVED:** Vercel frontend/backend projects and Neon environment-specific branches. **ADR-011 — APPROVED:** feature PR → staging → verified deployment → release PR → main; GitHub Actions deploy gated by successful CI. **ADR-010 — OPEN:** error/audit/notification conventions.

**Decision state:** `PROPOSED → APPROVED` by named human owners; `REJECTED`, `SUPERSEDED` or `DEFERRED` with a recorded rationale. Agent output does not approve ADRs.

### 0.4 Release categories are distinct

- **BUILD / R1:** Demonstration and judging checkpoint by **Friday 6 Nov 2026, 18:00 Ghana time**, with live judging **7 Nov**. May be synthetic and clearly labeled; must not misrepresent pilots or actual credentials.
- **P0 / R2:** Full first functional product scope, not necessarily complete by BUILD.
- **R3:** Controlled real-world pilot **only after** security, legal, privacy, fairness and operational gates are satisfied.
- **R4:** Production launch with real users, approved operations and support.
- **P1/P2:** Later, conditional capabilities. No agent may relabel a deferred feature as BUILD without product and technical lead approval.

---

## 1. Team organization and ownership

### 1.1 Four primary ownership lanes [PROPOSED]

| Lane | Accountable domain | Examples of initial scope | Explicit limitation |
|---|---|---|---|
| **D1 — Platform and integration** | Repo, CI, authentication integration, shared guards, migrations coordination, contracts, staging | Foundation, authorization and forbidden-access tests | Not responsible for writing every backend route or reviewing every PR. |
| **D2 — Student experience** | Public discovery, student profiles/applications/offers, participation and evidence UI | Student journey and student-owned API integration | Cannot independently change organization selection or passport verification policy. |
| **D3 — Organization experience** | Organization project briefs/terms, applications and offers, milestones, acceptance | Organization lifecycle, independent organization-review decision | Cannot masquerade as mentor or override student consent. |
| **D4 — Mentor and passport** | Mentor assignments, evaluation rubrics, private passport assertions and provenance | Mentor reviews and evidence-backed passport | Full admin reporting, public sharing and payment systems are **not** included by default. |

**ENG-002:** Every issue has exactly one primary implementing owner, an independent reviewer, a release target, and named dependencies. Multiple contributors may help, but ownership of completion is unambiguous.

**ENG-003:** The developer who writes a change cannot count their own approval as the independent review. No individual, including D1, has unlimited permission to merge sensitive unreviewed changes.

**ENG-004:** D1 is integration coordinator, not a bottleneck: domain owners implement vertical slices within approved contracts; D1 must delegate and rotate routine reviews.

### 1.2 Review rotation [PROPOSED]

| PR by | Default reviewer | Second reviewer for high-risk changes |
|---|---|---|
| D1 | D3 | D4, or a qualified external reviewer if internal expertise is insufficient |
| D2 | D4 | D1 for auth, schema, privacy or contracts |
| D3 | D1 | D4 for reviews, compensation/terms or exposure |
| D4 | D2 | D1 for credentials, auth, tenant boundaries or API changes |

Human reviewers must understand the change; reviewer assignment alone is not meaningful approval. If no one has adequate competence for a high-impact change, **hold release** and seek help.

### 1.3 Meetings and written coordination [PROPOSED]

- **Daily asynchronous update** in the chosen team channel: completed, next, blocker, open PR, and time spent. Keep it under five minutes to write.
- **At least two integration check-ins per week:** show a running workflow, not just screenshots.
- **Weekly 30–45-minute planning:** review capacity, decisions, issue readiness, priorities and demo/pilot commitments.
- **Urgent security/blocker:** report immediately to D1 and the product lead; do not wait for the next meeting.
- Record decisions in GitHub Issues/ADRs, not solely in WhatsApp or AI chat transcripts.

### 1.4 Permissions and repository access

**ENG-005:** Only the team lead or specifically delegated repository administrators manage collaborators, branch settings, organization secrets and production credentials. Grant the least access required; revoke access when contributors leave.

**ENG-006:** Keep the initial repository **private** unless the team approves source licensing, confidentiality and public visibility. No private user/project data, tokens or unpublished organizational details are checked into Git.

---

## 2. Repository layout and file ownership

### 2.1 Proposed monorepo structure (subject to ADR-001)

```text
experiencebridge/
├── README.md                        # Human entry point
├── AGENTS.md                        # AI agent entry point — create next
├── CONTRIBUTING.md                   # Contributor quickstart — create next
├── .env.example                      # PLACEHOLDERS ONLY
├── apps/
│   ├── web/                          # Next.js/TypeScript if approved
│   └── api/                          # FastAPI/Python if approved
├── packages/
│   ├── ui/                           # Shared components if genuinely reused
│   └── contracts/                    # Generated API types/client artifacts
├── docs/
│   ├── 01-product-requirements.md
│   ├── 02-system-architecture.md
│   ├── 03-database-api.md
│   ├── 04-ui-ux.md
│   ├── 05-development-roadmap.md
│   ├── 06-engineering-standards.md
│   ├── decisions/                    # ADR-001, ADR-002, ...
│   ├── features/                     # Per-feature implementation packets
│   ├── testing/                      # Test plan, fixtures and release reports
│   └── incidents/                    # Sanitized postmortems and lessons
├── tests/
│   ├── contract/
│   ├── authorization/
│   └── e2e/
└── .github/
    ├── ISSUE_TEMPLATE/
    ├── PULL_REQUEST_TEMPLATE.md
    ├── CODEOWNERS                    # Optional, paired with branch rules
    └── workflows/                    # CI/CD workflows after stack decision
```

**ENG-007:** Use a single canonical module for each business invariant. For example, `organization accepted deliverable` is written through the organization review domain; the passport assembles that result and does not independently rewrite it.

**ENG-008:** Do not create unused infrastructure folders, deployment systems or libraries simply to match a diagram. Scaffold only chosen technology and current dependencies, while keeping the documentation for future phases.

### 2.2 Code ownership boundaries

- **Identity/authorization:** D1 is primary; all protected domain endpoints invoke approved shared checks.
- **Project brief, compensation terms and organizational acceptance:** D3 is primary.
- **Student applications, consent UX and evidence submission:** D2 is primary, with contract review by D1/D3.
- **Mentor review, rubrics, passport projection:** D4 is primary, with domain review by D3 and security review by D1.
- **UI system components:** shared code; introduce reusable components only after confirming a second meaningful use case.
- **Schema migrations and contract changes:** whoever owns the domain authors the change; D1 coordinates integrity and release order.
- **Admin/moderation:** explicitly assign per issue; do not silently push an entire admin portal to D4.

**ENG-009:** An agent must not edit unrelated modules, central authorization code, generated clients or migrations to solve a local UI problem unless the issue explicitly authorizes that scope and the relevant owner reviews it.

---

## 3. GitHub workflow and branches

### 3.1 Project planning states

`Backlog → Ready → In Progress → In Review → Done`, with `Blocked` as an interrupt state. Rejected PRs return to `In Progress`.

**Ready criteria — ENG-010:** Each issue states user outcome, owner, reviewer, release, estimate, dependencies, requirement IDs, relevant API/screen references, changed directories, acceptance criteria, test expectations and open decisions. A blocked contract means the issue is **not Ready**.

**Done criteria — ENG-011:** Implementation is reviewed, required tests have passed, merged code is on the intended branch, staging is verified where appropriate, specification changes are synchronized, and evidence is linked from the issue. “AI generated the code” or “UI screenshot looks right” is not Done.

### 3.2 Branch policy [PROPOSED]

- `main`: protected **production** branch; direct pushes, forced pushes and deletion prohibited.
- Create feature branches from current `staging`; one coherent issue per branch.
- Formats: `feat/EB-011-student-application`, `fix/EB-051-tenant-access`, `docs/EB-002-contracts`, `test/EB-040-e2e`.
- Use small PRs (usually a single reviewable concern). Suggested target **under ~400 changed lines of hand-written code** when feasible; generated artifacts or tightly coupled migrations require focused review rather than mechanical splitting.
- Rebase or merge updated `staging` regularly; never resolve conflicts by blindly accepting one side, especially generated schema/code.
- Avoid long-lived personal integration branches that drift for days.

Example commands **after repo creation**:

```bash
git clone <YOUR_APPROVED_REPOSITORY_URL>
cd experiencebridge
git switch staging
git pull --ff-only
git switch -c feat/EB-011-student-application
# Make changes, run tests, commit, push, open a pull request.
```

Do not paste genuine access tokens into clone URLs, issues, terminal recordings or AI prompts.

### 3.3 Commit and pull request naming

- Conventional Commit-style subjects recommended: `feat(student): add application form`, `fix(auth): deny cross-organization read`, `test(passport): cover incomplete reviews`, `docs(adr): clarify consent model`.
- Pull request title: `[EB-011] Student application with authorization and duplicate checks`.
- Description links the actual issue and the requirement/API/UI IDs; explains changes, tests, privacy risks and rollback needs.
- Avoid commits such as `fixed`, `update`, `new code`, or a copied AI explanation without working tests.

### 3.4 Minimum merge gates — ENG-012

For each feature merge into `staging` and each release merge into `main`:

1. Linked **Ready** issue, applicable approved contracts, no unresolved blocking ADRs.
2. At least **one independent human approval**; **two knowledgeable reviewers** for high-risk changes where possible (see §8), with an explicit security sign-off if high-risk and appropriate expertise is present.
3. All applicable required CI checks pass, including validation that tests actually ran.
4. Review comments resolved; author explains the code and known failure modes.
5. No secret-scan findings or known critical/high vulnerabilities introduced; blocked findings documented and remediated, not automatically waived.
6. Contract/schema/doc updates included where behavior changed.
7. Appropriate staging verification, especially for end-to-end state transitions.
8. No real/synthetic ambiguity or fraudulent verification claims.

**Rule availability note:** GitHub branch rules and required reviews depend on repository settings and plan; if technical enforcement is unavailable, adopt recorded human process controls, avoid unreviewed merging, and revisit access controls before real-user launch.

### 3.5 Exceptional merges

- **Urgent production security fix:** D1/product lead may initiate an expedited process, but still needs independent human review, applicable tests and rollback plan. “Deadline pressure” alone is not an emergency exemption.
- **No reviewer available:** hold merge, reduce scope or obtain external review. Do not let an AI agent approve its own change.
- **Failed CI:** fix, or explicitly quarantine a demonstrably unrelated flaky test through a tracked issue with expiration; never disable all CI to meet a deadline.

---

## 4. Language, style and code structure

### 4.1 Technology selection guard

Next.js and FastAPI are now the **selected** technologies. Framework-specific naming, code quality and integration standards remain proposed until team sign-off. The stack being selected does **not** mean these applications have been installed or deployed.

### 4.2 TypeScript and React / Next.js [if selected]

**ENG-013:** Enable TypeScript strict mode. Avoid `any` in business code; use `unknown` with validation at trust boundaries. Type request/response models from approved, generated OpenAPI contracts where feasible.

**ENG-014:** Organize UI by role/domain/feature while retaining shared primitives. Components should have one responsibility; permission enforcement remains on the backend.

**ENG-015:** Prefer server-backed UI state: distinguish `loading`, `empty`, `error`, `success`, `unauthorized`, `forbidden`, and `conflict`. Show final success only after confirmed server mutation response; avoid optimistic fake passport approvals or compensation confirmations.

**ENG-016:** Use semantic HTML, keyboard-accessible controls, visible focus, form labels, readable validation errors and responsive layouts consistent with UI/UX Document 4. Target **WCAG 2.2 AA** as a design/testing objective for public-facing user flows; measure rather than claim conformance without audit.

**ENG-017:** Do not place access tokens in query strings, client logs, analytics events or public configuration. Do not expose server credentials through variables intended for browser bundles.

**ENG-018:** Use formatting/linting tools selected by the team (e.g. ESLint + Prettier, or an agreed equivalent). Tool-specific scripts must be installed and documented; no invented `npm run` command should be claimed operational before the package manifests exist.

### 4.3 Python / FastAPI [if selected]

**ENG-019:** Use typed request/response schemas, service boundaries, consistent exception mapping and dependency-based actor authorization. Avoid direct raw SQL assembled from user inputs. Validate and normalize all untrusted inputs.

**ENG-020:** Use one migration system (proposed: Alembic) and one ORM/query convention (proposed: SQLAlchemy). Schema changes require an explicit migration; never rely on automatic `create_all()` in production.

**ENG-021:** Use team-approved formatting, linting and type checking (e.g. Ruff + a type checker), configured consistently and executed in CI.

**ENG-022:** Routes should orchestrate validation and services; transaction and permission logic belongs in coherent backend functions, not duplicated in each frontend page or hidden in database triggers without a documented reason.

### 4.4 General conventions

- Use descriptive domain names: `application`, `offer`, `participation`, `mentor_review`, `organization_review`, `passport_assertion` rather than generic `record` or `status`.
- Timestamps are timezone-aware and persisted in UTC; render in a user-appropriate timezone. Do not assume browser clock authorizes deadline transitions.
- Never trust client-supplied `student_id`, `organization_id` or `role` as proof of authorization; derive actor identity and membership server-side.
- Store monetary amounts with an exact numeric type and explicit ISO currency (e.g., GHS); never float for contractual money calculations.
- Separate user-facing text from business state and identifiers. Labels can change; API statuses should not be derived from English display strings.
- No hard-coded demo organization names, student identities, reviewer claims or compensation badges in production code paths.
- Prefer small testable functions to huge AI-generated files; reject pasted code whose purpose cannot be explained.

---

## 5. API contracts, persistence and state changes

### 5.1 Single contract process — ENG-023

Use Document 3 for **proposed** operation IDs, DTO names, authorization rules, error codes and lifecycle invariants. After approval:

1. Approve the relevant domain contract and unresolved ADRs.
2. Implement backend request/response schemas with tests.
3. Generate the OpenAPI schema from running backend code, **if using FastAPI**.
4. Review generated schema against Document 3 and the ADR decisions.
5. Generate/update the typed client and run frontend type/contract checks.
6. Update affected feature docs and acceptance tests in the same reviewed change.

**Do not** manually edit a generated client to accommodate an undocumented backend response. Generated code is output, not the place to invent new fields.

### 5.2 Critical data invariants — ENG-024

Preserve these across endpoints, migrations and UI:

- One identity can have multiple authorized roles/organization memberships; role switching never creates authority.
- Organization context is always scoped to a real membership and project relationship.
- Project terms are **versioned**. The student accepts the exact offered terms version; material changes cannot be silently imposed after consent.
- A student's **submission**, a **mentor's review**, and an **organization's acceptance** are independent records/decisions with actor and timestamps.
- A mentor cannot claim organization acceptance solely because they reviewed a submission; an organization reviewer cannot fabricate mentor assessment.
- The Experience Passport projects underlying approved evidence with clear provenance and limits, and is **private by default**.
- Unpaid status, project scope, review obligations, reimbursement, compensation terms and IP/confidentiality conditions cannot be hidden after application.
- Cancelled, disputed, rejected and revoked records must remain auditable; hard deletion may conflict with retention/legal needs and must follow approved policy.

### 5.3 Schema and migration discipline — ENG-025

- One logical schema/migration owner per PR; migrations are reviewed for concurrency, referential integrity, access scope, indexing, backfill, reversibility and retention impact.
- Test migrations against a clean test database **and** the supported previous schema version. Keep a written recovery plan for potentially destructive changes.
- Avoid changing an enum/status field in place until old and new code compatibility is considered. Use expand/migrate/contract where needed.
- Add indexes according to real queries and authorization filters, not blanket indexes on every column.
- Migration must not create unrestricted or default-public data exposure.

### 5.4 Transactions, idempotency and errors — ENG-026

- For acceptance of offers, mentor or organization decisions, terms consent and passport changes, use server-side transactions and appropriate concurrency checks to prevent duplicate/racing state changes.
- Apply idempotency keys to consequential retriable commands **where specified by approved contracts**; never assume network retries are harmless.
- Standardize HTTP semantics and machine-readable error codes per Document 3 §1.2 and §9. Do not report `200 OK` for a failed write.
- Never expose database stack traces, secrets or another tenant's record details in error responses.

### 5.5 Change impact map

Before changing any shared contract, document effects on:

`PRD requirement → lifecycle/ADR → schema/migration → backend DTO/OpenAPI → generated client → UI screens → unit/contract/authorization/e2e tests → rollout/rollback`.

**ENG-027:** No merge of a breaking contract change without approval of affected domain owners and coordinated consumer updates.

---

## 6. Security, privacy, trust and ethics

These are **release gates**, not aspirational visual enhancements.

### 6.1 Authorization and tenancy — ENG-028

- Authenticate protected requests with a verified identity provider/session mechanism approved in ADR-002.
- Enforce authorization **server-side for every protected read and write**, including list filtering, detail lookup, mutation and downloadable evidence.
- Combine role permissions with **resource relationships**: student owns application; mentor is assigned to participation; organization representative belongs to the correct organization and has review authority.
- Deny cross-organization and cross-student access. Use non-disclosing responses when necessary to prevent enumeration.
- Public listings have a **separate explicit public projection**; never serialize entire ORM objects and assume the UI hides private fields.
- Admin privileges require stronger controls, logged actions and least-privilege access; do not implement unconstrained impersonation.

### 6.2 Secure handling of input, files and links — ENG-029

- Validate lengths, formats, file size, claimed MIME, extension and content where appropriate; reject disallowed uploads.
- Store actual evidence in private object storage with authorization-backed retrieval. Production file uploads remain **P1/blocked** until ADR-005, malware handling, ownership, retention and safe delivery are approved.
- Treat external URLs and HTML/Markdown as untrusted. Prevent scripting, unsafe redirects, server-side request forgery and injection; apply allowlists/contextual encoding where appropriate.
- Scan dependencies and secrets; use parameterized queries; avoid leaking personal data in telemetry.
- Prefer synthetic data for development, testing and demonstrations. Do not reuse real passwords or private company documents in public AI services.

### 6.3 Privacy and data lifecycle — ENG-030

- Collect only data needed for the actual workflow and justify sensitive fields.
- Make collection, review and sharing visible to users; grant revocable visibility where legally and technically appropriate.
- Keep passport content private by default. A public/share-safe view requires **separate consent, scoped access, disclosure filtering and revocation** under ADR-006.
- Define retention, correction, deletion/archival handling, backup retention and incident response before real-user onboarding; these rules are **not yet approved**.
- Perform appropriate Ghanaian data protection, work classification and IP/contract review before pilot or production claims. **This document is not legal advice and does not certify compliance.**

### 6.4 Credible experience claims — ENG-031

- Never call a record **verified** solely because a student submitted it or a demo flow clicked Approve.
- Store whose assertion it is, what was observed/accepted, evidence link, rubric/version, timestamp and verification limitations.
- Keep confidential reviewer comments separate from publicly sharable claims.
- Clearly label demo/synthetic actors, projects, reviews, badges, compensation and generated passports in non-production demonstrations.
- Never claim real interviews, organizational participation, recruiter acceptance, payroll or monetization without dated supporting evidence.
- Negative/partial outcomes are valid records. The system must not automatically turn every submission into successful assessed experience.

### 6.5 Paid/unpaid project safeguards — ENG-032

- Respect the PRD's chosen **both-paid-and-unpaid** direction with clear disclosure and guardrails.
- Proposed rule: commercial production work is paid; restricted unpaid learning/volunteering cannot be a disguised labor replacement. Actual legality and participant protections must be checked before onboarding real projects.
- Scope, hours, start/end, required equipment, transport, reimbursement, compensation amount/currency/timing, supervision, revisions, acceptance and IP must be clear and saved as accepted terms.
- Do not build in-app escrow/payment collection as though it were available; initial compensation terms may be recorded without platform custody under the proposed scope.
- Unsafe or disputed project work must have a reporting, pause and admin resolution pathway in the production release design.

### 6.6 Mandatory negative cases

Every protected feature must test, as applicable:

1. Unauthenticated actor rejected.
2. Signed-in actor with wrong role rejected.
3. Correct role but wrong student/project/organization rejected.
4. Suspended/removed membership rejected even if prior session remains.
5. ID enumeration does not leak private content.
6. Duplicate request, stale version or expired offer handled correctly.
7. Attempts to approve another actor's review are denied.
8. Private artifact and passport URLs cannot be accessed by another user.
9. Revoked visibility no longer grants access to share-safe evidence.
10. Audit entries exist for consequential actions, without leaking secrets.

---

## 7. AI-assisted engineering policy

This project explicitly permits AI coding assistants. AI is a **tool**, not a teammate who can grant product or release approvals.

### 7.1 Human accountability — ENG-033

**Each submitted change has a named human author responsible for understanding the code.** The owner must be able to explain architecture, data flow, authorization logic, errors, tests and known limitations during review. “The agent said it works” is not evidence.

### 7.2 Mandatory agent context packet — ENG-034

Before implementation, the human gives the agent:

```text
TASK: EB-___ — <specific outcome>
OWNER: D_ / <person>
REVIEWER: D_ / <person>
RELEASE: BUILD | P0 | P1 | P2
ALLOWED PATHS: <directories/files>
READ FIRST: AGENTS.md, then exact doc sections
PRD IDS: <requirement codes>
API IDS: <operation/DTO IDs>
SCREEN IDS: <route/screen IDs>
APPROVED ADRS: <IDs or NONE>
DEPENDENCIES: <issues/branches>
ACCEPTANCE TESTS: <Given/When/Then>
OUT OF SCOPE: <explicit exclusions>
STOP IF: any schema/role/status/contract/policy decision is missing or contradictory
EXPECTED OUTPUT: code + tests + commands/results + changed-file summary + PR notes
```

If `AGENTS.md` does not yet exist, the human points to this document and the applicable source sections rather than allowing the agent to guess instructions.

### 7.3 Required agent workflow — ENG-035

1. **Read** relevant sources and existing code/tests before proposing changes.
2. **Restate** the task's boundaries, referenced contracts and unresolved questions to the human if needed.
3. **Plan** only the smallest coherent change; list files to touch.
4. **Implement** within authorized scope; prefer project conventions over generic agent templates.
5. **Test** happy path, key failure path and unauthorized path; actually run commands in a real environment when available.
6. **Inspect diffs** for unrelated edits, suspicious dependencies, secrets, missing validation and broken conventions.
7. **Report factually** what changed, what was tested, which commands ran, what was not tested and any blockers.
8. **Human review** the output before commit/PR; independent reviewer evaluates before merge.

### 7.4 Agent stop conditions — ENG-036

The agent must pause the affected change rather than guess when it encounters:

- Unapproved ADR or inconsistent PRD/API/UI rule (including submission-review states or reapplication).
- Missing permission rule for a new resource or actor relationship.
- Requirement to edit production credentials, environment secrets or real user data.
- Proposal to introduce public evidence sharing, payment custody or confidential artifact upload before controls are approved.
- Cross-cutting schema migration that affects other developer branches without coordination.
- A request to impersonate a real employer, mentor, reviewer, recruiter or pilot participant in data or marketing claims.
- CI/test infrastructure missing: report inability to run rather than fabricate green results.
- Output requiring outside dependencies/licenses that were not reviewed.

### 7.5 Prohibited agent actions — ENG-037

- Do not invent endpoints, ORM entities, enum values, verification criteria, project categories or payment guarantees.
- Do not bypass authentication/authorization to make a demonstration succeed.
- Do not disable lint/tests/branch rules without tracked, approved change.
- Do not paste secrets, student information, real organizational files or private evaluations into prompts.
- Do not use fabricated passing test logs, screenshots or benchmark figures.
- Do not modify security-sensitive infrastructure or delete data without human authorization.
- Do not auto-merge, approve own PRs, or claim an issue is Done without recorded human acceptance.

### 7.6 Provenance of AI changes — ENG-038

Pull requests should label AI-assisted contributions and include a short **human verification note**:

> “AI assisted with [areas]. I inspected [critical paths], ran [actual commands], tested [edge/security cases], and understand [key limitation].”

This is **not** a blanket assertion that AI code has been audited. Claims must match actual review work.

---

## 8. Testing strategy and enforceable quality gates

### 8.1 Test layers — ENG-039

| Layer | What it proves | Minimum examples |
|---|---|---|
| Unit | Business rules and pure functions | Compensation field validation, state transition guards, rubric calculations if any |
| Component/UI | Correct view and accessible behavior | Application form errors, loading/empty states, role-dependent menus |
| API/contract | Backend and client agree on DTO/status/error schema | Typed OpenAPI drift, error envelope, required fields |
| Integration/database | Persistence and transaction correctness | Offer accepted once, terms versions persisted, review attribution |
| Authorization/security | Protected access cannot cross boundaries | Other student's application, unrelated organization's project, unassigned mentor |
| End-to-end | Complete real workflow across roles in staging | Project → apply → offer → consent → submit → reviews → private passport |
| Manual/exploratory | UX, mobile, weak networks, surprising sequences | Offline retries, 360px layout, keyboard navigation |
| Operational | Deploy/rollback and backup procedures | Config validation, basic health checks, migration recovery exercise |

**ENG-040:** A high-confidence feature includes at least a success test, a failure-state test and a permission test if protected. Critical transitions additionally need concurrency/idempotency tests.

### 8.2 Minimum quality commands [PROPOSED; finalize after ADR-001]

Do not claim these scripts already work. D1 must install/configure tools, document exact commands and ensure CI invokes **existing scripts**. Possible commands **after setup**:

```bash
# Frontend if Next.js/TypeScript selected:
cd apps/web
npm run lint
npm run typecheck
npm run test
npm run build

# API if FastAPI/Python selected:
cd ../api
ruff check .
pytest -q
# Also run chosen Python type checker and migration checks.
```

**ENG-041:** CI must fail if required checks are absent or skipped, not merely when executed tests fail. Preserve separate job outcomes and a clear test summary.

**ENG-042:** A green UI build is not permission to release if API, migration, negative-authorization, privacy or pilot controls remain untested.

### 8.3 Risk-based review matrix

| Risk | Example | Required review/testing emphasis |
|---|---|---|
| **Low** | Copy correction, nonfunctional spacing | Independent reviewer, lint/component check where relevant |
| **Medium** | New student UI form, ordinary read-only API | Contract tests, validation, error states, accessibility and one human review |
| **High** | Login/session, tenant authorization, contract terms, data migrations, private evidence | Security-focused review plus independent review where possible; authorization/integration tests; rollback |
| **Critical** | Payment custody, public sharing of real evidence, bulk data export, admin impersonation, production access changes | Block until documented product/security/legal decisions and appropriate qualified review; tests and staged rollout alone are insufficient |

**ENG-043:** If a high/critical risk item lacks a competent reviewer, do not merge it into a real-user release. A synthetic demo must still have appropriate isolation and cannot be misrepresented as secured production.

### 8.4 Test data — ENG-044

- Factories and fixtures create fake students, organizations, mentors and submissions with conspicuous names like `DEMO Organization A` and `Synthetic Student 1`.
- Never use actual student/organization records copied from chats, spreadsheets or email in CI.
- Resettable development data cannot be confused with production data.
- Demo passports show provenance labels and demo status on every relevant view/export.
- Document known untested cases and outstanding defects rather than hiding them.

---

## 9. Review process and Definition of Done

### 9.1 Pull request review checklist — ENG-045

Reviewer confirms the following and leaves specific comments when needed:

- [ ] Task and affected files match an approved issue and stage.
- [ ] Linked PRD, ADR, API, UI and test references are correct; unresolved blocks are not bypassed.
- [ ] Implementation can be explained without relying on the AI conversation.
- [ ] Backend decides protected permissions for every affected resource and list.
- [ ] Database migrations, transactions and status invariants are reviewed.
- [ ] Mentor review and organizational acceptance remain independent; actors are attributable.
- [ ] Terms versions, unpaid disclosure, participant consent and private-evidence defaults are preserved.
- [ ] Error, empty, permission and stale/duplicate states are handled accurately.
- [ ] Tests were actually executed; failures, flakiness and gaps are visible.
- [ ] UI is responsive, keyboard usable and follows shared design components.
- [ ] No secrets, sensitive data, uncontrolled logs, demo-as-real claims or suspicious dependencies.
- [ ] Docs/generated clients updated when code contracts change.
- [ ] Operational changes include deployment/migration/rollback notes where applicable.

### 9.2 Definition of Done — ENG-046

An implementation issue is **Done** only when:

1. Acceptance criteria demonstrated by code and tests on an integrated branch.
2. Applicable CI checks pass and results are linked.
3. At least one independent human reviewer approves, with stronger handling for high-risk changes.
4. Database/API/UI/docs are consistent or an approved transition plan exists.
5. Staging integration is validated where applicable.
6. Privacy/security/verification invariants hold in negative tests.
7. No blockers, critical regressions, unsupported product claims or unresolved high-severity problems remain.
8. Issue records the actual deliverable, known limitations and remaining follow-up work.

**“Works on my machine” is insufficient.** No formal test coverage percentage is prescribed until the team has a reliable baseline; target behavior, especially high-risk paths, rather than vanity coverage.

---

## 10. CI/CD, environments and releases

### 10.1 Environment separation — ENG-047

| Environment | Data | Typical access | Purpose |
|---|---|---|---|
| Local development | Synthetic fixtures; safe local secrets | Individual developer | Build and run tests |
| CI / test | Ephemeral synthetic data | Automated pipeline | Validate changes and contracts |
| Staging | Synthetic or approved non-sensitive test data | Team, authorized testers | Integrated smoke tests and review |
| Production | Real data only after explicit release gates | Approved operators | Real users/projects once compliance approved |

Each environment uses **separate secrets, database, storage buckets, identity configuration and deployment permissions**. Never point local CI scripts at production resources.

### 10.2 Proposed CI stages — ENG-048

1. Checkout with least privilege and restricted workflow-token permissions.
2. Install pinned tool/runtime versions; cache dependencies safely.
3. Lint, format-check, static types.
4. Unit and component tests.
5. Contract consistency and schema/migration checks.
6. Integration and negative authorization tests with isolated test database.
7. Dependency and secret scanning (using appropriately configured tools).
8. Build artifacts; publish sanitized test outputs.
9. On accepted PR merge to protected `staging`, deploy both Vercel projects to the staging preview environment through GitHub Actions and run smoke tests.
10. Open `staging` → protected `main` release PR; after release approval and passing CI, the GitHub Actions `main` push deploys the production Vercel projects. Production is **not authorized for real-user onboarding** until separate product/privacy/security release gates are complete.

**ENG-049:** CI workflows and bot permissions require D1 plus an independent reviewer. Third-party GitHub Actions must be vetted and pinned appropriately; never grant broad write tokens by default.

### 10.3 BUILD release candidate — ENG-050

For the 6 November checkpoint, demonstrate only what genuinely exists:

- Organization posts terms and approved project.
- Student views terms, applies and accepts an actual offer in the demo system.
- Student submits an artifact/evidence record.
- Assigned mentor records an independent review.
- Authorized organization reviewer records acceptance separately.
- Student sees a **private, provenance-rich** Experience Passport with an honest demo label if synthetic.
- Cross-tenant/unauthorized access is denied in tested cases.
- Show what is implemented, simulated, not implemented, and still an unresolved product hypothesis.

Do **not** ship unsafe temporary permissions or an insecure public passport merely to impress judges. Critical improvements after the feature freeze require documented approval and repeat regression testing.

### 10.4 Real-pilot / production release gate — ENG-051

A real-world pilot or real-data launch is **BLOCKED** until named owners sign off:

- Relevant Ghanaian legal and data-protection obligations, project work categories, consent and IP terms.
- Participant safeguards, safe reporting, cancellations/disputes and compensation handling.
- Identity/authorization, organization/mentor verification claims and tests.
- Evidence upload/URL safety, sharing/retention policy and basic abuse moderation.
- Backup/restore, monitoring, on-call/support ownership, incident response and rollback.
- Data collection and pilot research consent with measurable outcomes.

Passing CI alone does not satisfy this gate. Acceptance status is recorded in a release checklist with approvers and date.

### 10.5 Deployment and rollback — ENG-052

- Every deploy records commit SHA, environment, migration version, approval, deploy time and release notes.
- Do not make irreversible migrations in the same step as an unreviewed feature switch.
- Keep an easy rollback path for application code; know when database migrations require forward remediation instead of naive rollback.
- Have a staging smoke script for sign-in, protected action, organization posting, student application, review and private passport.
- Exclude secrets and real user data from screenshots, test logs, chat transcripts and issue discussions.

---

## 11. Incidents, vulnerabilities and support

### 11.1 Severity guide [PROPOSED]

| Level | Example | Team response |
|---|---|---|
| `SEV-1` Critical | Unauthorized disclosure of real student records; active credential compromise | Contain immediately, restrict access, notify designated response owner and seek qualified assistance; evaluate lawful notification duties. |
| `SEV-2` High | Cross-tenant access on staging, broken consent or bad organization acceptance | Stop release, assign owner, fix and regression-test before continuing. |
| `SEV-3` Medium | Workflow error affecting some demo users without sensitive data exposure | Track, prioritize and communicate workaround if safe. |
| `SEV-4` Low | Cosmetic or minor content issue | Backlog or planned fix. |

**ENG-053:** Do not post exploit details, live tokens, confidential screenshots or personal information in public issue threads. Use private coordinated reporting for sensitive vulnerabilities.

### 11.2 Minimum incident handling

`Detect → contain → preserve sanitized evidence → assess scope → assign owner → fix/test → restore → communicate appropriately → document lessons.`

Incident records must note timestamp, affected environment, approximate impact (if established), root cause **only when evidenced**, mitigations, verification tests, and follow-ups. Never speculate about a breach being absent without checking.

---

## 12. Decisions, changes and documentation maintenance

### 12.1 Architecture Decision Record template — ENG-054

Create a file `docs/decisions/ADR-NNN-short-description.md`:

```markdown
# ADR-NNN: <specific decision>
Status: PROPOSED | APPROVED | REJECTED | SUPERSEDED | DEFERRED
Date: YYYY-MM-DD
Owner: <named human>
Context: <problem and affected requirements>
Options: <at least two where material>
Decision: <one selected option, or OPEN>
Rationale: <constraints and trade-offs>
Security / privacy / fairness / legal implications: <analysis or pending specialist advice>
Consequences and migration plan: <what changes>
Impacted docs/DTOs/UI/tests/issues: <paths and IDs>
Reviewers and approval: <names/date>
```

**ENG-055:** Product or architectural decisions that affect another developer's interfaces cannot be made solely in a DM, meeting or generated code; record and link an ADR/decision issue before implementation.

### 12.2 Documentation change rules — ENG-056

- Authoritative sources are Markdown in the repository, reviewed via PRs.
- Every requirement/API/UI change links its issue and updates corresponding specs/tests in the same PR or a coordinated locked sequence.
- Keep status headers and version history; do not retroactively turn an unapproved proposal into an agreed decision.
- Prefer concise, testable requirements and exact examples over repetitive prose.
- Do not silently overwrite prior decisions; use ADR supersession and migration notes.
- Track `SPEC_DIVERGENCE` issues when deployed implementation and approved design differ.

### 12.3 Open-decision register (carry into first kickoff)

| ID | Blocking question | Suggested deciders | Latest responsible point |
|---|---|---|---|
| ADR-001 | Backend/framework selection and package tooling | D1 + D2–D4 | Before scaffolding |
| ADR-003 | Independent review states; uniqueness/reapply policy | Product lead + D1/D2/D3/D4 | Before schema/API freeze |
| ADR-004 | Solo-first participation vs teams | Product lead + domain owners | Before participation model |
| ADR-005 | Evidence storage/link validation rules | D1/D2/D4 | Before file upload |
| ADR-006 | Passport sharing, recipient authorization and revocation | Product/privacy owner + D4 | Before external share |
| ADR-007 | Compensation, classification, IP and privacy requirements | Product lead + appropriate advisors | Before real work |
| ADR-008 | Organization/mentor validation and conflicts | Operations/product lead | Before truthful verification |
| ADR-009 | Hosting, environments, retention/backup | D1 + operators | Before production |
| ADR-010 | Errors, events and audit conventions | D1 + domain owners | Before shared API code |

---

## 13. Templates for GitHub handoff

### 13.1 Issue template (copy to `.github/ISSUE_TEMPLATE/` after review)

```markdown
# EB-___ — <specific user outcome>
Owner: D_ / <name>
Reviewer: D_ / <name>
Release: BUILD | P0 | P1 | P2
Priority: Critical | High | Medium | Later
Estimate (focus hours): ___
Dependencies/ADRs: ___
Allowed paths: ___

## Requirements and contracts
PRD IDs: ___
Architecture/ADR refs: ___
API/DTO IDs: ___
UI screen IDs: ___

## Behavior to deliver
- In scope: ...
- Out of scope: ...
- Permissions, privacy, terms and evidence rules: ...

## Acceptance (Given / When / Then)
- Given ..., when ..., then ...
- Given an unauthorized actor ..., when ..., then ...
- Given a duplicate, stale or invalid request ..., when ..., then ...

## Verification
- Unit/contract/integration/e2e test cases: ...
- Commands to run: ...
- Staging demo steps: ...
- Real vs synthetic data clarification: ...

## Blockers
- OPEN decisions: ...
- Escalation owner: ...

## Completion
- [ ] Code and tests included
- [ ] Authorized actor and negative security tests passed
- [ ] Generated contracts/specs synced
- [ ] Human peer review approved
- [ ] Staging validated if applicable
```

### 13.2 Pull request template (copy after review)

```markdown
## Issue / traceability
Closes: EB-___
PRD IDs: ___   API IDs: ___   UI IDs: ___   ADRs: ___
Release scope: ___   Human author: ___   Reviewer: ___

## Summary and changed boundaries
- What changed: ...
- Files and modules touched: ...
- New schema/API/status/role: Yes/No; approval ref: ...

## Tests actually executed
| Command | Environment | Result | Evidence |
|---|---|---|---|
| ___ | ___ | PASS / FAIL / NOT RUN | ___ |

## Authorization, privacy and product truth
- Server-side scope verified: ...
- Negative role/tenant test: ...
- Terms, review provenance, evidence visibility impact: ...
- Demo vs real data: ...

## AI assistance & human review
- AI used for: ...
- I personally inspected: ...
- Known limitations/blocked decisions: ...

## Staging, migrations and rollback
- Staging checks: ...
- Schema migration/recovery: ...
- Rollback note: ...

## Final checks
- [ ] CI passed (or gaps documented and release held)
- [ ] No secret/private data in diff or evidence
- [ ] Contracts/docs/tests synchronized
- [ ] Independent human approval obtained
```

### 13.3 Copy-ready short agent instruction (until `AGENTS.md` exists)

> You are assisting on **ExperienceBridge**, a real-product effort by four JAMS developers. Before editing, read `docs/06-engineering-standards.md` and only the relevant portions of Docs 1–5 referenced by the assigned GitHub Issue. Treat unapproved decisions, endpoints, statuses, roles and schemas as **unknown**, not as gaps you may fill. Keep changes inside authorized paths. For any protected endpoint, implement and test server-side resource authorization. Preserve separate mentor reviews, organization decisions and student evidence. Keep project terms versioned and passport data private by default. Use synthetic data in demos and never claim employer/recruiter verification without evidence. Run actual checks, report what ran, and stop on contract conflict. A human must review and independently approve any merge.

---

## 14. Onboarding procedure for the four developers

### 14.1 Before inviting contributors

1. Product lead creates the repository with controlled visibility, initial README and documentation.
2. Team chooses and records at least ADR-001 through ADR-004 or explicitly limits work to doc-only tasks and safe mocks until approved.
3. D1 establishes branch/PR protections where available, starter CI, issue/PR templates and an approved environment example **without secrets**.
4. Product lead assigns D1–D4 to actual people and sets independent reviewers.
5. Create GitHub Project columns and release milestones; import only priority items with complete issue packets.
6. Confirm one reliable communication channel and meeting/check-in cadence.
7. Decide where staging lives and who can access it before distributing deployment credentials.

### 14.2 Developer first-day checklist

- [ ] Accept repository invitation and configure MFA on relevant accounts.
- [ ] Read root `README.md` and `AGENTS.md` (once created), then Docs 1–6 sections relevant to assignment.
- [ ] Understand whether the selected stack/ADRs are **approved** rather than merely proposed.
- [ ] Run the approved setup and tests locally using **existing commands**.
- [ ] Know owner and reviewer, issue IDs, dependencies and affected directories.
- [ ] Open a **small documentation or test PR** as an onboarding rehearsal.
- [ ] Demonstrate ability to explain a relevant API, permission boundary and error case.
- [ ] Know how to report a blocker and identify synthetic versus real data.

### 14.3 Three examples of cross-team handoffs

**Organization project publication:** D3 authors project forms and posting domain. D1 reviews authentication/membership guard, schema and publishing contract. D2 consumes approved public project DTOs. D4 does **not** reimplement publication statuses to satisfy mentor screens.

**Student offer acceptance:** D3 issues an offer referencing frozen terms. D2 builds student consent and invokes an approved offer-acceptance endpoint. D1 reviews concurrency/identity. D4 sees participation only after a valid acceptance exists. No client-side status manipulation creates a participation.

**Experience Passport:** D2 owns private student display; D4 owns passport assembly of attributable submissions, mentor reviews and independent organization decisions; D3 owns organization acceptance; D1 verifies tenant/private projection tests. No dashboard can fabricate a review or unilaterally call a record “verified.”

---

## 15. Team sign-off and activation criteria

### 15.1 Required before **parallel implementation at scale**

- [ ] Four developers have reviewed this document and selected actual owners/reviewers.
- [x] ADR-001 and ADR-002 are decided for scaffold/auth implementation.
- [ ] ADR-003 reconciles compound submission statuses and reapplication policy.
- [ ] ADR-004 clarifies participation/team attribution; related schema approved.
- [ ] Compensated/unpaid policies and real-onboarding legal/privacy gates are acknowledged.
- [ ] Repository visibility, review rules, secret handling and environment setup are configured.
- [ ] CI actually runs the commands documented in package/project manifests.
- [ ] First GitHub Issues contain complete agent task packets and acceptance criteria.
- [ ] Developers and agents understand that BUILD ≠ production launch or verified real-world pilot.

### 15.2 Before public or real-user operations

- [ ] All applicable gates in Document 5 §11.4 and this document §10.4 passed, recorded and dated.
- [ ] Security/privacy controls tested independently for realistic cross-tenant and artifact access.
- [ ] Correct employment/project classification, terms, IP and evidence sharing reviewed appropriately.
- [ ] Data ownership, rights, retention, incident response, support and backup/restore processes defined.
- [ ] Human sign-off exists for release; a successful automated pipeline alone is insufficient.

**Proposed signatures**

| Role | Name | Date | Decision |
|---|---|---|---|
| Product/Team Lead | __________ | __________ | APPROVE / REVISE |
| D1 — Platform | __________ | __________ | APPROVE / REVISE |
| D2 — Student | __________ | __________ | APPROVE / REVISE |
| D3 — Organization | __________ | __________ | APPROVE / REVISE |
| D4 — Mentor/Passport | __________ | __________ | APPROVE / REVISE |

### 15.3 Next artifact after Document 6

Create a concise repository-root **`AGENTS.md`** that uses this document as the engineering authority and routes agents to the exact relevant specifications, issues, approved ADRs, generated schemas and test commands. Then create `CONTRIBUTING.md`, real issue/PR template files and CI workflows after the team chooses a stack.

> **End of Document 6 v0.2.0.** All six planning documents now exist as drafts. They are **not** automatically consistent, approved, implemented or evidence of production readiness. The next milestone is a short cross-document decision/reconciliation review followed by GitHub setup and approved, issue-scoped implementation.
