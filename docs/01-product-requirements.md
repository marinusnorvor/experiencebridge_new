# ExperienceBridge — Product Requirements Document (PRD)

**Document ID:** EB-PRD-001  
**Version:** 0.2.0 — Coordinated architecture and release-policy update  
**Date:** 25 October 2026  
**Status:** DRAFT — for team, mentor, prospective users, and legal review; not implementation-approved  
**Owner:** JAMS Product/Technical Lead  
**Repository path:** `docs/01-product-requirements.md`  
**Related documents:** `02-system-architecture.md`, `03-database-api.md`, `04-ui-ux.md`, `05-development-roadmap.md`, `06-engineering-standards.md`, `AGENTS.md` (separate future agent-instructions companion; outside these six specifications)

> **Source and certainty convention:** **AGREED** = direction explicitly chosen by JAMS in planning; **PROPOSED** = specification for team review, not yet approved; **VALIDATE** = hypothesis, external/legal uncertainty, or outstanding user research. Nothing in this document is evidence of adoption, completed employer interviews, pilot success, recruiter trust, or legal compliance.

## Executive summary

ExperienceBridge is a proposed Ghana-first platform for emerging talent to earn **documented experience through real, bounded organizational projects**. Organizations describe real problems and acceptable deliverables; students or recent graduates apply and contribute; mentors provide structured guidance and assessment; authorized organization representatives review outcomes; and the system creates an **Experience Passport** linked to the evidence and assessments actually recorded. A passport must distinguish a student's claim, a mentor's review, an organization's acceptance, and independently verified identity/organization information. No label should suggest stronger verification than has occurred.

**Primary product decision (AGREED):** support **paid and unpaid project models** with transparent disclosure and safeguards. **Policy recommendation (PROPOSED):** paid work should be the default for commercially valuable deliverables; uncompensated participation should initially be limited to suitable volunteer/community or genuinely educational arrangements, subject to legal and program review. **Commercial work cannot be disguised as an unpaid 'learning opportunity'.**

**Delivery strategy (AGREED direction):** plan for the complete platform while building a small, reliable end-to-end workflow first. A production-complete marketplace is not promised for the XANIX BUILD deadline of 6 November 2026.

---

> **Document-only update (25 October 2026).** This revision records the architecture and team workflow selected in the planning conversation. It does **not** mean a GitHub repository, Vercel project, Neon database, Codex integration, or CI/CD workflow has been configured or deployed. Do not treat proposed implementation details as approved product contracts. All six documents remain subject to review.

## Architecture and delivery boundary — confirmed planning decisions (25 October 2026)

**AGREED technology and release topology:** ExperienceBridge is planned as one separately deployed **Next.js/TypeScript frontend** and one separately deployed **FastAPI/Python backend**, with **Neon PostgreSQL** as the database. Both applications are to be hosted on **Vercel** in separate projects, with a shared, authoritative FastAPI API. Developers will not connect the browser to Neon or duplicate server-side eligibility, authorization or verification rules in Next.js. This is a **technical architecture choice**, not a change to paid/unpaid safeguards or Experience Passport evidence rules.

**AGREED review and release flow:** Each contributor works from the current `staging` branch on their own feature branch; opens a PR to `staging`; an *automatically requested Codex review* is proposed as an advisory integration (exact connection mechanism must be configured and verified); automated checks run; and the technical lead provides human approval. Only then is the PR merged. The merge triggers **GitHub Actions-controlled staging deployment** of the frontend and backend to separate Vercel projects/environments. The team tests the deployed staging workflow. A separately reviewed and approved `staging` → `main` release PR triggers **production deployment**, with production credentials and database separated from staging. No ordinary feature-branch push deploys into the shared staging or production environments.

**AGREED environment data separation:** Neon has distinct staging and production database branches or isolated instances, credentials and access rules. Database branches are **not synchronized by Git merges**; schema changes require separately reviewed migration plans. Staging should use synthetic or suitably safeguarded test data. Customer, student and organization data must not be copied from production without a separate legal/privacy review.

**Implementation scope remains gated:** The exact identity provider, object storage, background job strategy, system state machines, API schemas, terms of service, recruitment permissions and legal safeguards remain **PROPOSED/BLOCKED** where so marked elsewhere in this PRD. Hosting selection does not authorize real-user onboarding.

---

## 1. Vision, problem, and product boundaries

### 1.1 Vision [AGREED DIRECTION]

**Real work. Demonstrated ability. Trusted experience.**

Enable emerging talent to demonstrate professional capability by solving useful, appropriately scoped problems with supervision and evidence-based assessment, while helping organizations complete meaningful work.

### 1.2 Problem statement [RESEARCH-SUPPORTED CONTEXT; SOLUTION UNVALIDATED]

