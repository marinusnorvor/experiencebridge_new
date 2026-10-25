# ExperienceBridge — Instructions for AI Coding Agents

**Project:** JAMS / ExperienceBridge — XANIX Challenge 2026  
**Version:** 0.1.0 (draft; team review required)  
**Maintainers:** Four human developers (D1–D4)  
**Status:** Agent onboarding policy only. This file **does not approve** draft architecture, product policies, APIs, release readiness, legal compliance or project outcomes.

> **You are an implementation assistant, not the product owner, architect of record, reviewer or release approver.** Follow the assigned GitHub Issue and the approved specification. If decisions are missing or sources conflict, **stop the affected work and explain the blocker**.

## 1. Product and trust boundary

ExperienceBridge helps students and emerging talent undertake genuine, scoped projects from organizations, obtain independent mentor assessment and organization acceptance, and assemble an evidence-backed Experience Passport.

Protect these invariants in every implementation:

1. **Identity is not authorization.** Check server-side contextual membership, assignment and ownership for every protected resource. Never trust a client-selected dashboard role.
2. **Separate evidence claims:** a submission, a mentor assessment and an organization's acceptance are distinct records. One does not automatically mean another occurred.
3. **Do not fabricate:** never mark demo data as a genuine organization, project, reviewer, accepted deliverable, payment or verified passport. Label all synthetic fixtures unmistakably.
4. **Private by default:** project artifacts, assessments and personal data are not publicly shareable absent approved permissions, item-level disclosure rules and consent.
5. **Payment claims are not payment guarantees:** first release does not custody or transfer funds. Do not invent escrow, payouts or settled statuses.
6. **Paid and unpaid are different policies:** the first-release direction is paid commercial work or appropriately reviewed learning/community work, subject to outstanding legal and safeguarding decisions. Never silently enable unpaid commercial production work.
7. **Audit consequential transitions:** approvals, rejection, reviews, term acceptance, visibility grants and revocations require attribution and traceability.
8. **No production onboarding until the real-user safeguards are signed off.** A working BUILD demo with synthetic data is not the same as a lawful, secure, production-ready release.

## 2. Source of truth — read in this order

Read this file and the assigned issue first. Then read **only the relevant sections** of the following documents, consulting others when a dependency crosses modules.

| Reference | Authority |
|---|---|
| `docs/01-product-requirements.md` | What the system must do: user journeys, functional requirements, compensation and safeguarding policy |
| `docs/02-system-architecture.md` | Module boundaries, security model, infrastructure and architecture decisions |
| `docs/03-database-api.md` | Proposed data models, DTOs, API operations, invariants, lifecycle and permissions |
| `docs/04-ui-ux.md` | Screens, interactions, form behavior, accessibility and shared UI |
| `docs/05-development-roadmap.md` | Release scope, D1–D4 assignments, issue dependencies and delivery gates |
| `docs/06-engineering-standards.md` | Branch, review, testing, security and AI-assisted development standards |
| `docs/decisions/ADR-*.md` | **Only when marked APPROVED by the assigned humans**, confirmed technology or policy decisions |
| Approved executable OpenAPI schemas and migrations (when created) | Machine-checkable contracts implementing approved specifications |

**All six main documents are currently drafts (v0.1), not implementation-approved.** Where proposed prose disagrees with another draft or existing code, do not resolve the conflict independently. Open an issue identifying exact conflicting sections, proposed options and likely impact. Existing source code is not automatic authority to override approved specifications.

## 3. Architecture status: critical open decisions

Do **not** scaffold the production runtime until the relevant decisions are approved:

- **ADR-001:** Next.js + TypeScript + FastAPI/Python or a TypeScript-only full-stack approach; shared backend ownership and contract generation.
- **ADR-002:** Managed identity provider, session/token verification, CSRF/CORS pattern and role mapping.
- **ADR-003:** Application/reapplication, participation and independent submission/mentor/organization review state machines.
- **ADR-004:** Solo-first vs multi-student team participation and attribution.
- **ADR-005 / ADR-006:** Secure evidence storage, upload validation, passport disclosure and revocation.
- **ADR-007 / ADR-008:** Paid/unpaid legality, IP, privacy, safeguarding, mentor checks and organization verification.
- **ADR-009 / ADR-010:** Hosting/environment, audit, notification and error conventions.

Other open product and UI decisions are in `docs/05-development-roadmap.md` §6 and `docs/06-engineering-standards.md` §12.3. Documentation, architectural exploration and explicitly synthetic UI prototypes may proceed, provided they do not masquerade as approved implementation.

## 4. Assignment packet required before writing code

Every coding request must include or link to this filled-in context:

```text
TASK / ISSUE: EB-___ — <one measurable outcome>
HUMAN OWNER: D_ / name
INDEPENDENT REVIEWER: D_ / name
RELEASE: BUILD | P0 | P1 | P2
ALLOWED PATHS: <explicit files/directories>
READ FIRST: AGENTS.md + precise docs/sections
PRD REQUIREMENT IDs: <IDs>
API / DTO / STATE IDs: <IDs>
UI SCREEN IDs: <IDs>
APPROVED ADR IDs: <IDs, or NONE>
DEPENDENCIES: <issues / approved contracts>
ACCEPTANCE CRITERIA: Given / When / Then tests
NEGATIVE TESTS: unauthorized actor, invalid state, duplicate/stale input
OUT OF SCOPE: <explicit exclusions>
STOP IF: decision, schema, role, status or policy is missing/conflicting
EXPECTED OUTPUT: code, tests, actual command results, diff summary and PR notes
```