Some students and new graduates find it difficult to obtain the prior experience requested in recruitment. Organizations may have manageable projects but lack a convenient, trusted method to engage and supervise emerging talent. Conventional portfolios and self-reported resumes do not consistently document the nature, quality, and independent review of real contributions. Ghana school-to-work research and JAMS's supporting evidence motivate this problem framing but **do not prove that ExperienceBridge solves it**.

### 1.3 Value propositions [HYPOTHESES TO VALIDATE]

| Actor | Proposed benefit | What must be tested |
|---|---|---|
| Student / recent graduate | Real project opportunities; documented work; specific feedback; shareable evidence | Will qualified students apply, complete work, and find the results useful? |
| Organization | Help with bounded projects at manageable supervision cost | Will organizations post real projects, provide reviewers, and accept usable work? |
| Mentor | Structured, time-bounded support with clear assessment rubrics | Will mentors participate consistently, and at what cost? |
| Recruiter | Inspect more specific evidence than a self-reported skills list | Does evidence change assessment or shortlisting decisions? |
| Platform admin | Maintain safe, credible operations and transparency | Can the platform review projects and handle disputes at sustainable cost? |

### 1.4 Proposed first target segment [PROPOSED; VALIDATE]

- **Talent:** Ghana-based tertiary students and recent graduates, initially **18 years and older**, with some existing digital skills and the capacity to complete supervised projects.
- **Organizations:** small businesses, startups, or nonprofits able to supply a genuine, low-risk digital task, one accountable reviewer, an appropriately scoped brief, and payment where applicable.
- **Pilot project examples:** informational websites, basic data cleaning using anonymized data, design assets, simple internal dashboards using synthetic/non-sensitive datasets.
- **Avoid initially:** production security access, live financial/health data, sensitive customer information, legal/medical advice, hazardous tasks, projects requiring unsupervised privileged infrastructure access.

**Why narrow:** breadth makes project review, skill matching, mentorship, quality assurance, and legal/ethical controls harder. Broader industries may follow only after evidence.

### 1.5 Non-goals for the first release [PROPOSED]

ExperienceBridge will **not initially** function as a job guarantee, general job board, automatic certification authority, replacement for Ghana National Service, employer-of-record service, payment escrow, full recruitment ATS, or unsupervised AI grading engine. Nor will the first release promise that every project or claimed skill is independently verified.

### 1.6 Design principles [PROPOSED]

1. **Evidence before badges** — show what was done, who reviewed it, and any limitations.
2. **Fair work** — no misleading or exploitative uncompensated commercial work.
3. **Explicit accountability** — every project has a responsible organizational representative; supervised projects name a mentor.
4. **Least privilege and privacy** — access is granted per project, organization, and evidence item.
5. **Traceability** — important approvals and assessments are recorded, time-stamped, and auditable.
6. **Accessibility and low bandwidth** — responsive, readable interfaces that work reasonably on phones and unstable networks.
7. **Honest metrics** — track adoption and outcomes separately; do not manufacture pilot outcomes or trust claims.

---

## 2. Project model and compensation policy

### 2.1 Project categories [AGREED PRINCIPLE; DETAILS PROPOSED]

| Code | Type | Example | Initial disposition |
|---|---|---|---|
| `PAID_FIXED` | Paid deliverable/fixed-fee | Build an informational website for an SME | Permit after review; specify amount, milestones, payer and due dates |
| `PAID_TIME` | Paid time-based | Structured hourly data-cleaning assignment | Permit after review; specify rate, expected hours, ceiling, time approval and payment schedule |
| `SPONSORED_LEARNING` | Sponsored training/community project | Sponsor funds learner stipends for a nonprofit brief | Permit only with documented funding, rights, mentorship, and classification review |
| `VOLUNTEER_COMMUNITY` | Unpaid community/nonprofit volunteering | Optional brochure design for an eligible community group | Conditional approval; limited scope, genuine voluntariness, meaningful learning, safeguards |
| `UNPAID_COMMERCIAL` | Uncompensated commercially valuable output | SME requests production website for free | **Reject under initial platform policy** |
| `UNCLASSIFIED` | Missing or conflicting terms | “Great exposure; pay later” | Block publishing until resolved |

**Legal caveat:** a UI category, the parties' label, or the promise of a certificate cannot determine employment status or waive statutory protections. Ghana-qualified legal advice is required before launching compensation-bearing or volunteer arrangements at scale. In particular, determine whether the platform's matching activity engages employment-agency rules, and whether any specific project creates a worker/employer relationship. No interpretation here is legal advice.

### 2.2 Required project posting fields [PROPOSED]

Each publishable project shall provide:

- Organization name, account owner, verification status, and authorized project owner.
- Project title, real-world problem, purpose, beneficiaries, scope and **out-of-scope** items.
- Expected deliverable(s), measurable acceptance criteria, required and optional skills, difficulty level.
- Estimated hours, start date, expected duration, submission deadline, review window, remote/in-person requirements and any travel or equipment costs.
- Number of students, individual or team participation, relevant mentor and organization reviewer arrangements.
- Compensation category; for paid projects, **currency, amount/rate, milestones, payer, payment due dates, dispute and cancellation terms**; for unpaid projects, clear `GHS 0` monetary compensation, volunteer/learning rationale, safeguards, and approved eligibility.
- Data access classification, confidentiality level, intellectual property (IP) ownership/license expectations, publicity and portfolio-sharing permissions.
- Contact/support route, safety disclosures, and participant agreement/version.

A post cannot be published with ambiguous compensation, missing reviewer, prohibited data access or no measurable deliverables.

### 2.3 Safeguards for all projects [PROPOSED]

**PM-001.** Students see the full terms **before applying**, not just after acceptance.  
**PM-002.** Material changes to pay, scope, deadlines, data access, or IP require explicit renewed consent from affected parties; retain prior terms.  
**PM-003.** Estimated hours and milestones must be realistic and consistent with the level of experience requested; admins can request a rescope.  
**PM-004.** Expenses (internet, transport, equipment) and any reimbursement must be disclosed separately from pay.  
**PM-005.** No student pays an organization for an opportunity; undisclosed platform fees are prohibited.  
**PM-006.** On-platform contact and report routes must support withdrawal, harassment reporting, dispute escalation and adverse-event handling.  
**PM-007.** No student should be required to give an organization passwords or privileged infrastructure access through the platform.  
**PM-008.** For an individual project, identify the responsible mentor/reviewer before work starts, or document an explicitly approved alternative supervision arrangement.  
**PM-009.** Require organizational confirmation that the project is lawful and does not displace paid work under a false learning label; platform review still applies.  
**PM-010.** Do not include under-18 users in the first release until age-specific safeguarding and legal review is complete.

### 2.4 Additional safeguards for unpaid projects [PROPOSED — MUST BE RATIFIED]

**UP-001.** Unpaid work may be proposed only for approved community/volunteer or genuine educational activities, not normal commercial production output.  
**UP-002.** Specify clear learning objectives, bounded expected hours, mentorship commitment and expected feedback.  
**UP-003.** Participation and withdrawal must be genuinely voluntary without deceptive penalties or withheld previously earned credentials.  
**UP-004.** Display **“Unpaid: GHS 0”** prominently in discovery, detail, application and agreement screens; never bury it in terms.  
**UP-005.** An admin must explicitly approve the classification before publication; a request to change from paid to unpaid returns to review.  
**UP-006.** Prohibit “payment in exposure,” guaranteed employment claims, or vague promises of future pay.  
**UP-007.** Ensure participant safety, fair scheduling and escalation paths; collect feedback about unfair work.  
**UP-008.** Block repeated, high-volume unpaid projects from one organization pending investigation of displacement or exploitation.  
**UP-009.** Before permitting real unpaid participation, confirm applicable Ghana labor, volunteer, tax and education rules with qualified counsel; block uncertain cases.

### 2.5 Payment execution scope [PROPOSED]

For the **first release**, the platform **records compensation terms and payment status assertions** but **does not collect, hold, or disburse funds**. Organizations pay through an approved external arrangement. A student's report of nonpayment or payment dispute prevents any automated statement that compensation has been settled. The system may record `unconfirmed`, `organization_reported_paid`, `student_confirmed_received`, or `disputed`; no state is equivalent to audited payment proof without evidence.

**Later, conditional feature:** integrated payment provider, transaction records, refunds/holds, jurisdiction-specific compliance, and financial dispute handling. Do not build simulated escrow or promise payment guarantees before operations and compliance are designed.

### 2.6 Example of a valid project [ILLUSTRATIVE ONLY]

> **Project:** Build a five-page informational site for an approved small business.  
> **Work:** Desktop/mobile frontend, contact form with approved handling, documentation and handover.  
> **Time:** 12–18 estimated hours across 2 weeks.  
> **Compensation:** Paid fixed fee, with currency, amount and schedule to be agreed and disclosed before publication.  
> **Organization reviewer:** Named, authorized business representative.  
> **Mentor:** Named reviewer with two scheduled checkpoints.  
> **Acceptance:** Pages render on agreed devices, agreed content is present, contact form is tested, and source repository or artifact is handed over.  
> **Evidence:** Accepted deliverable, change history, authored contribution and mentor review; confidential materials excluded from public passport.

---

## 3. Roles, identities, and permissions

### 3.1 Account model [PROPOSED]

One human identity may have multiple contextual roles. **Roles are not simply a dropdown in the UI.** Every backend operation checks account status plus membership/assignment against the relevant resource.