If the packet is incomplete, ask for the missing minimum information. You may inspect existing code or produce a question list; do not silently create a conflicting interface.

## 5. Module and ownership boundaries (PROPOSED — issue assignment is final)

- **D1 — platform/integration:** repository configuration, CI, shared authorization, environment setup, migration coordination, contracts, staging.
- **D2 — student journey:** discovery, profiles, applications/offers, student participation and evidence UI.
- **D3 — organization journey:** organization/project/terms workflows, selection, milestones, organization acceptance.
- **D4 — mentor/passport:** mentor assignment, rubrics and review, private evidence-backed passport; limited admin/moderation only when assigned.

These are ownership lanes, not permission to edit any file under that domain. **The GitHub Issue's allowed paths and dependency contract control the actual change.** No contributor can self-approve their own PR. Shared contracts, database migrations, authorization logic and organization/student trust boundaries require cross-owner review.

## 6. Required agent workflow

1. **Inspect:** Read this file, assigned issue, referenced specs, relevant implementation and tests. Report blockers before editing.
2. **Restate:** Summarize what changes, which requirements apply, which files may change, and what must stay unchanged.
3. **Plan:** Make the smallest coherent vertical change; cite relevant PRD/API/UI IDs and approved ADRs.
4. **Implement:** Follow established conventions; prefer reuse. Keep client UI, server authorization and persistence responsibilities distinct.
5. **Test in the real environment:** Cover valid path, error/invalid path, and an unauthorized path. For state transitions test duplicates/idempotency and concurrency where relevant.
6. **Review diff:** Look for irrelevant edits, unsafe dependencies, unapproved schema/API/status changes, leaked secrets, logging of private evidence and fabricated verification.
7. **Report:** Give changed files, behavior, tests actually executed and results, tests not run, limitations, open blockers and migration/configuration impact.
8. **Handoff:** Human author explains the change, opens a PR and requests **independent** human review; CI and staging gates apply. AI may not self-approve or merge.

Do not claim a command passed unless it **actually ran**. Missing scripts/tools mean "not run", not a green check. Exact test commands must be established after the stack decision and repository scaffold; examples in Engineering Standards §8.2 are not proof they are configured.

## 7. Hard stop / escalation triggers

Stop the affected implementation and request human review if any of these occur:

- A source conflict or missing approved decision about statuses, authority, legal policy, compensation, public sharing or data retention.
- Requirement to alter schemas/contracts shared with another active feature without coordinated approval.
- A request to bypass auth, impersonate a mentor/organization/admin, backdate an audit event or mark a project as genuinely completed without evidence.
- Requests involving production credentials, real student information, private employer files, sensitive datasets or destructive production operations.
- A new third-party dependency/license, provider selection, hosting account or external service integration not reviewed by a human.
- Real-user pilot / production deployment requested before privacy, legal, security and operational release gates are satisfied.

Offer a minimal safe alternative (documentation, local synthetic fixture, isolated mock, contract question) when possible. Clearly label it as not production-ready.

## 8. Engineering conventions (pending stack approval)

- Follow `docs/06-engineering-standards.md` for naming, formatting, structure, migrations, APIs, review process and CI.
- Keep a single canonical definition for DTOs, enum values, status transitions and authorization predicates. Do not invent route names or response envelopes that differ from Document 3.
- Require server-side identity verification **and** resource-specific permission checking for protected actions. UI hiding is not access control.
- Preserve traceability from submitted artifacts through mentor and organization review into passport display; never make unreviewed text look endorsed.
- Keep organization/project confidential data private, and store file bytes separately from relational metadata as specified after the storage ADR.
- Capture compensation and intellectual-property terms explicitly, with versioned terms and student acceptance before participation.
- Make forms accessible and mobile-usable; implement loading, empty, error, permission-denied and offline/retry states from Document 4.
- Never commit `.env` files, access tokens, real participant information, production data exports or service credentials.

## 9. Pull request report format

```markdown
## Issue and scope
- Issue: EB-___; Owner: D_; Reviewer: D_; Release: ___
- PRD/API/UI/ADR references: ___

## Implementation
- Changed files:
- User-facing behavior:
- Data/API changes:
- Permissions and privacy impact:

## Tests actually run
- `<command>` — PASS / FAIL / NOT RUN (reason)
- Happy path:
- Error / edge case:
- Unauthorized actor:

## AI-assistance accountability
- AI helped with:
- Human reviewed and understood:
- Remaining risks / blockers:

## Demonstration and release
- Synthetic vs real evidence clearly labeled:
- Staging check:
- Rollback or migration consideration:
```

## 10. Release rule

- **BUILD** (submission 6 Nov 2026, 18:00 Ghana time; judging 7 Nov) may use clearly identified synthetic/demo data, but must not misrepresent verified real-world outcomes.
- **P0 functional beta** requires complete agreed workflows, permissions and test gates.
- **Controlled real-user pilot** requires approved participant safeguards, privacy/data handling, compensation and IP terms, organization/mentor checks, evidence permissions, incident response and real-user security tests.
- **Production** requires approved infrastructure, monitoring, backups, operational ownership and support procedures.

**If uncertain: state the assumption, link the source, stop the risky change and ask the responsible humans to decide.**