| Role | Can do | Cannot do without further authority |
|---|---|---|
| `STUDENT` | Own profile; view eligible opportunities; apply; accept terms; submit assigned work; see private feedback; share permitted passport evidence | Edit organization briefs; approve own work; access other students' private evidence |
| `ORG_OWNER` | Manage their organization's memberships and settings; designate project managers/reviewers | Control another organization; bypass admin restrictions |
| `ORG_PROJECT_MANAGER` | Draft projects, review applications, select contributors, manage authorized projects | Approve project classification if admin review required; view other organizations |
| `ORG_REVIEWER` | Record acceptance/revision decisions for projects to which explicitly assigned | Claim mentor assessment or certify all skills automatically |
| `MENTOR` | View assigned projects/evidence; guide and assess recorded competencies | Access unrelated participants; approve compensation or act as org reviewer by default |
| `RECRUITER_VIEWER` | View only public or specifically shared passport evidence with valid permission | Search private records or treat private reviews as publicly disclosed |
| `PLATFORM_ADMIN` | Moderate accounts/projects, investigate reports, oversee audit records under controlled access | Quietly forge assessments, rewrite historical approvals or bypass audit logs |

**Special rules:** an account may be both mentor and organizational representative, but its actions must be recorded under the exact authority used; any conflict of interest must be declared and reviewed. Admin accounts require stronger authentication and an explicit privileges process.

### 3.2 Organization account structure [PROPOSED]

An organization has its own entity, lifecycle and membership records. A person may belong to multiple organizations, but selects an active organization context; the backend always verifies membership for the requested resource. An organization may be `submitted`, `under_review`, `verified`, `restricted`, or `rejected`. `Verified` means the platform's documented checks were completed; it **does not** guarantee organizational quality, solvency or future payment.

### 3.3 Mentor enrollment [PROPOSED; VALIDATE AVAILABILITY]

Mentors create profiles with expertise, project capacity, availability, and any necessary evidence of qualifications. Admin or approved program staff can review eligibility. Mentors must consent to individual project assignments. No project may claim mentor review when no mentor actually performed one. Mentors should be able to decline and step down through a documented reassignment path.

### 3.4 Recruiter model [PROPOSED]

Recruiter access begins as **limited passport verification**, not a full recruitment marketplace. Recipients of valid shared links see only permitted evidence and exact verification levels. Public profile search, candidate messaging, hiring workflows and recruiter billing are later-stage hypotheses.

### 3.5 Administrators [PROPOSED]

Separate moderation duties from technical database access. Admin actions involving restrictions, identity verification, dispute resolution, rejected projects, or deletion must be logged. Sensitive actions should require elevated authorization and review as the platform scales.

---

## 4. End-to-end workflows

### 4.1 Workflow A — Organization onboarding

**Trigger:** authorized representative wants to post work.

1. Person registers/signs in and verifies contact information.
2. Creates or joins an organization; supplies required identity, contact, organization description and evidence for review.
3. Platform records organization as `submitted`; an admin checks completeness and applicable verification requirements.
4. Admin accepts, requests more information, rejects with an explanation, or restricts the organization.
5. Once approved, the organization owner can invite members and assign project manager/reviewer roles.

**Alternative/exception paths:** duplicate organization, conflicting owner claim, suspicious records, failed verification, missing evidence, restricted organization. No unverified organization is presented as verified. Any provisional posting allowance must be clearly marked and controlled.

**Acceptance checks:** unauthorized members cannot update the organization; all moderation outcomes are recorded with reason and timestamps.

### 4.2 Workflow B — Create, review, and publish a project

1. Authorized organization member creates a `draft` with required fields from §2.2.
2. Project form validates completeness, compensation disclosures and prohibited categories.
3. Organization submits project for moderation (`pending_review`).
4. Admin checks genuine scope, applicant safety, pay classification, mentor/reviewer arrangements, data/IP constraints and reasonable workload.
5. Admin approves (`open`), requests revisions (`changes_requested`), or rejects (`rejected`).
6. An approved project appears in student discovery with compensation and work conditions visible.

**Exceptions:** scope expanded after publishing; compensation converted to unpaid; review cannot be completed; organization loses verification; project breaches policy. Material edits send project back to review and notify existing applicants/participants as appropriate.

**Acceptance checks:** a student cannot apply to `draft`, `pending_review`, `rejected`, `cancelled` or otherwise closed projects.

### 4.3 Workflow C — Student onboarding and application

1. Student creates account, verifies required contact details and fills a minimum viable profile.
2. Student browses filtered opportunities (skills, duration, location, compensation and availability).
3. Student opens a project and reviews deliverables, pay/unpaid terms, hours, privacy/IP and deadlines.
4. Student submits application with required answers and any portfolio evidence; application becomes `submitted`.
5. Organization reviews and `shortlists`, `rejects`, or `offers` participation.
6. Student accepts or declines offer **after viewing final terms**. Accepted offer establishes `participation`.

**Exceptions:** duplicate active applications, full project, withdrawal, terms changed, organization rejection, expired offer, student suspended. No participation starts without explicit terms acceptance.

**Acceptance checks:** an applicant sees their own status, not confidential information about competing applicants; only the authorized organization can select students.

### 4.4 Workflow D — Project execution and mentorship

1. An approved participation is activated with agreed scope, assignment, time expectations, milestones and reviewer/mentor identities.
2. Student and mentor receive relevant workspace access; organization can manage milestones within agreed scope.
3. Student submits milestone evidence (file, link, explanation, contribution attribution) via controlled storage.
4. Mentor records feedback and, where justified, assessed competencies against a rubric.
5. Organization reviewer accepts the deliverable, asks for revisions, or records a reasoned rejection.
6. Revisions create additional submission/review records; earlier decisions are retained in audit history.
7. On accepted final deliverables and required reviews, participation can be marked `completed`; otherwise use explicit partial/incomplete/cancelled status.

**Exceptions:** mentor unavailable; disputed authorship; missed deadlines; participant illness; organization unresponsive; poor-quality deliverable; harassment allegation; confidential file accidentally shared. Escalate, pause, replace mentor, or amend scope using controlled procedures.

**Acceptance checks:** mentor review and organization acceptance are separate records; mentor cannot mark organization acceptance unless separately authorized; a completed badge is not issued for incomplete work.

### 4.5 Workflow E — Experience Passport assembly and sharing

1. System retrieves the student's specific participation and approved evidence references.
2. Build a record with project title, organization, dates, work scope, student's claimed contribution, actual submitted artifacts, mentor observations, organization review status, and disclosure rules.
3. Assign **evidence statuses by assertion**, not an all-purpose “verified” label: `self_reported`, `platform_recorded`, `mentor_reviewed`, `organization_accepted`, and `organization_identity_checked` where individually applicable.
4. Student previews and chooses shareable evidence; confidential/unconsented files remain inaccessible.
5. System provides revocable, expiring (if configured), permission-controlled share link or public-safe passport view.
6. Recruiter sees only allowed content, verification explanations and limitations; link can be revoked.

**Exceptions:** organization disputes prior approval, assessment corrected, evidence removed, link expired, recruiter attempts direct object access, copyrighted/confidential artifact not shareable. Corrections are versioned and displayed appropriately; do not silently delete historical evidence.

**Acceptance checks:** a self-submitted GitHub link alone must **not** display “organization verified”; a revoked link no longer reveals restricted evidence; passport shows partial or disputed status when relevant.

### 4.6 Workflow F — Dispute, cancellation, and withdrawal

1. Student, organization, or mentor creates a report referencing a specific project/participation/event.
2. Platform timestamps it, restricts visibility to responsible parties, and acknowledges receipt.
3. Admin triages severity and can pause project activity, remove public material, or restrict access when necessary.
4. Parties submit supporting evidence under controlled access; admin documents a resolution, escalation, or referral.
5. Financial disputes retain both parties' payment assertions; platform must not claim payment guaranteed if not processing funds.
6. Passport represents the outcome truthfully: accepted, partially completed, withdrawn, cancelled, under dispute, or revoked where warranted.

**Exceptions:** serious safety reports, retaliation, suspected fraud, confidential leakage, no response from organization, unlawful work. Certain cases require human review and potentially external professional authorities, not automated dismissal.

**Acceptance checks:** withdrawal does not erase historical facts or earned compensation obligations; retaliation reports cannot be exposed publicly; admins cannot quietly edit mentor scores without an amendment trail.

### 4.7 Workflow G — Restricted organization or mentor

1. Admin flags an organization or mentor due to suspected fraud, failed verification, or other policy concerns.
2. A restriction policy determines whether new postings, selection, or reviews are suspended.
3. Existing students receive an appropriately worded notice; confidential report information is not unnecessarily disclosed.
4. Active projects are reviewed for continuity, safe termination and payment obligations.
5. Prior passport records are not simply deleted; verified facts, disputed assertions and corrections remain distinguishable.

---

## 5. Initial requirements catalog — testable product behaviors

**Priority codes:** `P0` = essential end-to-end release; `P1` = needed before wider public onboarding; `P2` = later/conditional. **Status for every row:** PROPOSED; requires team approval and product validation.

| ID | Priority | Requirement | Minimum acceptance criterion |
|---|---|---|---|
| AUTH-001 | P0 | Authenticated user identity | Protected API rejects anonymous requests; server resolves actor identity |
| AUTH-002 | P0 | Resource-scoped authorization | Users cannot access unrelated projects, applicants, files or reviews |
| ORG-001 | P0 | Organization profile and roles | Only authorized members can create or manage their org's projects |
| ORG-002 | P1 | Organization verification workflow | Only approved checks permit the verified indicator; admin decision audited |
| PROJ-001 | P0 | Complete project brief | Invalid/missing core fields cannot progress to publishing |
| PROJ-002 | P0 | Compensation and unpaid policy validation | Unpaid-commercial classification rejected; terms visible to applicants |
| PROJ-003 | P0 | Controlled publish workflow | Project must pass review and valid state transition before discovery |
| APP-001 | P0 | Student applications | One active application per student/project unless policy permits reapplication |
| APP-002 | P0 | Offers and student consent | Student accepts exact current terms before participation becomes active |
| WORK-001 | P0 | Milestone management | Only assigned members may access workspace and permitted milestones |
| WORK-002 | P0 | Evidence submission | Submission stores uploader, project, version, time and private artifact reference |
| MENT-001 | P0 | Mentor assignment | Only confirmed assigned mentors may review corresponding work |
| MENT-002 | P0 | Assessment records | Review stores author, rubric version, observations, timestamp and evidence references |
| REVIEW-001 | P0 | Organization acceptance | Authorized org reviewer accepts/revises/rejects with traceable reason |
| PASS-001 | P0 | Evidence-based passport | Shows exact asserted/reviewed/accepted statuses; no blanket verification |
| PASS-002 | P1 | Permissioned sharing | Revocation blocks access and private artifacts never leak through public view |
| ADMIN-001 | P0 | Basic admin moderation | Moderation decisions authorized, reasoned and audited |
| SAFE-001 | P0 | Incident reporting | Participants can report harmful conduct or inappropriate project conditions |
| PAY-001 | P0 | Transparent terms and status | Amount/rate or GHS 0 displayed, accepted terms version stored |
| PAY-002 | P1 | Payment acknowledgment and dispute states | Status distinguishes reports from recipient-confirmed receipt |
| NTF-001 | P1 | Transaction notifications | Key transitions notify affected parties without leaking private data |
| AUDIT-001 | P0 | Append-only audit events | Important role, project, review and passport status changes have actor/time |
| PRIV-001 | P0 | Confidential evidence protection | Unauthorized actor cannot download another project's artifact |
| MOB-001 | P1 | Responsive, low-bandwidth UX | Core workflows usable on common phone dimensions and weak connection |
| REC-001 | P1 | Recruiter passport verification | Recruiter sees only permitted attributes and verification explanations |
| ANAL-001 | P2 | Organization and project analytics | Metrics accurately distinguish started, completed, accepted, paid and disputed |
| MATCH-001 | P2 | Matching recommendations | Eligibility/matching logic transparent, testable and non-discriminatory |
| PAY-003 | P2 | Integrated provider payments | Only after separate financial architecture and compliance approval |

### 5.1 Cross-cutting requirements [PROPOSED]

- **SEC-001:** enforce permissions in backend (not just hiding frontend buttons).
- **SEC-002:** prevent broken object-level authorization, mass assignment and insecure direct file access.
- **SEC-003:** apply rate limits, input validation, secure upload restrictions, malware scanning strategy and secure session handling.
- **PRIV-002:** define data retention, deletion/correction processes, consent/disclosure management and privacy notices before production onboarding.
- **OBS-001:** log request failures, workflow transitions and security-relevant events without writing confidential payloads or secrets to logs.
- **REL-001:** implement backups, migration rollback or recovery plans, safe deployments and staging/production separation.
- **QUAL-001:** core workflows must have automated success, rejection, unauthorized-access and state-transition tests.
- **ACC-001:** design semantic controls, keyboard access, understandable validation errors, readable contrast and mobile layouts.
- **AIA-001:** AI-assisted features and agents must not silently invent reviews, verification events, factual work history or payment settlement.

---

## 6. Preliminary lifecycle/state definitions [PROPOSED — align with API document]

**Organization:** `submitted → under_review → verified | rejected | changes_requested`; later `restricted`.  
**Project:** `draft → pending_review → changes_requested | rejected | open → closed_to_applications → in_progress → completed`, or `cancelled` with reason from permissible points.  
**Application:** `submitted → under_review → shortlisted | rejected | offered | withdrawn`; `offered → accepted | declined | expired`.  
**Participation:** `pending_terms → active → under_review → completed | partially_completed | withdrawn | cancelled | disputed`.  
**Submission:** `draft → submitted → mentor_reviewed → organization_accepted | revision_requested | rejected`; later versions retain original records.  
**Payment record:** `not_applicable_unpaid | not_due | due | organization_reported_paid | student_confirmed_received | disputed` (not an escrow ledger).  
**Passport evidence assertion:** `self_reported | platform_recorded | mentor_reviewed | organization_accepted | disputed | corrected | revoked`.

These are conceptual **states**, not final SQL enums. Some are better represented as independent attributes/events rather than one mutable field. The architecture/API documents will resolve that. In particular, *organization identity verification* is a separate dimension from *project deliverable acceptance*.

---

## 7. Roles and journeys at a glance

| Journey | Student | Organization | Mentor | Admin | Recruiter |
|---|---|---|---|---|---|
| Organization verification | — | Submit documentation | — | Review | See truthful verification indicator |
| Project posting | Browse | Draft and submit | May advise | Moderate | — |
| Application/selection | Apply/accept | Shortlist/offer | — | Resolve abuse reports | — |
| Project execution | Work/submit | Provide brief/check-ins | Guide/review | Support escalation | — |
| Final evaluation | View feedback | Accept/request changes | Assess observed skills | Dispute oversight | — |
| Experience Passport | Preview/share/revoke | Approve factual output where authorized | Review observations | Handle corrections | View permitted evidence |
| Payment | View agreed terms/report receipt | Pay externally and report | — | Manage platform disputes, not guarantee funds | — |

---

## 8. Pilot and validation requirements

### 8.1 Evidence status as of 25 Oct 2026

JAMS has a concept, secondary research and an interactive demonstration. The team has **not documented a completed primary employer pilot, validated mentor supply, established recruiter trust, or real customer adoption** in the evidence available for this PRD. The project workflow and trust mechanism remain hypotheses until tested.

### 8.2 Smallest useful pilot [PROPOSED]

Recruit **one real organization**, **one accountable organization reviewer**, **one suitable mentor**, and **one student or a very small team** for one non-sensitive, limited-scope project. Obtain written terms (including compensation classification), consent and safety arrangements. Track work and outcomes with the platform; fall back to documented manual operations only when necessary, clearly distinguishing manual records.

**Pilot measurements (define targets after feasibility checks):**

| Measure | Operational definition |
|---|---|
| Organization posting time | Time from starting brief to publishable approved project |
| Student application completion | Share of eligible starters who submit a valid application |
| Mentor effort | Recorded hours spent on check-ins, review and follow-ups |
| On-time milestone rate | Share of agreed milestones submitted by agreed dates |
| Organization usefulness | Written acceptance decision and specific feedback about the deliverable |
| Fair work & payment | Disclosure comprehension, expense burden, compensation paid/received or dispute |
| Passport evidence quality | Ability to trace every claim to records and permissions |
| Recruiter interpretation | Qualitative feedback from a recruiter on whether the record changes evaluation; do not count if no recruiter participates |
| Safety incidents | Reported issues, response time and resolution (not an assertion that absence of reports proves safety) |

Do not publish purported interview quotes, recruiter endorsements, adoption rates, pilot impact, or completed payments without source records.

### 8.3 Interview questions [PROPOSED]

- **Organizations:** What bounded project would you actually post? Who reviews? What budget and supervision time? What would make participation not worthwhile?
- **Students:** Which skills could you demonstrate today? What hours and expenses can you afford? What would make unpaid work unacceptable? What evidence would you want to share?
- **Mentors:** What workload, rubric and incentives are realistic? Which review claims can you personally substantiate?
- **Recruiters:** Which artifacts would make you more confident? What concerns would invalidate the passport? How does it compare with projects on CVs and GitHub?

---

## 9. Nonfunctional acceptance expectations [PROPOSED, TARGETS TBD]

- **Security/privacy:** no known critical authorization issue before opening real user records; confidential evidence private by default; audit events for materially consequential actions; Ghana Act 843 compliance review.
- **Usability:** core application and review flows work at common mobile sizes; errors and compensation labels are unambiguous.
- **Reliability:** data persists across deployments; database backups and restore test for production; safe migration procedure.
- **Performance:** set measurable page, API and upload budgets using realistic Ghana mobile networks before general release rather than inventing SLAs now.
- **Accessibility:** follow WCAG-aligned basics and perform keyboard/mobile testing; select target conformance level in UI specification.
- **Maintainability:** documented API contracts, modular boundaries, CI tests and required peer review; architecture decisions recorded.
- **Data governance:** personal-data inventory, legal basis, privacy notice, retention schedule and regulator requirements reviewed before launch.

---

## 10. Scope and staged delivery

### 10.1 BUILD demonstration — minimal **real** vertical slice [PROPOSED]

1. Authentication and correct user/project permissions (basic).
2. Organization registers (admin may manually verify) and creates an approved project.
3. Student discovers, applies and accepts disclosed terms.
4. Organization selects participant; workspace and milestone appear.
5. Student submits evidence; mentor reviews; organization records acceptance/revision.
6. Passport displays **traceable review status** and safe view of accepted work.
7. Reporting and manual admin handling for major issues.

**Must not fake:** external organization partnership, reviewer identity, mentor review, completed payment, public endorsement, recruiter trust. Use explicitly labeled demo records when real actors or evidence are not available.

### 10.2 Wider production release [PROPOSED]

Complete organization roles, account recovery, full project and participation lifecycle, private evidence management, dispute handling, versioned agreements, payment status, mentor availability management, audit/revocation, notification reliability, security hardening, analytics baseline and privacy/legal readiness.

### 10.3 Future conditional scope [VALIDATE]

Recruiter marketplace/search, advanced matching, automated recommendations, integrated payments, sponsored programs, institutional dashboards, skill taxonomies, employer integrations, paid subscriptions and cross-border participation. Each requires evidence of demand, economics and additional safeguarding/compliance work.

---

## 11. Open decisions, owners and approval gates

| ID | Decision to resolve | Why it matters | Proposed owner | Release gate |
|---|---|---|---|---|
| DEC-001 | Exact first target skill area and pilot organization | Determines scope and recruitability | Product lead + outreach | Before pilot |
| DEC-002 | Specific legal treatment of paid project work vs volunteering | Avoid labor-law violations or exploitation | Product lead + Ghana counsel | Before real paid/unpaid operation |
| DEC-003 | Whether/how employment-agency regulation applies | Platform may introduce workers to organizations | Product lead + Ghana counsel | Before production launch |
| DEC-004 | First-project maximum hours, duration, eligibility and supervision policy | Prevent unbounded work and mentor overcommitment | Product + mentor + pilot organization | Before pilot |
| DEC-005 | Default IP ownership and license for deliverables; ability to include portfolio excerpts | Controls rights and passport content | Product + organization + counsel | Before signed project |
| DEC-006 | Data protection registration, lawful basis, notices, retention and cross-border hosting review | Legality and user trust | Privacy owner + counsel | Before real-data launch |
| DEC-007 | Organization verification checklist, evidence retention and appeal process | Meaning of “verified” | Operations/admin owner | Before verified indicator |
| DEC-008 | Mentor vetting, incentives, conflict-of-interest rules and replacement | Review quality and feasibility | Mentor operations owner | Before mentor claims |
| DEC-009 | Whether project teams are supported from day one | Changes attribution and assessment | Product + engineering leads | Before schema freeze |
| DEC-010 | Exact passport public/private model, consent and revocation semantics | Privacy and recruiter use | Product + engineering + legal | Before sharing |
| DEC-011 | Authentication and API stack selection | Infrastructure, hiring and maintenance | Technical lead | Before coding shared foundation |
| DEC-012 | First version of project/application/participation state machine | Avoid inconsistent AI-generated code | All 4 developers, approved by tech lead | Before API contracts |
| DEC-013 | Pilot success criteria and data collection plan | Avoid post-hoc success claims | Product lead + mentor | Before pilot starts |
| DEC-014 | Pricing, payment provider and platform liability | Monetization and trust | Business lead + counsel | Later; before payment integration |

**Change-control requirement:** once an item becomes **approved**, the owner records decision date, alternatives considered and reason in `docs/decisions/`. A change affecting a signed project must not retroactively change the terms without the required consents.

---

## 12. Draft approval checklist

- [ ] JAMS reviews the vision and chosen first target segment.
- [ ] Team ratifies paid/unpaid categories, initial bans and participant safeguards.
- [ ] One organization, student and mentor assess whether the proposed workflow is understandable and feasible.
- [ ] Ghana legal/privacy reviewer evaluates labor classification, data-protection and platform operation questions before real onboarding.
- [ ] Team resolves minimum state machines and conflicting role permissions.
- [ ] PRD requirements receive initial issue owners and acceptance tests.
- [ ] Architecture and API specification incorporate approved decisions.
- [ ] Every AI coding agent is directed to this PRD and prohibited from inventing unanswered policy decisions.

---

## 13. Sources, background, and cautions

**JAMS evidence and context:** JAMS / XANIX Supporting Evidence and wider “Experience Trap” research. Original internal research library: <https://docs.google.com/document/d/14WRVM6_PEiNFKdcsme4U5tNIJAocWw_VWKMTxnvCWcg/edit>. Supporting evidence: <https://docs.google.com/document/d/1ncIUDO6OpzUAzQXDB9b3sGZC4YhTTv9xs0Gw67xr4h0/edit>. These are background research materials, **not proof of adoption**.

**Official/public legal references (reviewed 25 Oct 2026):**

- Ghana Labour Act, 2003 (Act 651): <https://www.melr.gov.gh/files/publications/Labour_Act_-_2003.pdf> and <https://ghalii.org/akn/gh/act/2003/651/eng%402003-10-10>.
- Ghana Data Protection Commission, *For Organisations*: <https://dpc.gov.gh/for-organisations/>.
- Ghana Data Protection Commission, *Compliance with Act 843*: <https://dpc.gov.gh/compliance/>.

**Interpretation caution:** These sources support a need for compliance and safeguards. They **do not establish** that all volunteer/educational arrangements are lawful in every context, or that the platform is exempt from employment/recruitment rules. Obtain qualified local advice on actual operations.

---

## 14. Next drafting tasks for PRD v0.2

1. Ratify `DEC-001` through `DEC-013` that block implementation.
2. Expand each `P0` requirement into a numbered user story with Given/When/Then acceptance tests.
3. Model role-by-resource permission matrix, compensation agreement and evidence disclosure consent precisely.
4. Complete annotated screen-by-screen forms and error states in the UI/UX specification.
5. Synchronize real API schemas and migrations with the database/API specification; automated contract tests are authoritative over narrative guesses.
6. Attach issue owners and milestone numbers, and update this PRD whenever a policy requirement changes.

**End of initial PRD draft — not yet signed off or production-ready.**
