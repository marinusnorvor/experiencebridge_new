# ExperienceBridge backend contracts — B01 proposal

**Status: PROPOSED — NOT APPROVED FOR IMPLEMENTATION OR REAL-USER ONBOARDING**

**Date:** 2026-10-31 · **Branch inspected:** `lib` · **Task:** B01, following B00

**Authoring scope:** this document only. No runtime, frontend, migration, approved contract, or ADR changes.

**Decision owner:** project owner/shared backend lead; independent reviewers: Student, Organization, Mentor, and Admin owners, to be named before implementation.

## 1. Purpose, authority, and preserved baseline

This is a concrete recommendation for one interoperable workflow:

Organization drafts project → Admin publishes → Student applies → Organization offers → Student accepts exact terms → Mentor accepts assignment → project starts → Student submits an individual contribution → Mentor assesses → Organization accepts the deliverable → participation is finalized → source-backed private experience is recorded.

All new rules below are proposed. Choosing a recommendation in this document does not approve it, amend another specification, or authorize another developer's frontend changes. Section 13 contains the approval register. An approved subset must be identified by decision IDs before B02. No external issue or review request has been created.

### 1.1 Sources and traceability

- [AGENTS.md](../../AGENTS.md): authorization, independent evidence claims, privacy, synthetic labeling, audit, ownership, and human approval.
- [Database/API specification](../03-database-api.md): §§3–10 entities, permissions, lifecycles, routes, validation, transactions; §§13–15 ownership and unresolved refinements.
- [PRD](../01-product-requirements.md): §4 journeys; `AUTH-002`, `ORG-001/002`, `PROJ-001/002/003`, `APP-001/002`, `WORK-001/002`, `MENT-001/002`, `REVIEW-001`, `PASS-001`, `ADMIN-001`, `SAFE-001`, `PAY-001`, `NTF-001`, `AUDIT-001`, `PRIV-001`, `QUAL-001`.
- [Architecture](../02-system-architecture.md): modular monolith, scoped authorization, private evidence, transactional outbox. [UI specification](../04-ui-ux.md): Student §6, Organization §7, Mentor §8, Admin §9.
- [Roadmap](../05-development-roadmap.md) and [engineering standards](../06-engineering-standards.md): phased delivery, testing and independent review.
- Approved [ADR-002](../decisions/ADR-002-clerk-authentication.md) and [ADR-011](../decisions/ADR-011-vercel-git-deployment.md). ADR-001/009 are referenced by the documents, but separate files were not present in the inspected ADR directory. ADR-003/004/005/006/007/008/010 product decisions are not inferred approved.
- Actual [Student types](../../apps/web/features/student/lib/types.ts), [offer acceptance](../../apps/web/features/student/components/student-application-detail-view.tsx), [submission handler](../../apps/web/features/student/components/student-participation-workspace-view.tsx), [Organization types](../../apps/web/features/organization/types/portal.ts), [Organization transitions](../../apps/web/features/organization/lib/demo-transitions.ts), [Organization integration gaps](../../apps/web/features/organization/API_INTEGRATION_GAPS.md), [Mentor data](../../apps/web/features/mentor/lib/sample-dashboard-data.ts), and [Admin placeholder](<../../apps/web/app/(portals)/admin/dashboard/page.tsx>).

Organization screen identifiers conflict between its feature specification and Document 4. This proposal identifies integrations by actual route/capability, not by silently renumbering screen IDs.

### 1.2 Preserve C-01 and identity

Keep Clerk Bearer JWT/JWKS verification, `(identity_issuer, identity_subject)` mapping, internal UUIDs, `users`, `user_role_grants`, account suspension handling, and the existing `GET /api/v1/me` response unchanged. Its fields remain `id`, `identity_issuer`, `identity_subject`, `display_name`, `email`, `email_verified_at`, `account_status`, `role_grants`, `effective_contexts`, `created_at`, `updated_at`, `row_version`. Preserve `/health` and the existing error envelope.

Do not add an `organization` global role. Active organization memberships will supply the already-declared `organization` effective context. `mentor_candidate` allows the Mentor context; it does not establish eligibility or an accepted assignment. Contexts and UI action hints are not authorization checks.

No self-service global-role grant endpoint is proposed. Initial BUILD actors/grants are controlled, audited synthetic fixtures. Real student enrollment and organization-creator eligibility require the onboarding policy in D11. No `/me` profile mutation is introduced: business profile fields live in separate resources; identity contact/verification remains Clerk-owned.

### 1.3 Architecture and scope

Reuse the existing FastAPI application, SQLAlchemy sessions, Alembic history, error handlers, domain packages, and `@experiencebridge/api-client`. Add thin routers, typed request/response models, explicit domain services, and shared resource-permission predicates inside the existing modular monolith. No new service, provider, library, or deployment controller is selected.

The `applications` module owns applications, offers and participations; `projects` owns terms, milestones, progress and discussions; `mentorship` owns eligibility and assignments; `assessments` owns both separately attributed review types; `passports` owns private source projections; `organizations` owns memberships. Administration invokes these domain services with admin predicates; it does not bypass invariants. Shared audit/outbox/idempotency primitives support all domains.

Delivery tiers: **Core** is the complete consent-to-review workflow and its safety/authorization controls; **Portal** completes profiles, discussions, notifications and dashboards; **Deferred** is private binary uploads, external invitation delivery, public passport sharing, payment assertions/integration, complex teams and post-publication scope amendments. Deferred features must remain explicitly unavailable or synthetic until separately implemented. This is not a promise that the full Core fits the BUILD deadline.

## 2. Explicit B00 reconciliation

| Conflict / observed source | Recommended canonical rule | Consequence after approval; no frontend change in B01 |
|---|---|---|
| Student application `accepted`; Organization `Accepted/Declined`; Document 3 separates offers | Application retains `offered`; nested latest offer carries accepted/declined/expired/revoked; participation is separate | Frontends display a derived selection outcome, never PATCH application to accepted |
| Student permits reapplication after withdrawal; Document 3 §3.3/§14.1 proposes one ever | One application per student/project; no resubmission after withdrawal/rejection in Core | Preserve history, show terminal explanation; deliberate change to Student behavior (D02) |
| Document 3 limits one offer per application; expired offer UX implies another offer | Allow sequential replacement offers after decline/expiry/revocation; one live offer and at most one accepted offer per application | Drop proposed unconditional unique application FK on offers; preserve each offer and consent (D02) |
| Student acceptance auto-assigns accepted mentor | Acceptance creates participation with no mentor; named mentor must accept separate proposal | No hard-coded mentor identity/consent (D03) |
| Organization invitations are project-scoped; Document 3 assignments are participation-scoped | Invitation is the `proposed` phase of a participation-scoped assignment, with expiry | UI must select a participant; project team view groups assignments (D03/D04) |
| Organization Team UI vs Document 3 solo-first/P2 teams | Multiple students on a shared project, each with separate consent, milestones, contribution and reviews; no collective submission | Supports a project cohort without inherited endorsements; named subteams/coauthored submissions deferred (D04) |
| Student marks milestone/participation complete on submission; Organization has editable `done` | Separate reported progress from assessed completion; completion is derived from current evidence and reviews | Progress checkbox becomes a report only; completion cannot be client-set (D05/D06) |
| Student generic review `approved`; PRD §6 collapses review states into submission | Keep separate mentor and organization decisions on exact submission revisions | No fabricated pending review rows, timestamps or automated-check claims (D05) |
| Document 3 §3.4 permits differing mentor/org findings; §5.5 recommends mentor first | Any recorded current mentor decision precedes org acceptance; only mentor `reviewed` plus org `accepted` qualifies for fully verified completion | Org may accept despite adverse mentor findings, but no completed verified experience from that pair (D05/D06) |
| Organization `Published/Recruiting/Active/Closed` and archive button | Canonical `open/in_progress/completed/cancelled`; no archive lifecycle mutation | Published/Recruiting both project `open`; archival display is not cancellation or completion (D01) |
| Document 3 supports material amendments but no complete re-consent flow | Freeze published scope/terms/milestones in Core; reject material edits | No silent overwrite, forced replacement project, or cancellation workaround; later amendment contract required (D01) |
| Organization reviews lock forever; draft API supports rejection/supersession | Add `rejected`; original authors can append reasoned corrections; preserve old records | Correction UI and new revisions are distinct actions (D05) |
| Browser strings/names as members, authors, dates and fees | Internal UUID relationships, server UTC times, decimal strings; server-derived actor | Explicit adapters replace presentation models when integrations are assigned |
| Passport “cryptographic/verified” fixture claims | Separate attributable evidence facts; hashes prove snapshot consistency only | Never imply signature, employer identity check, payment, or transferable skill certification (D06) |
| Organization local events also act as notifications/read markers | Append-only audit; separate per-recipient notifications and conversation read cursors | Reading a message cannot alter audit history (D09) |
| Admin only placeholder | Minimal verification/publication/eligibility and case queues required before real workflow | Admin frontend integration is a separate owner task, not simulated automatic approval |
| Older documents prescribe Actions deployment; approved ADR-011 selects Vercel Git | Preserve ADR-011; documentation reconciliation remains separately assigned | No deployment change or second controller introduced |

## 3. Canonical entities and relationships

These are logical definitions, not SQL or migration authorization. New entities use server UUID PKs and UTC `created_at`. Mutable aggregates also use `updated_at` and positive integer `row_version`; immutable facts never accept in-place content edits. Child rows inherit tenant and synthetic provenance from their authoritative parent. `data_origin = synthetic | real` is server-controlled, not a request field. BUILD fixtures and all derived assertions remain synthetic. Existing identity tables are unchanged.

`FK` means enforced foreign key; `UQ` means database uniqueness. Cross-parent equality must use composite constraints where possible plus transactional service checks. No cascade deletion of consent, reviews, evidence history or audit; retention/deletion needs a separately approved process.

| Entity | Required relationships, business fields and invariants |
|---|---|
| `student_profiles` | UQ user FK; headline, biography, institution, program, graduation year, availability, domains, portfolio links, bounded self-reported skills/projects. Assessed skills and verification are projections, not editable fields |
| `organizations` | Creator user FK; legal/display names, description, contact email, country, website, representative; verification status and current verification-review FK; provenance |
| `organization_memberships` | Organization/user FKs; one row per role `owner/project_manager/reviewer`; `active/suspended/removed`; partial UQ organization/user/role for active or suspended. Membership invitations are separate; at least one active owner |
| `organization_invitations` | Organization, inviter, existing intended user FKs; roles limited to project_manager/reviewer; `pending/accepted/declined/revoked/expired`, expires_at. Core invitations target registered users by UUID, never arbitrary email matching; UQ pending org/user. Owner grants not self-service |
| `organization_verification_reviews` | Organization/admin FKs; profile row version, immutable checklist version/results, decision/reason, private evidence references. No fake verification from completeness |
| `mentor_profiles` | UQ user FK; bio/skills/availability, weekly review capacity, opt-in directory flag; eligibility `pending/approved/rejected/suspended`, current eligibility-decision FK |
| `mentor_eligibility_decisions` | Mentor/admin FKs; immutable policy version, checklist results, approve/reject/suspend decision and reason; account grant and eligibility remain separate |
| `projects` | Organization, creator, manager and reviewer user FKs; brief, skills, dates, capacity, visibility, risk classification; lifecycle; draft/submitted/published terms-version pointers, publication snapshot hash; published_at and completed_at. One manager and one reviewer initially; both must hold active matching membership, owner may be manager |
| `project_terms_versions` | Project FK, UQ project/version_no; immutable complete brief/compensation/IP/confidentiality/mentor-plan/milestone snapshot, schema_version, SHA-256 content_hash, author. Approval is separate moderation fact, not hash proof |
| `project_moderation_decisions` | Project/admin/terms-version FKs, frozen snapshot hash, approve/request_changes/reject/suspend/restore, checklist version/results, reason; immutable |
| `milestones` | Project FK; UQ project/sequence_no; title/description, criterion IDs/text, required flag, due_at, `planned/active/archived`; IDs and complete definitions frozen in published terms |
| `applications` | Project/student/seen-terms FKs, UQ project/student; motivation, declared skills, external links, availability snapshot, status; rejection/withdrawal reason and timeline derived from audit |
| `offers` | Application/project/student/terms FKs, expiry, `offered/accepted/declined/expired/revoked`; issuer. Multiple historical rows allowed; partial UQ application where status=offered, and where status=accepted. Lazy expiry is reconciled under lock before creating a replacement |
| `terms_acceptances` | Offer/student/terms/participation FKs, exact hash, immutable consent statement version, timestamp; UQ offer/student/terms. Participation and acceptance written in one transaction; no committed orphan consent |
| `participations` | Project/student/offer/accepted-terms FKs; UQ offer; UQ project/student; lifecycle, requested_outcome, ready_at, started_at, completed_at. No client creation endpoint |
| `participation_milestones` | Participation/milestone FKs; UQ pair; frozen criterion snapshot from accepted terms, latest submitted revision FK, current draft FK. Every published required milestone applies to every participant in Core; no retroactive assignment edits |
| `progress_reports` | Project FK, optional participation/milestone FKs, author user FK and author capacity; narrative, reported_status `not_started/in_progress/blocked/done`, blocker, optional supersedes FK. Append-only self/manager reports, never acceptance facts |
| `mentor_assignments` | Participation/mentor/proposer FKs; proposal context, expiry, status, consent time, conflict declaration, end reason. Partial UQ participation where status in proposed/accepted/suspended; ended/declined/expired may be replaced |
| `submissions` | Participation/milestone/student FKs; UQ participation/milestone/revision_no; summary, contribution_statement, artifact references, draft/submitted/revision_requested/withdrawn; supersedes submission FK; submitted_at. Content immutable after submit; lifecycle metadata can change through commands |
| `artifacts` | Submission/creator FKs; external_url or text_excerpt in Core, label/content, `access_class=private`, `safety_status=not_scanned`. No binary upload, automatic remote fetch, scan claim or sharing grant |
| `rubric_versions` | Immutable version/code and criterion IDs/descriptions, allowed integer score range, evidence requirements; approved by named reviewer, provenance. Synthetic rubric in BUILD; no arbitrary client-defined rubric |
| `mentor_reviews` | Submission/accepted-assignment/author/rubric FKs; `reviewed/revision_requested/unable_to_assess`, criterion observations/scores, participant feedback, manager-safe summary; supersedes review FK + correction reason. Immutable |
| `organization_reviews` | Submission/project/reviewer FKs; `accepted/revisions_requested/rejected`, criterion results, explanation; supersedes review FK + reason. Immutable |
| `mentor_review_evidence`, `organization_review_evidence` | Typed review/artifact FKs, criterion ID and explanation; UQ review/artifact/criterion. Artifacts must belong to that exact submission; no polymorphic FK |
| `submission_review_heads` | UQ submission FK; nullable current mentor-review and org-review FKs; row_version. Serializes each review stream and prevents two unacknowledged current decisions |
| `participation_outcomes` | Participation/author FKs, requested/final outcome, reason, exact qualifying submission/review IDs, completion policy version, supersedes FK when invalidated; immutable outcome snapshot |
| `passport_assertions` | Participation FK; typed nullable source FKs to submission, mentor review, organization review, verification review or outcome; exactly one primary source. Claim type, source-based status, source revision, provenance; UQ source/type/version; supersedes FK. No student write API |
| `reports`, `moderation_actions` | Reporter/admin and typed target FKs; private case category/severity/details/status, assigned_admin_user_id; actions hold/release/restrict/resolve/escalate/invalidate_source with reason. Holds reference case+target and preserve underlying lifecycle; source invalidation uses typed mentor_review/organization_review/outcome FKs and never changes source authorship |
| `project_messages` | Project/author FKs; plain text, message kind discussion/update, monotonic project sequence; no evidence attachment sharing in this resource |
| `conversation_read_states` | UQ project/user; last_read_sequence. Read marker advances monotonically only through authorized messages |
| `notifications` | Recipient/source-event FKs, type, safe entity reference, created_at/read_at; UQ recipient/source-event/type. No free-form confidential content copied into previews |
| `notification_preferences` | UQ user; digest preference and in-app optional-event preferences. Security/consent notices cannot be disabled; email digest is unavailable until delivery contract approved |
| `audit_events`, `outbox_events`, `idempotency_records` | Reuse Document 3 §3.6 semantics with §10 refinements; attributed, minimal, durable. Idempotency scope includes concrete resource path, not only route template |

Relationship spine: organization → project → application → offer → participation → participation milestone → submission revision → independent review streams → private passport sources. A project has many participations; a mentor assignment has exactly one participation. The same mentor may accept several independent assignments. A shared artifact URL never proves another student's contribution.

## 4. Transport and DTO contract

### 4.1 Common conventions

- Prefix all product routes with `/api/v1`; `:id`, `:org_id` are UUIDs. Success bodies are direct DTOs, not a new `data` envelope. Creation is 201; reads/updates/commands are 200 unless the endpoint table says otherwise. No implicit 202 background acceptance for a committed command.
- UUIDs and timestamps are strings on the wire; UTC timestamps use RFC3339 `Z`; calendar dates use `YYYY-MM-DD`. Money is a decimal string with two fractional digits. Durations are integer minutes. Server supplies actor, tenant, time, sequence, provenance, verification and state.
- Request objects reject unknown fields. `?` below means optional; `T|null` explicitly permits null. PATCH uses a dedicated allowlist: omitted means unchanged, null only clears nullable fields. No request accepts status, actor IDs, owner student ID, created_at, hash generation, or verification fields unless explicitly listed for that command.
- `Page<T> = {items:T[], next_cursor:string|null}`. List input: `limit` default 20, 1–100; opaque cursor bound to actor/scope/filter/sort. Default `(created_at DESC,id DESC)`; timelines/messages ascending sequence; milestones ascending sequence_no. Unknown filters/sorts return 422. No cross-tenant totals.
- Private responses use `Cache-Control: no-store, private`. Mutable single-resource reads return `ETag: "<row_version>"`. Command response includes the resulting aggregate version. For new immutable facts, `aggregate_version` identifies the updated parent rather than falsely presenting the immutable fact as mutable.
- `If-Match` is mandatory for PATCH and state-changing POST against an existing aggregate. Missing → 428 `PRECONDITION_REQUIRED`; mismatch → 412 `STALE_VERSION`. Creation under a parent uses its ETag when explicitly marked in §7; list pagination and read markers do not require ETags. Child-resource detail responses expose required parent tokens as `preconditions:{project?:string, participation?:string, submission?:string}`.
- All business POST commands and creates require `Idempotency-Key` (opaque 16–128 ASCII characters); GET/PATCH do not. Notification/read-cursor commands are intrinsically idempotent and exempt. Authorization always runs again before replay.

### 4.2 Request DTO dictionary

Notation: `UUID`, `Instant`, `Date`, `Decimal`, `Text`, `Bool`, `Int`, `Enum` are primitives subject to §9; references are named DTOs below. `Empty` is `{}`. Read-only values never enter create/patch bodies.

```text
Empty = {}
Reason = {reason_code:Text, explanation:Text, case_id?:UUID}
Link = {label:Text, url:Text}
CriterionInput = {text:Text}                         # server assigns stable criterion UUID
CriterionResult = {criterion_id:UUID, met:Bool, explanation:Text, artifact_ids:UUID[]}
StudentProfileWrite = {headline:Text, bio:Text, institution:Text, program:Text,
  graduation_year:Int|null, weekly_minutes_available:Int, preferred_domains:Text[],
  links:Link[], self_reported_skills:{name:Text, level:beginner|intermediate|advanced,
  context:Text}[], self_reported_projects:{title:Text, contribution:Text, links:Link[]}[]}
MentorProfileWrite = {bio:Text, skills:Text[], availability_text:Text,
  weekly_review_capacity:Int, directory_opt_in:Bool}
OrganizationCreate = {legal_name:Text, display_name:Text, description:Text,
  contact_email:Text, country_code:Text, website_url:Text|null, representative_name:Text}
OrganizationPatch = partial OrganizationCreate       # no status; verified identity fields locked
InvitationCreate = {invitee_user_id:UUID, roles:(project_manager|reviewer)[], expires_at:Instant}
MembershipCommand = Reason
ProjectCreate = {title:Text}                           # other draft fields may be incomplete
ProjectPatch = {title?:Text, problem_statement?:Text, audience?:Text, scope_in?:Text,
  scope_out?:Text, outcome?:Text, deliverables?:Text[], skills_required?:Text[],
  difficulty?:beginner|intermediate|advanced, estimated_minutes?:Int,
  weekly_minutes?:Int, start_on?:Date, due_on?:Date, capacity?:Int,
  eligibility_description?:Text, visibility?:public|limited, work_location?:Text}
ProjectAuthorities = {project_manager_user_id:UUID, org_reviewer_user_id:UUID, reason:Reason}
TermsCreate = {compensation_type:paid_fixed|paid_time|sponsored_learning|volunteer_community,
  currency:Text, fee_amount:Decimal|null, hourly_rate:Decimal|null,
  max_billable_minutes:Int|null, expense_policy:Text, payer_description:Text,
  due_schedule:{trigger:calendar_date|accepted_handover, date:Date|null, days_after:Int|null}[],
  learning_objectives:Text, mentor_plan:Text, ip_ownership_terms:Text,
  portfolio_rights_policy:Text, confidentiality_level:public_safe|restricted|confidential,
  terms_text:Text, rubric_version_id:UUID}
MilestoneCreate = {sequence_no:Int, title:Text, description:Text,
  acceptance_criteria:CriterionInput[], required:Bool, due_at:Instant}
MilestonePatch = {sequence_no?:Int, title?:Text, description?:Text, required?:Bool,
  due_at?:Instant, add_criteria?:CriterionInput[],
  edit_criteria?:{criterion_id:UUID, text:Text}[], remove_criterion_ids?:UUID[]}
SubmitProject = {terms_version_id:UUID}
ApplicationCreate = {seen_terms_version_id:UUID, motivation:Text,
  declared_skills:Text[], links:Link[], weekly_minutes_available:Int}
OfferCreate = {terms_version_id:UUID, expires_at:Instant}
OfferAccept = {terms_version_id:UUID, terms_hash:Text, explicitly_accepted:Bool,
  consent_statement_version:Text}                     # explicitly_accepted must be true
ReadyRequest = {requested_outcome:completed|partially_completed, explanation:Text}
FinalizeRequest = {outcome:completed|partially_completed, explanation:Text, case_id?:UUID}
AssignmentCreate = {mentor_user_id:UUID, context:Text, expires_at:Instant}
AssignmentAccept = {conflict_declared:Bool, confidentiality_acknowledged:Bool}
ProgressCreate = {participation_id?:UUID, milestone_id?:UUID,
  reported_status:not_started|in_progress|blocked|done, summary:Text,
  blocker:Text|null, supersedes_report_id?:UUID}
SubmissionCreate = {milestone_id:UUID, summary:Text, contribution_statement:Text}
SubmissionPatch = {summary?:Text, contribution_statement?:Text}
RevisionCreate = {summary:Text, contribution_statement:Text, reason:Text}
ArtifactCreate = {kind:external_url|text_excerpt, label:Text, url:Text|null, excerpt:Text|null}
MentorReviewCreate = {rubric_version_id:UUID, decision:reviewed|revision_requested|unable_to_assess,
  observations:{criterion_id:UUID, score:Int|null, observation:Text, artifact_ids:UUID[]}[],
  participant_feedback:Text, manager_summary:Text|null,
  supersedes_review_id?:UUID, correction_reason?:Text}
OrganizationReviewCreate = {decision:accepted|revisions_requested|rejected,
  criteria_results:CriterionResult[], explanation:Text,
  supersedes_review_id?:UUID, correction_reason?:Text}
OrganizationDecision = {decision:verify|request_changes|reject|restrict|restore,
  checklist_version:Text, checks:{code:Text, passed:Bool}[], reason:Reason}
ProjectDecision = {decision:approve|request_changes|reject|suspend|restore,
  terms_version_id:UUID, snapshot_hash:Text, checklist_version:Text,
  checks:{code:Text, passed:Bool}[], reason:Reason}
MentorEligibilityDecision = {decision:approve|reject|suspend,
  checklist_version:Text, checks:{code:Text, passed:Bool}[], reason:Reason}
ReportCreate = {project_id?:UUID, participation_id?:UUID,
  category:safety|unfair_work|nonpayment|harassment|confidentiality|fraud|other,
  severity:low|medium|high|urgent, details:Text}
CaseAction = {action:claim|triage|investigate|hold|release|resolve|escalate|invalidate_source,
  target_type?:project|participation|mentor_review|organization_review|participation_outcome,
  target_id?:UUID, reason:Reason}
MessageCreate = {kind:discussion|update, body:Text}
ConversationRead = {through_sequence:Int}
NotificationRead = {notification_ids:UUID[]}            # explicit IDs; no racy mark-all boolean
PreferencePatch = {digest_requested?:Bool, optional_in_app_events?:Text[]}
```

Profile writes are PUT replacements of editable fields only; derived evidence/eligibility is retained. Milestone PATCH uses existing criterion IDs for edits and new `CriterionInput` entries for additions; earlier draft snapshots retain their original definitions when current draft criteria change. Duplicate IDs or the same ID in edit and remove arrays are rejected. Patching a published definition is prohibited regardless of the supplied ETag.

### 4.3 Response DTO dictionary

`Entity = {id,created_at,data_origin}`. `Mutable = Entity + {updated_at,row_version}`. `CommandResult<T> = {resource:T,aggregate_version:Int}` only for fact-creating moderation/review commands explicitly returning it; other successes are direct DTOs. C-01 never inherits these additions. Nullable resources must return null, not invented placeholder people/decisions.

| DTO | Fields / composition and disclosure |
|---|---|
| `StudentProfile` | Mutable + editable profile fields + user_id, display_name from C-01, assessed_skills `{name,observation,mentor_review_id,participation_id}`, source-backed project references; own profile only |
| `MentorProfile` | Mutable + profile fields + user_id, eligibility_status, current decision ID, active_assignment_count; own detail |
| `MentorDirectoryItem` | user_id, display_name, skills, availability_text, eligibility_status, remaining_capacity advisory; only approved opted-in candidates, no email/evidence |
| `Organization` | Mutable + organization fields + verification_status, current verification-review ID, verified_at\|null, viewer_roles; private notes excluded |
| `OrganizationSummary` | id,display_name,verification_status,viewer_roles,data_origin |
| `Membership` | Mutable + organization_id,user_id,display_name,role,status,accepted_at,ended_at\|null |
| `Invitation` | Mutable + organization_id,invitee_user_id,roles,status,expires_at; no email invitation token |
| `Project` | Mutable + complete draft fields (incomplete values nullable), organization_id, assigned manager/reviewer IDs, status, on_hold, published_terms_version_id\|null, submitted_terms_version_id\|null, latest_terms_version_id\|null, published_at\|null, capacity_summary |
| `ProjectCard` | id,title,organization `{id,display_name,verification_status}`,skills,difficulty,dates,compensation summary,capacity_remaining,status,data_origin; public-safe fields only |
| `OrganizationProjectSummary` | id,title,status,row_version,dates,capacity_summary,assigned manager/reviewer IDs,data_origin; draft dates nullable; authorized project action counts only, no applicant/evidence payload |
| `ProjectDetails` | ProjectCard + approved brief, published `TermsVersion`, public milestone criteria; authorized parties additionally receive Project and preconditions; draft/private fields never leak through public view |
| `TermsVersion` | Entity + project_id,version_no,schema_version,content_hash,full frozen ProjectPatch values, milestone definitions, TermsCreate fields; no provider/legal verification claims |
| `Milestone` | Mutable + project_id,sequence_no,title,description,criteria `{id,text}`,required,due_at,status |
| `Application` | Mutable + project_id,student_user_id,seen_terms_version_id,motivation,declared_skills,links,availability,status,reason\|null,latest_offer:Offer\|null,participation_id\|null; no other applicant data |
| `ApplicationDetail` | Application + observed TermsVersion, project/organization summaries, own safe timeline and preconditions |
| `ApplicantSummary` | Application fields needed for selection + display_name, consented profile snapshot; no student email, unrelated passport or private reviews |
| `Offer` | Mutable + application_id,project_id,student_user_id,terms_version_id,terms_hash,status,expires_at,issued_by_user_id,participation_id\|null; expired effective status regardless of worker lag |
| `OfferDetail` | Offer + exact TermsVersion, consent_statement_version and disclosure text, preconditions |
| `Participation` | Mutable + project_id,student_user_id,offer_id,accepted_terms_version_id,status,requested_outcome\|null,started_at\|null,completed_at\|null,on_hold |
| `ParticipationSummary` | Participation + project/organization names, mentor assignment summary\|null, accepted_milestone_count, required_milestone_count, reviewed_completion_percent, next_due_at\|null |
| `ParticipationView` | ParticipationSummary + exact terms acceptance `{id,terms_version_id,terms_hash,accepted_at}`, authorized contacts, milestone progress, current mentor-safe summary, preconditions. Submissions paginated separately |
| `MilestoneProgress` | milestone_id,latest_submission_id\|null,reported_status\|null,report_author_id\|null,blocker\|null,mentor_decision\|null,organization_decision\|null,reviewed_complete:Bool; no conflated done flag |
| `Assignment` | Mutable + participation_id,project_id,mentor_user_id,proposer_user_id,status,context,expires_at,accepted_at\|null,conflict_declared\|null,end_reason\|null |
| `AssignmentDetail` | Assignment + scope/terms summary, learner display identity, workload, review/confidentiality expectations; private submissions available only after acceptance |
| `ProgressReport` | Entity + ProgressCreate fields,project_id,author_user_id,author_capacity; correction chain retained |
| `Artifact` | Entity + submission_id,kind,label,url\|null,excerpt\|null,access_class,safety_status; only within authorized submission |
| `Submission` | Mutable + participation_id,milestone_id,revision_no,summary,contribution_statement,status,submitted_at\|null,supersedes_submission_id\|null,artifact IDs; current review-head IDs and submission ETag |
| `SubmissionDetail` | Submission + artifacts, current mentor review view\|null, current org review\|null, criterion snapshot, rubric version ID, preconditions; absence means awaiting review, not a review record |
| `RubricVersion` | Entity + code,version,criteria `{id,description,min_score,max_score,evidence_required}`,approved_at,approved_by; synthetic provenance explicit |
| `MentorReviewView` | Entity + submission_id,assignment_id,author_user_id,rubric_version_id,decision,supersedes_review_id\|null,correction_reason\|null,source_valid. Owner student and author see observations and participant_feedback; project manager/reviewer see manager_summary plus decision, never participant_feedback or criterion-level observations. No reviewer-only secret notes in Core |
| `OrganizationReview` | Entity + submission_id,project_id,reviewer_user_id,decision,criteria_results,explanation,supersedes_review_id\|null,correction_reason\|null,source_valid |
| `Decision` | Entity + target_id,author_user_id,decision,checklist_version,checks,reason; admin-private verification evidence not returned to ordinary members |
| `ReportReceipt` | id,category,status,created_at; reporter-safe text only |
| `ReportCase` | Mutable + ReportCreate fields,reporter_user_id,assigned_admin_user_id\|null,actions; assigned case admin only, never project discussion |
| `QueueItem` | id,target_type,target_id,display_label,submitted_at,snapshot_version,row_version,reason_codes,data_origin; minimal admin metadata |
| `AuditEventSafe` | id,occurred_at,actor_user_id,actor_capacity,event_type,entity_type,entity_id,reason_code,redacted before/after summaries |
| `Message` | Entity + project_id,author_user_id,author_display_name,kind,body,sequence; never rendered as HTML |
| `ReadState` | project_id,last_read_sequence,updated_at |
| `Notification` | id,type,source_event_id,resource_type,resource_id,safe_summary,created_at,read_at\|null,data_origin; server provides references, frontend builds allowlisted routes |
| `Preferences` | digest_requested,digest_delivery_available=false,optional_in_app_events,row_version,updated_at\|null; no promise of email delivery |
| `PrivatePassportSection` | participation summary, individual contribution, completion outcome/history, assertion list `{id,type,status,source_type,source_id,source_version,issued_at,summary,data_origin}`, disclosed evidence references, limitations, dispute/correction indicators; no blanket verified flag |
| `PrivatePassport` | student display identity,sections:PrivatePassportSection[], assessed skills with source IDs, self-reported skills separately, generated_at; owner only |
| `Dashboard` | server-scoped counters, action items `{kind,resource_type,resource_id,due_at}`, recent safe events and next_cursor; see §8; no fabricated financial/verification KPI |

## 5. Permissions and privacy predicates

Every protected operation first requires an active verified internal user. All private queries apply tenant/ownership predicates before pagination, counts, search, or joins. A known ID, global role, selected portal, `demoActor`, or client-provided author is never sufficient.

| Predicate | Exact requirement |
|---|---|
| SELF | actor owns the profile/application/offer/participation; student actions also require active student grant |
| OWNER | active owner membership in the exact organization |
| PM | active owner or project_manager membership AND projects.project_manager_user_id = actor |
| REVIEWER | active reviewer membership AND projects.org_reviewer_user_id = actor; being owner/manager alone does not grant acceptance |
| MENTOR | active mentor_candidate grant, approved current eligibility, accepted assignment for exact participation, no disqualifying conflict |
| INVITEE | authenticated intended UUID of pending unexpired organization invitation or mentor proposal; proposal preview only before acceptance |
| ADMIN_QUEUE | active platform_admin, permitted moderation duty; minimal queues/briefs/checklists only; actor cannot approve own organization/project/eligibility |
| CASE_ADMIN | active platform_admin AND assigned to the specific case; case claim is audited and rejects conflicting own-party cases |
| WORKSPACE | owning student, PM, REVIEWER, or MENTOR for the requested participation. Project-wide aggregation for PM/REVIEWER; mentor gets only assigned participants |

Owners can list project management summaries and assign authorities but need explicit project assignment to see applications/private evidence. Reviewers cannot select applicants. Mentors cannot browse applicants, grant themselves eligibility, accept for students, or accept organization deliverables. For Core, mentor, student, and organization reviewer must be different people, and the mentor must not be an active member of the project's organization. Broader conflict exceptions require a later approved policy.

Membership removal/suspension and assignment/eligibility revocation take effect on the next authorization check, including notification targets and old URLs. Keep former actors' authored historical attribution, but no ongoing blanket evidence access. Prevent removing the last active owner. Replacing manager/reviewer requires an active appropriate member, reason, audit and project lock; freeze their mutations during a hold. Reviewer replacement never rewrites prior decisions.

Public access is only approved `open`, `visibility=public`, unrestricted project discovery and its sanitized approved snapshot. No applicant/student IDs, contact emails, private links, full membership roster or raw audit. Limited visibility is members only in Core; no invented public access code. Organization detail is private; public identity comes through ProjectCard.

Project discussions are deliberately shared among that project's current participants, PM/reviewer, and accepted mentors. The UI must disclose this audience; no private submissions, assessment feedback, report details or attachments are copied automatically. Mentors may see shared discussion but only their assigned students' evidence. Reports/holds can restrict discussion access separately. Notification delivery does not preserve access after membership loss.

Students retain own consent and appropriately redacted evidence/outcomes after withdrawal; cannot mutate closed work. Ordinary administrative access is not unrestricted evidence browsing: full source access requires assigned case plus an audited purpose. Real-user admin elevation/session assurance and duties must be approved before onboarding (D11).

## 6. State machines and business rules

All omitted transitions are forbidden with 409 `INVALID_STATE`. No general status PATCH. Holds are separately attributed records; a hold blocks new applications/offers, starts, submissions, reviews, finalization and messages, but permits reporting, safe redacted reads, decline/withdrawal, corrective admin actions and required notifications. Restrictions never silently erase evidence or settle compensation.

### 6.1 Organization, membership and eligibility

- Organization: `draft → submitted` by owner; `submitted → under_review` when admin claims review; `under_review → verified/changes_requested/rejected` by admin. `changes_requested → submitted` by owner. `verified → restricted` by admin; restore goes to `under_review`, requiring fresh verify. Rejected organizations require a reviewed support case before resubmission; no Core automatic retry.
- Verify requires checklist version, all mandatory checks, current profile version and independent admin. Verified identity fields (legal/display name, country, representative, website) cannot be patched in Core; description/contact edits do not silently revoke or grant verification. Material identity correction goes through a case pending a later amendment contract.
- Membership invitation: `pending → accepted/declined` only invitee; `pending → revoked` owner; expiry at server time. Acceptance atomically creates active memberships; role repeats cannot create duplicates. Membership `active → suspended/removed`, `suspended → active/removed` by owner; last-owner invariant applies. Owner transfer/grant is deferred, never inferred from an invitation.
- Mentor eligibility: profile starts `pending`; admin `approve → approved`, `reject → rejected`; approved → suspended with reason; rejected/suspended may return to approved only by a fresh full eligibility decision. Profile edits never self-approve. Revoked eligibility blocks all current assignments immediately; restoration does not silently resume a suspended assignment.

### 6.2 Project and frozen scope

| From | Command/actor | To and guard |
|---|---|---|
| draft / changes_requested | edit/create terms/milestones, PM | Same state; every snapshot creation freezes complete current brief and milestone definitions |
| draft / changes_requested | submit-review, PM | pending_review; verified organization, active manager/reviewer, nonempty required milestones, approved rubric, complete lawful terms, current snapshot hash matches draft |
| pending_review | admin decision | open on approve; changes_requested or rejected with reason; exact submitted snapshot and current organization/reviewer checked |
| open | close-applications, PM | closed_to_applications; existing offers remain accept/decline-able until expiry/revocation |
| open / closed_to_applications | start, PM | in_progress; ≥1 active participation, every active participant has accepted eligible mentor, zero unexpired offered offers, no holds. Remaining unoffered applications rejected with recruitment_closed reason and notice |
| in_progress | complete, PM | completed; at least one completed participation, all participations terminal, no unresolved holds, all required cohort deliverables have qualifying individual outcomes; record partial/withdrawn counts without claiming everyone completed |
| draft / changes_requested / pending_review / open / closed_to_applications | cancel, PM | cancelled; reason, revoke pending offers, reject remaining applications, cancel active participations with retained consent/history and notices |
| in_progress | cancel, CASE_ADMIN | cancelled only after reviewed case; unfinished participations cancelled, completed facts retained; never declare financial obligations void |

Rejected/completed/cancelled projects are terminal in Core. Suspend/restore are admin hold operations preserving lifecycle; restore revalidates organization/reviewer/terms, and never reopens recruitment automatically. Published terms and milestone definitions are immutable. Future amendments require a separate design for consent, payments, re-review and versioned participant scope; Core returns `AMENDMENT_REQUIRED` instead of silently making a new active scope.

Milestone lifecycle is planning metadata: create planned; project start activates all published planned milestones; project completion/cancellation archives them. Before publication, PM may archive a draft milestone with a reason; archived milestones are excluded from the next terms snapshot, while historical snapshots retain them. No archive action is allowed on a published milestone before project closure, and archive never means accepted. Draft edits after snapshot creation require a new terms version before resubmission.

### 6.3 Applications, offers and capacity

- Application created `submitted`; PM can start review → `under_review`; submitted/under_review → shortlisted; submitted/under_review/shortlisted → rejected or offered. Student may withdraw any unaccepted application, atomically revoking a pending offer. Once accepted, withdrawal uses participation endpoint; application history remains offered.
- Declined/expired/revoked offer does not mutate application back to submitted. Application stays offered with its offer outcome. PM may issue a replacement only from offered with a terminal unaccepted latest offer. PM may reject this application; student may withdraw. Rejected/withdrawn cannot reapply or receive offers. Application drafts stay local until submission; no draft API state.
- Offer creation allowed only while project open or closed_to_applications; application must originate while open. Terms must be the published version. Live pending offers reserve seats until expiry. Accepted non-withdrawn/non-cancelled participations occupy seats. Count both under project lock; no overbooking.
- Offer transitions: offered → accepted/declined by recipient; offered → revoked by PM with reason; offered → expired at `now >= expires_at`. No acceptance after deadline even if an expiry worker is delayed. Replacement expires independently; retain old records.
- Acceptance atomically creates one active participation and consent, all participation_milestone rows, and converts reservation to occupied capacity. It grants no mentor acceptance, review, payment or verified experience. `started_at` remains null until project start.
- Before project start, withdrawal/cancellation frees the seat. After start, no replacement recruitment or new offer acceptance. Capacity cannot change after publication. Project starts only after outstanding offers are handled; expiry/revoke is never silently performed on valid offers merely to make start pass.

### 6.4 Team scope, progress and participation

Core supports multiple independent students in the same project, not named subteams or joint submissions. Each student accepts the same published per-student scope and compensation; the project must state that each seat has its own terms, not divide a fee silently across a team. Every required milestone applies to each participant. Shared output URLs are permitted but each submission requires an individual contribution statement and separate review.

Progress reports may be created by the owning student for their participation or PM for a project/participation. A report can say work is done or blocked without changing evidence acceptance. Correction appends a superseding report by the original author. UI shows author and reported status separately from reviewed completion.

Participation canonical states: `active | under_review | completed | partially_completed | withdrawn | cancelled`. No committed `pending_terms` (consent is atomic), `submitted` (a submission state), or `disputed` lifecycle (case/hold is separate).

- active → under_review: student mark-ready; project in_progress; for completed request, each required milestone has a current submitted revision; for partial request, at least one. This is a request, not acceptance.
- under_review → active: student reopen, or a new revision is submitted; requested outcome cleared. A review requesting revision also reopens active participation, except that a completed historical outcome must instead be explicitly invalidated as below.
- under_review → completed: PM finalize; student's request is completed, all required current revisions have mentor `reviewed` and org `accepted`, valid actors at decision time, no unresolved adverse correction/dispute, no hold.
- under_review → partially_completed: PM finalize matching student's partial request; at least one qualifying accepted/reviewed milestone; record remaining unmet scope and reason. Partial request is not a waiver of compensation or a replacement of agreed scope.
- active/under_review → withdrawn by student, or cancelled by authorized reviewed cancellation. No deletion of reviews or consent. Completed/partially_completed cannot be withdrawn to erase history.
- Correction invalidating a completed/partial outcome records superseding outcome and marks relevant assertions corrected/disputed. The participation returns to under_review only if project is still in_progress; otherwise retains historical terminal status with `outcome_valid=false` projection and blocking case. No hidden reopening of a completed project. Subsequent correction can restore validity only by a new outcome decision satisfying all predicates. PA07 also permits this narrow terminal-outcome correction with case_id, recorded student outcome request, restored current sources and a released hold; it does not change the historical project lifecycle. Failed correction retains invalid outcome rather than claiming completion.

`reviewed_completion_percent = floor(100 × qualifying_required_milestones / required_milestones)`. Qualifying means latest nonwithdrawn submitted revision with current mentor reviewed and org accepted; draft work never supersedes submitted evidence. A new submitted revision invalidates current qualification until reviewed. Zero denominator is 0 and is unpublishable. Optional milestones do not inflate progress. Project UI shows separate per-participant outcomes and aggregate qualifying pairs, not a global checkbox that completes everybody.

### 6.5 Mentor assignment

Proposal starts `proposed`; requires eligible mentor, mentor_candidate grant, no existing proposed/accepted/suspended primary assignment for that participation. Expiry is mandatory. Named mentor can accept or decline; PM can end a proposal with reason; deadline → expired. Acceptance requires no disqualifying conflict, acknowledged confidentiality, current eligibility and active participant. The UI displays available weekly capacity as an advisory warning; it is not an acceptance guard or a falsely enforced hard cap in Core.

Accepted assignment → ended by mentor/PM with reason, or suspended through case/eligibility restriction. Suspended must be ended and replaced by a fresh proposal; no automatic re-consent. Ending access does not erase authored assessments. Replacement mentor can review new work; replacing another author's existing review requires a case-controlled invalidation and a new attributable assessment, never impersonation. A mentor cannot accept on behalf of another mentor. Before replacement, new student submissions and reviews are blocked pending accepted supervision; progress/reporting remains available.

### 6.6 Submission revisions and two independent review streams

- Create initial draft for one participation/milestone; at most one active draft. PATCH and artifact changes only on draft. Submit validates required summary/contribution/evidence, accepted mentor, project in_progress, nonterminal participation, matching milestone/terms; assigns server timestamp and makes content immutable.
- New revision can be drafted against latest submitted revision after a revision request, rejection, or student-declared correction reason. An accepted revision cannot be silently overwritten; submitting a replacement explicitly acknowledges invalidation of its current completion qualification and creates an audit event/notice. Revision counter and latest pointer advance under milestone lock; no parallel revision branches.
- `submitted → revision_requested` is a projection when either current review requests revision; the submitted content is still immutable. Organization acceptance does not become a submission status. Both current decisions remain visible even when they differ.
- Draft withdrawal makes it terminal withdrawn and releases the draft slot; submitted withdrawal permitted only before any review and with reason, preserving history. Reviewed evidence is corrected through a new revision/case, not deleted.
- Mentor records exactly one current decision per revision; rubric must match frozen terms, every required criterion addressed, observations evidence-linked. `reviewed` means assessment recorded, not that every score is high. `unable_to_assess` cannot count toward verified completion.
- Organization may request revisions/reject before mentor review. Organization acceptance requires an existing current mentor decision on the same revision, but that decision may be adverse. Every required acceptance criterion must be met with explanation/evidence for accepted. Adverse mentor findings remain explicit and block full completion until resolved to reviewed.
- Original author may append a correction with `supersedes_review_id` matching the current head and mandatory reason. Normal authority must still be active. Former author submits a correction report for case handling; admin may invalidate a source with attribution, never forge a replacement review. AD11 invalidate_source requires a source in the assigned case, records a typed moderation fact, clears the current head if applicable and invalidates dependent outcomes/assertions atomically. A newly authorized reviewer may then create a fresh assessment; the server records its relationship to the invalidated predecessor, without claiming the previous author wrote it. Review corrections update qualification/assertions transactionally and notify affected parties. Initial reviews require project in_progress; original-author corrections or case-authorized replacement of invalidated sources may occur after completion, preserving historical lifecycle and requiring released holds.

### 6.7 Experience Passport meaning

Private passport records four independent facts: platform recorded participation/submission; mentor assessment; organization deliverable acceptance; organization identity check. Each names a source, author/time, exact revision and synthetic status. Completion adds an attributable outcome; it does not erase partial work or create extra skill endorsements.

“Verified experience” means a **specific real, current, individually attributed outcome** satisfying D06, accompanied by its underlying facts and limitations. Synthetic records always display “Synthetic demonstration — not verified real-world experience,” regardless of completed fixture states. Organization identity checking remains a separate dimension, and no outcome proves payment, employment, general competence, or legal compliance.

No student endpoint sets assertion level, reviewer, assertion hash or verified boolean. Snapshot hashes are integrity checks, not digital signatures. Corrections/disputes prevent displaying an unqualified current verification claim. Private passport can show platform-recorded and partially completed evidence truthfully before full completion. Public links, downloadable public certificates and share grants are deferred pending explicit disclosure/revocation approval.

## 7. Endpoint inventory

All routes below are proposals except existing `/me`. **=** preserves a Document 3 route; **+** adds an explicit missing operation. Existing route semantics changed by B01 are listed in §12. All paths have the `/api/v1` prefix. `Page<X>` uses §4.1. `—` means no request body. State guards are §6; auth column is §5. PATCH/commands use target ETag; parent ETag exceptions appear after the tables. Detail GETs supply tokens needed by the next action.

### 7.1 Identity, organization and profiles

| ID | Basis | Method | Path | Request | Response | Actor |
|---|---|---|---|---|---|---|
| ID01 | = | GET | /me | — | 200 UserSelf (C-01 unchanged) | authenticated |
| OR01 | = | POST | /organizations | OrganizationCreate | 201 Organization | approved creator eligibility |
| OR02 | = | GET | /me/organizations | — | 200 Page<OrganizationSummary> | SELF |
| OR03 | = | GET | /organizations/:id | — | 200 Organization | active member |
| OR04 | = | PATCH | /organizations/:id | OrganizationPatch | 200 Organization | OWNER |
| OR05 | = | POST | /organizations/:id/submit-verification | Empty | 200 Organization | OWNER |
| OR06 | = | GET | /organizations/:id/members | — | 200 Page<Membership> | OWNER |
| OR07 | = | POST | /organizations/:id/invitations | InvitationCreate | 201 Invitation | OWNER |
| OR08 | + | GET | /me/organization-invitations | — | 200 Page<Invitation> | SELF |
| OR09 | = | POST | /organization-invitations/:id/accept | Empty | 200 Page<Membership> | INVITEE |
| OR10 | + | POST | /organization-invitations/:id/decline | Empty | 200 Invitation | INVITEE |
| OR11 | + | POST | /organization-invitations/:id/revoke | Reason | 200 Invitation | OWNER |
| OR12 | + | POST | /organization-memberships/:id/suspend | MembershipCommand | 200 Membership | OWNER |
| OR13 | + | POST | /organization-memberships/:id/restore | MembershipCommand | 200 Membership | OWNER |
| OR14 | + | POST | /organization-memberships/:id/remove | MembershipCommand | 200 Membership | OWNER |
| PF01 | + | GET | /me/student-profile | — | 200 StudentProfile | SELF student |
| PF02 | + | PUT | /me/student-profile | StudentProfileWrite | 200 StudentProfile | SELF student |
| PF03 | + | GET | /me/mentor-profile | — | 200 MentorProfile | SELF mentor_candidate |
| PF04 | + | PUT | /me/mentor-profile | MentorProfileWrite | 200 MentorProfile | SELF mentor_candidate |
| PF05 | + | GET | /organizations/:id/mentor-candidates | — | 200 Page<MentorDirectoryItem> | owner/manager |

Profile GET returns 404 until initialized; first PUT uses `If-None-Match: *`, returns 201, creates no grant/eligibility. Later PUT requires If-Match and returns 200. Organization creation atomically creates owner membership. OR07 uses organization ETag. Membership changes lock organization for last-owner/role races. Directory allows skills filter only; it does not expose unregistered-user search. External/email invitations and owner transfer remain deferred.

### 7.2 Projects, terms, milestones and progress

| ID | Basis | Method | Path | Request | Response | Actor |
|---|---|---|---|---|---|---|
| PJ01 | = | POST | /organizations/:org_id/projects | ProjectCreate | 201 Project | owner/manager |
| PJ02 | = | GET | /organizations/:org_id/projects | — | 200 Page<OrganizationProjectSummary> | member, scoped projection |
| PJ03 | = | GET | /projects | — | 200 Page<ProjectCard> | public/authorized |
| PJ04 | = | GET | /projects/:id | — | 200 ProjectDetails | public/authorized |
| PJ05 | = | PATCH | /projects/:id | ProjectPatch | 200 Project | PM |
| PJ06 | + | POST | /projects/:id/authorities | ProjectAuthorities | 200 Project | OWNER |
| PJ07 | = | POST | /projects/:id/terms-versions | TermsCreate | 201 TermsVersion | PM |
| PJ08 | + | GET | /projects/:id/terms-versions/:version_id | — | 200 TermsVersion | public approved snapshot or authorized |
| PJ09 | = | POST | /projects/:id/submit-review | SubmitProject | 200 Project | PM |
| PJ10 | = | POST | /projects/:id/close-applications | Empty | 200 Project | PM |
| PJ11 | = | POST | /projects/:id/start | Empty | 200 Project | PM |
| PJ12 | = | POST | /projects/:id/complete | Reason | 200 Project | PM |
| PJ13 | = | POST | /projects/:id/cancel | Reason | 200 Project | PM or CASE_ADMIN per state |
| ML01 | = | POST | /projects/:id/milestones | MilestoneCreate | 201 Milestone | PM |
| ML02 | = | GET | /projects/:id/milestones | — | 200 Page<Milestone> | public summary/WORKSPACE |
| ML03 | = | PATCH | /milestones/:id | MilestonePatch | 200 Milestone | PM draft only |
| ML04 | + | POST | /milestones/:id/archive | Reason | 200 Milestone | PM draft only |
| PG01 | + | POST | /projects/:id/progress-reports | ProgressCreate | 201 ProgressReport | PM or SELF participant |
| PG02 | + | GET | /projects/:id/progress-reports | — | 200 Page<ProgressReport> | WORKSPACE scoped |

PJ01 uses organization ETag and assigns creator as manager; reviewer remains null until PJ06. PJ07/ML01 use project ETag. ML03/ML04 require milestone ETag and additionally lock/check project state/version. PJ03 filters `q,skills,compensation_type,difficulty`; PJ02 filters canonical status and q. PG01 append uses participation ETag when participation_id present, otherwise project ETag; supersedes must be original author's report in same scope. PG02 exposes project-wide manager updates plus only authorized participant reports. No unrestricted array of every student's private blocker.

### 7.3 Selection and participation

| ID | Basis | Method | Path | Request | Response | Actor |
|---|---|---|---|---|---|---|
| AP01 | = | POST | /projects/:id/applications | ApplicationCreate | 201 Application | eligible SELF student |
| AP02 | = | GET | /me/applications | — | 200 Page<Application> | SELF |
| AP03 | + | GET | /applications/:id | — | 200 ApplicationDetail | SELF/PM |
| AP04 | = | GET | /projects/:id/applications | — | 200 Page<ApplicantSummary> | PM |
| AP05 | + | POST | /applications/:id/start-review | Empty | 200 Application | PM |
| AP06 | = | POST | /applications/:id/shortlist | Empty | 200 Application | PM |
| AP07 | = | POST | /applications/:id/reject | Reason | 200 Application | PM |
| AP08 | = | POST | /applications/:id/withdraw | Reason | 200 Application | SELF |
| OF01 | = | POST | /applications/:id/offer | OfferCreate | 201 Offer | PM |
| OF02 | = | GET | /me/offers | — | 200 Page<Offer> | SELF |
| OF03 | + | GET | /offers/:id | — | 200 OfferDetail | SELF/PM |
| OF04 | = | POST | /offers/:id/accept | OfferAccept | 201 Participation | recipient SELF |
| OF05 | = | POST | /offers/:id/decline | Reason | 200 Offer | recipient SELF |
| OF06 | = | POST | /offers/:id/revoke | Reason | 200 Offer | PM |
| PA01 | = | GET | /me/participations | — | 200 Page<ParticipationSummary> | SELF student |
| PA02 | + | GET | /projects/:id/participations | — | 200 Page<ParticipationSummary> | WORKSPACE scoped |
| PA03 | = | GET | /participations/:id | — | 200 ParticipationView | WORKSPACE |
| PA04 | = | POST | /participations/:id/withdraw | Reason | 200 Participation | SELF |
| PA05 | = | POST | /participations/:id/mark-ready-for-review | ReadyRequest | 200 Participation | SELF |
| PA06 | + | POST | /participations/:id/reopen | Reason | 200 Participation | SELF under_review |
| PA07 | = | POST | /participations/:id/finalize | FinalizeRequest | 200 Participation | PM |

AP01 uses project ETag plus exact seen terms; OF01 uses application ETag and locks project capacity. OF04 uses offer ETag; PA commands use participation ETag. Lists filter status, project_id where appropriate; AP04 also q/skills. No global student search or another student's application history. `Reason` is required for manager rejection/revocation/cancellation; student withdrawal/decline accepts `{}` or a supplied Reason to avoid coercing sensitive explanations.

### 7.4 Mentorship, evidence, reviews and passport

| ID | Basis | Method | Path | Request | Response | Actor |
|---|---|---|---|---|---|---|
| MA01 | = | POST | /participations/:id/mentor-assignments | AssignmentCreate | 201 Assignment | PM |
| MA02 | = | GET | /me/mentor-assignments | — | 200 Page<AssignmentDetail> | SELF mentor |
| MA03 | + | GET | /mentor-assignments/:id | — | 200 AssignmentDetail | named mentor/WORKSPACE |
| MA04 | = | POST | /mentor-assignments/:id/accept | AssignmentAccept | 200 Assignment | INVITEE |
| MA05 | = | POST | /mentor-assignments/:id/decline | Reason | 200 Assignment | INVITEE |
| MA06 | + | POST | /mentor-assignments/:id/end | Reason | 200 Assignment | named mentor/PM |
| SU01 | = | POST | /participations/:id/submissions | SubmissionCreate | 201 Submission | SELF |
| SU02 | = | GET | /participations/:id/submissions | — | 200 Page<Submission> | WORKSPACE |
| SU03 | = | GET | /submissions/:id | — | 200 SubmissionDetail | WORKSPACE |
| SU04 | + | PATCH | /submissions/:id | SubmissionPatch | 200 Submission | SELF draft |
| SU05 | = | POST | /submissions/:id/external-artifacts | ArtifactCreate | 201 Artifact | SELF draft |
| SU06 | + | DELETE | /submissions/:id/external-artifacts/:artifact_id | — | 204 | SELF draft |
| SU07 | = | POST | /submissions/:id/submit | Empty | 200 Submission | SELF |
| SU08 | = | POST | /submissions/:id/revisions | RevisionCreate | 201 Submission | SELF |
| SU09 | + | POST | /submissions/:id/withdraw | Reason | 200 Submission | SELF per §6.6 |
| RV01 | + | GET | /rubric-versions/:id | — | 200 RubricVersion | authorized project actor |
| RV06 | + | GET | /organizations/:id/rubric-versions | — | 200 Page<RubricVersion> | active owner/manager |
| RV02 | = | POST | /submissions/:id/mentor-reviews | MentorReviewCreate | 201 CommandResult<MentorReviewView> | MENTOR |
| RV03 | = | GET | /submissions/:id/mentor-reviews | — | 200 Page<MentorReviewView> | WORKSPACE redacted |
| RV04 | = | POST | /submissions/:id/organization-reviews | OrganizationReviewCreate | 201 CommandResult<OrganizationReview> | REVIEWER |
| RV05 | = | GET | /submissions/:id/organization-reviews | — | 200 Page<OrganizationReview> | WORKSPACE |
| PP01 | = | GET | /me/passport | — | 200 PrivatePassport | SELF student |
| PP02 | = | GET | /participations/:id/passport-preview | — | 200 PrivatePassportSection | SELF |

MA01/SU01 use participation ETag. MA actions use assignment ETag; SU/RV mutations use submission ETag. Review creation/correction bumps submission version and review-head version in one transaction. SU06 also requires submission If-Match; removal is confined to unsubmitted metadata, never historical evidence. SU08 creates a draft, not an implicitly submitted revision. No review draft endpoint is promised. Lists permit milestone_id/status filters for submissions and status for assignments.

### 7.5 Administration, reporting and portal support

| ID | Basis | Method | Path | Request | Response | Actor |
|---|---|---|---|---|---|---|
| AD01 | = | GET | /admin/organizations/pending | — | 200 Page<QueueItem> | ADMIN_QUEUE |
| AD02 | + | POST | /admin/organizations/:id/start-review | Empty | 200 Organization | ADMIN_QUEUE |
| AD03 | = | POST | /admin/organizations/:id/decisions | OrganizationDecision | 201 CommandResult<Decision> | ADMIN_QUEUE |
| AD04 | = | GET | /admin/projects/pending | — | 200 Page<QueueItem> | ADMIN_QUEUE |
| AD05 | = | POST | /admin/projects/:id/decisions | ProjectDecision | 201 CommandResult<Decision> | ADMIN_QUEUE |
| AD06 | + | GET | /admin/mentor-eligibility/pending | — | 200 Page<QueueItem> | ADMIN_QUEUE |
| AD07 | + | POST | /admin/mentors/:id/eligibility-decisions | MentorEligibilityDecision | 201 CommandResult<Decision> | ADMIN_QUEUE |
| AD08 | + | GET | /admin/review-contexts/:target_type/:id | — | 200 ReviewContext | ADMIN_QUEUE |
| RP01 | = | POST | /reports | ReportCreate | 201 ReportReceipt | affected authenticated actor |
| RP02 | = | GET | /me/reports | — | 200 Page<ReportReceipt> | SELF |
| AD09 | = | GET | /admin/reports | — | 200 Page<QueueItem> | ADMIN_QUEUE |
| AD10 | + | GET | /admin/reports/:id | — | 200 ReportCase | CASE_ADMIN |
| AD11 | = | POST | /admin/reports/:id/actions | CaseAction | 201 CommandResult<ReportCase> | CASE_ADMIN or claim rule |
| AD12 | = | GET | /admin/audit-events | — | 200 Page<AuditEventSafe> | CASE_ADMIN |
| CM01 | + | GET | /projects/:id/messages | — | 200 Page<Message> | project discussion audience |
| CM02 | + | POST | /projects/:id/messages | MessageCreate | 201 Message | discussion audience; update PM only |
| CM03 | + | POST | /projects/:id/messages/read | ConversationRead | 200 ReadState | current reader |
| NT01 | + | GET | /me/notifications | — | 200 Page<Notification> | SELF |
| NT02 | + | POST | /me/notifications/read | NotificationRead | 200 Page<Notification> | SELF |
| NT03 | + | GET | /me/notification-preferences | — | 200 Preferences | SELF |
| NT04 | + | PATCH | /me/notification-preferences | PreferencePatch | 200 Preferences | SELF |
| DB01 | + | GET | /organizations/:id/dashboard | — | 200 Dashboard | member scoped |
| DB02 | + | GET | /me/student-dashboard | — | 200 Dashboard | SELF student |
| DB03 | + | GET | /me/mentor-dashboard | — | 200 Dashboard | SELF mentor |
| DB04 | + | GET | /admin/dashboard | — | 200 Dashboard | ADMIN_QUEUE |

`ReviewContext = {target_type:organization|project|mentor, target:Organization|Project|MentorProfile, terms:TermsVersion|null, checklist_version, required_checks:{code,description}[], current_decisions:Decision[], row_version}`; union discriminated by target_type. It exposes moderation material only, not all student evidence. Claim actions on reports are allowed to ADMIN_QUEUE if unassigned and no conflict, using case ETag from queue; full detail requires assignment. AD12 requires `case_id,entity_type,entity_id` and bounded time filters; case scope controls every event returned.

AD02/03 use organization ETag, AD05 project ETag, AD07 mentor-profile ETag; AD11 report ETag. Report creation has no parent If-Match requirement and remains available during holds. CM02 has no ETag (append-only), but checks current membership/hold and uses idempotency. CM03/NT02 exempt ETag/key; NT03 returns virtual defaults with ETag "0" when absent, and NT04 with If-Match "0" creates version 1 under uniqueness protection. GET does not create preferences. Notifications filter unread/type; messages cursor only. Reports require at least one target and consistent project/participation relationship; other safety concerns go to documented support until a separate user-target reporting contract exists.

AD03 restrict/restore and AD05 suspend/restore require the linked case_id in Reason, also mandatory for active-project cancellation. These decisions require both ADMIN_QUEUE and assignment to the referenced case. No admin user restriction endpoint or global-role grant UI is added by this proposal. Case lifecycle: open → triaged → investigating → resolved/escalated; claim assigns without changing status, triage/investigate/resolve/escalate enforce these edges, holds/releases/source invalidation are separately audited actions rather than case states. Resolving a case does not implicitly release its holds or restore invalidated sources.

## 8. Portal projections and frontend integration contract

Dashboard counters come from authorized relational state, not messages or fixture lengths. Organization: project lifecycle counts, actionable applications, outstanding offers, unreviewed current submissions, qualifying milestone pairs, current team/mentor status. Student: own applications/latest offers, active participations, due required milestones, review decisions, private passport facts. Mentor: own pending proposals, accepted assignments, latest unreviewed submissions, due dates and advisory capacity. Admin: pending moderation/eligibility and minimal report counts by duty. Action items use resource references and safe labels, not executable client-supplied URLs.

Role-specific Dashboard DTO executable variants must include only these counters and typed action kinds; no aggregate financial revenue, payments settled, “verified students,” or arbitrary analytics promises. Organization queries require explicit organization ID, never the first membership silently selected. Counts and actions are filtered by project authority as well as organization membership.

Adapters map `New → submitted`, `Offered → application.offered + offer.offered`, `Accepted → offer.accepted`, `Declined → offer.declined` (manager rejection remains application.rejected). `Published/Recruiting → open`, `Active → in_progress`. `Closed` has no safe one-to-one mapping: display completed/cancelled accurately, remove/defer archive mutation in the integration task. Student `pending` offer becomes offered; awaiting review is absence of a review. Never map generic `approved` to both mentor and organization decisions.

Canonical DTOs use snake_case; existing camelCase UI models may remain view adapters, but not independently defined API contracts. After approval, generate the client from FastAPI OpenAPI, then replace fixture adapters in separately assigned portal work. No import of localStorage history into trusted evidence. Photo/cover crop outputs remain local previews until approved private upload; arbitrary external image embedding is not part of this contract.

## 9. Validation and error responses

### 9.1 Proposed concrete limits

These are bounded application-validation defaults for D10 approval, not legal limits: title 1–180 characters; names 1–160 (legal name ≤255); summary/description/motivation/contribution 20–5,000; reason 10–2,000 when required; messages 1–2,000; profile bio ≤2,000; skills ≤30 strings of 1–80; links/artifacts ≤20 per resource; milestones 1–30 at publication; criteria 1–20 per milestone; capacity 1–100; text excerpt ≤20,000; list page ≤100; JSON body ≤256 KiB. Trim strings; reject blank required values and control characters except line breaks in long text. Render plain text, not HTML. Limits require cross-owner review, not silent trimming.

- Submission needs summary + personal contribution + at least one external URL/text artifact. URLs HTTPS only, ≤2,048 chars, no credentials, localhost, literal private/link-local/reserved IP, or schemes other than HTTPS. Do not fetch/preview URLs server-side in Core; DNS-based safety cannot be promised merely by string validation. Never label external content scanned/safe.
- Country ISO two-letter code; initial supported country GH. Currency GHS initially; fixed compensation >0 with hourly fields null; paid_time rate >0 and max_billable_minutes >0 with fee_amount null. Volunteer zero must be explicit `0.00`, approved community category, policy checks and separate real-user legal gate. Sponsored-learning publication remains blocked until classification/stipend rules approved. No unpaid commercial or unclassified publication.
- Estimated/weekly minutes positive and dates ordered; workload must fit declared interval and published reviewed policy. Proposed offers/proposals expire after now and before project due time, within 30 days; organization invitations within 7 days. Late evidence is recorded accurately with late flag, not silently backdated/rejected. Real workload/age eligibility limits remain policy gates (D11), not guessed from graduation year.
- Complete acceptance criteria and rubric criterion IDs must match frozen scope exactly; reject missing/duplicate/unknown criteria. Scores are bounded integers or null only for explicitly unassessable criteria; require observations and same-revision evidence. `accepted` requires every required org criterion met.
- Public user-supplied profile project entries remain self_reported. Foreign participation/review IDs cannot turn them into assessed skills. No client body accepts mentor eligibility, identity badge, organization verification, acceptance timestamp or source author.
- `TermsVersion.content_hash` = SHA-256 over UTF-8 canonical JSON: lexicographically sorted object keys, arrays in published order, normalized strings, integer minutes, decimal money strings, schema_version and complete scope/terms; exclude database/audit timestamps and author identity. Server returns exact consent statement/version; accepted version/hash must match offer and current published snapshot. Include canonicalization golden fixtures before implementation approval; hash is not a signature.

### 9.2 Error catalog

Preserve `{ "error": { "code": "...", "message": "...", "field_errors": { "field": ["..."] } }, "request_id": "..." }`; field_errors optional. Preserve X-Request-ID and WWW-Authenticate for 401. Never expose internal SQL, tokens, report text, other tenants' names, or full private payloads in errors.

| HTTP | Codes | Rule |
|---|---|---|
| 401 | AUTH_REQUIRED | Missing/invalid token |
| 403 | FORBIDDEN | Known visible resource but wrong capability; suspended/disabled account |
| 404 | NOT_FOUND | Nonexistent or unauthorized private resource, uniformly |
| 409 | DUPLICATE_APPLICATION, INVALID_STATE, TERMS_CHANGED, OFFER_EXPIRED, CAPACITY_EXCEEDED | Domain transition conflict |
| 409 | REVIEW_CONFLICT, UNPAID_POLICY_BLOCK, ORG_NOT_VERIFIED | Existing decision, policy or verification guard |
| 409 | IDEMPOTENCY_CONFLICT, REQUEST_IN_PROGRESS | Same key with different payload, or concurrent unfinished request |
| 409 | MENTOR_NOT_ELIGIBLE, MENTOR_REQUIRED, ASSIGNMENT_EXPIRED, RESOURCE_ON_HOLD | Supervision/hold gates |
| 409 | AMENDMENT_REQUIRED, COMPLETION_BLOCKED, LAST_OWNER_REQUIRED, INVITATION_EXPIRED | New proposed explicit guards; completion response identifies only authorized missing prerequisites |
| 412 | STALE_VERSION | Failed If-Match or first-create If-None-Match |
| 413 | PAYLOAD_TOO_LARGE | Request limit |
| 422 | VALIDATION_ERROR, RUBRIC_INVALID | Shape/range/reference mismatch in disclosed scope; field errors |
| 428 | PRECONDITION_REQUIRED | Missing required precondition header |
| 429 | RATE_LIMITED | Approved throttle exceeded, Retry-After; exact traffic thresholds require operational approval |
| 503 | TEMPORARY_UNAVAILABLE | Transient dependency failure; retry using same idempotency key |

Check identity and visibility before revealing state/version errors. Stale ETag normally precedes domain validation; same-key successful replay is checked after authorization but before stale-version rejection. Unknown request fields return 422, not mass assignment. Denied actions do not emit misleading business success notifications.

## 10. Transactions, concurrency, audit and delivery

### 10.1 Transaction boundaries

Use one domain transaction for each command; existing identity provisioning must complete before that boundary. Domain services must not hide commits in helpers. Reuse one session per request with explicit rollback on failure. No network call inside a row-lock critical section.

Global lock order when applicable: organization → membership/eligibility authorization rows (ordered UUID) → project → application → offer → participation → assignment → participation milestone → submission/review head. Command handlers recheck current permissions and guards after acquiring locks. Revocation and resource mutation must use compatible ordering so stale permission reads cannot authorize a new mutation after revocation commits. Test these races on PostgreSQL, not SQLite alone.

| Command | Atomic effects and competing operations |
|---|---|
| Org creation/invitation acceptance | Owner/memberships + entity + audit/outbox; prevent duplicate active roles and last-owner race |
| Publish | Check current org/authorities/snapshot/checklist; insert moderation fact, publish exact version, freeze scope, bump project, audit/outbox; stale moderation snapshot cannot publish |
| Issue/replace offer | Lock project and application; reconcile expired offers; check reserved + occupied < capacity; insert new offer, set application offered, audit/outbox |
| Accept offer | Lock project/application/offer; recipient/expiry/hash/state/hold checks; create consent + one participation + milestone scopes; convert reserved seat, update offer and versions; audit/outbox. All or nothing |
| Withdraw/revoke/expire | Same allocation lock; release reservation/eligible seat exactly once; retain immutable consent; notify once; no automatic compensation settlement |
| Mentor accept/end/eligibility restriction | Lock eligibility/project/participation/assignment in consistent order; enforce unique primary assignment; update access, audit/outbox. Eligibility status checked at each later action |
| Submit/revise | Lock participation milestone and submission; enforce one draft/linear revisions; validate artifacts; update latest pointer only on submit; invalidate prior current qualification; audit/outbox |
| Review/correct | Lock exact submission/review head and participation; verify actor/current-head/criteria; append fact, replace head, bump versions; recalculate qualification/outcome/assertion validity; audit/outbox |
| Finalize/project complete | Lock project + relevant participations/milestone heads in UUID order; recheck current revision/review/hold predicates; append outcome, update state and private assertion sources; audit/outbox |
| Case hold/release | Lock affected project/participation; preserve lifecycle, reason and history; block/re-enable commands based on current authorization, never automatically complete |

Authoritative passport source validity and outcome invalidation happen transactionally. GET passport derives current truth from sources/heads; optional cached summaries must advertise version and cannot serve outdated accepted assertions after a correction/hold. Expensive notification work is deferred through outbox, not evidence truth.

### 10.2 Idempotency and version semantics

Scope keys by actor UUID + method + normalized concrete path (including resource IDs) + key hash. Request hash includes canonical body and relevant precondition headers. Same scope/key/body returns original committed status/body/aggregate version; changed body/headers → 409 IDEMPOTENCY_CONFLICT. Re-authorize before returning cached private data. Never store auth tokens or one-time secrets.

Propose 24-hour replay retention; client persists pending command key across network retries and refreshes. After expiry, domain uniqueness and state checks still prevent duplicate application, participation, accepted offer, primary assignment or review head. Append-only messages/progress can be duplicated if retried beyond retention with a new key; client must reconcile history rather than promise exactly-once forever. In-flight duplicate returns REQUEST_IN_PROGRESS with Retry-After, or waits briefly within server timeout. Failed transactions leave no successful replay record. Deterministic validation failures need not be cached.

Successful replay returns original ETag, not a fabricated latest resource; frontend refetches before new edits. New-key duplicate acceptance of an already accepted own offer returns existing participation 200 only if body matches recorded consent; otherwise conflict. Same-key original acceptance remains 201. Authorization loss always wins over replay. Every write affecting an aggregate's state, scope, review heads or completion increments its version; message/read traffic does not churn project workflow ETags.

### 10.3 Audit events and notification triggers

Audit fields: event_id, UTC occurred_at, verified actor_user_id (null only named system expiry worker), actor_capacity, tenant/entity IDs, event_type, request_id, old/new state/version references, reason_code, idempotency correlation hash. Store references rather than submitted artifact text, tokens, full feedback or safety details. Append-only normal application permissions; no tamper-proof claim. Safe user timelines are projections, not raw audit exports.

| Event family | Trigger | Notification recipients |
|---|---|---|
| organization.created / verification_submitted / verification_decided | Creation, request, admin decision | Owner; admin queue on request |
| membership.invited / accepted / suspended / removed | Membership commands | Named invitee/affected member and owners |
| project.review_submitted / published / changes_requested / rejected / started / completed / cancelled | Named project commands | PM/reviewer; affected participants/mentors for execution changes; admin queue for review |
| application.submitted / shortlisted / rejected / withdrawn | Selection command | Assigned PM and affected student; never competing applicants |
| offer.issued / accepted / declined / expired / revoked | Offer command or expiry | Recipient and PM; accepted also creates mentor-assignment-needed action |
| mentor.proposed / accepted / declined / expired / ended / eligibility_changed | Assignment/eligibility command | Named mentor, PM, affected student; no fabricated acceptance |
| progress.reported / corrected | Append progress | Relevant participation parties; project update to project audience |
| submission.submitted / revised / withdrawn | Evidence command | Assigned mentor and reviewer/PM; student confirmation |
| mentor_review.recorded / corrected; organization_review.recorded / corrected | Independent authored decision | Student and authorized counterpart using redacted summary |
| participation.ready / reopened / finalized / outcome_invalidated / withdrawn / cancelled | Participation command or correction | Student, PM, assigned reviewer/mentor |
| passport.assertions_updated / disputed / corrected | Source projection change | Owner only; no public broadcast |
| report.created / case.action_recorded / hold.changed | Restricted report/moderation action | Assigned admin and reporter-safe acknowledgment; affected parties receive safe hold notice, not report details |
| discussion.message_created | New message | Authorized project audience except author; preferences apply |

Write outbox event in same transaction as source/audit. Consumer delivers at least once; unique recipient/event/type makes in-app notification creation idempotent. Recompute recipient access at delivery and read. Retry with bounded backoff and record failed delivery status; never roll back a committed consent/review because notification fails. In-app notifications first; email/digest worker/provider and scheduler approval are separate. Expiry enforcement on commands works without a worker; deadline notifications require an idempotent scheduled job before claiming timely delivery.

## 11. Acceptance tests and documentation checks

These are proposed tests for implementation, not tests run by B01.

| Test ID | Given / when / then |
|---|---|
| B01-T01 | Preserve C-01 schema/auth fixtures; invalid JWT, self-granted client role and suspended user remain rejected |
| B01-T02 | Wrong organization or same organization without project assignment; every list/detail/count/mutation hides or denies the resource |
| B01-T03 | Owner loses membership concurrently with mutation; whichever serialized first determines outcome, no post-revocation authorized write; last-owner removal race fails |
| B01-T04 | Draft/pending/unverified/held project; cannot discover publicly, apply, publish or bypass policy through status fields |
| B01-T05 | Duplicate, withdrawn or rejected application; no second application, including concurrent requests; replacement offer does not duplicate application |
| B01-T06 | Two simultaneous seat reservations/acceptances; capacity never exceeded; expiry/revoke/withdraw/start races leave consistent allocations |
| B01-T07 | Wrong student, expired offer, mismatched terms/hash/consent, or stale version; no partial consent/participation; valid retry yields same participation |
| B01-T08 | Same key on two resource paths is independent; same path/body replays; changed body conflicts; revoked actor cannot replay private body |
| B01-T09 | Proposed/declined/expired/suspended mentor or organization-affiliated reviewer; cannot view private evidence or assess; explicit consent required |
| B01-T10 | Two students share a project/URL; each retains separate consent/contribution/reviews/passport; one acceptance never completes the other |
| B01-T11 | Progress reported done or evidence submitted; no automatic mentor review, org acceptance, milestone qualification, or completion |
| B01-T12 | Concurrent drafts/submits/reviews/corrections; linear revisions, single current heads, stale If-Match fails, historical facts unchanged |
| B01-T13 | Mentor adverse or unable assessment followed by org acceptance; facts coexist, completion blocked until required qualifying assessment |
| B01-T14 | Accepted revision replaced or review corrected; old approval does not apply to new revision; outcomes/assertions invalidated immediately |
| B01-T15 | Missing evidence, invalid URL, foreign artifact, unknown criterion/out-of-range score, false monetary classification; reject with safe typed errors |
| B01-T16 | Complete and partial finalization; student request and exact current source conditions enforced; withdrawal preserves consent/earned evidence |
| B01-T17 | Case admin unrelated to case, public reader, peer student or org member accesses private passport/report/feedback; denied/redacted |
| B01-T18 | Outbox retry and recipient membership removal; no duplicate in-app notice and no leaked report/evidence content |
| B01-T19 | Synthetic end-to-end actors finish workflow; all derived claims remain labeled synthetic; real verification/payment never fabricated |
| B01-T20 | PostgreSQL migrations on isolated approved test database; upgrade, constraint failures and recovery tested, no SQLite-only concurrency claims |

Documentation validation for B01: verify this is the only newly authored path; check whitespace, Markdown tables/fences, local links, unique endpoint IDs and method/path pairs, complete DTO references, transition/action coverage, and approval identifiers. Root package scripts and inspected CI contain no dedicated Markdown consistency command. Do not run runtime builds, migrations or live database tests for this document-only task. The existing identity suite can connect to development Neon when a local environment file exists; execution requires a separately controlled test task.

## 12. Exact proposed contract delta and B02 dependencies

**Unchanged:** C-01 shape, JWT/session transport, identity tables/migration, global role names, health route, error envelope, tenant-scoped principle, independent review facts, exact terms consent, private-by-default evidence, existing stack and generated-client mechanism.

**Refinements to Document 3 requiring ratification:** multiple historical offers with one live/accepted offer; pending offers reserve capacity; no reapplication; participation-specific mentor proposal expiry; cohort projects with individual evidence; review-first org acceptance and stricter completion; frozen published terms in Core; explicit partial student request; separate disputed/held dimension; no committed pending_terms; independently reported progress; exact supersession/current-head rules; concrete typed passport sources; 24-hour idempotency retention and concrete-resource key scope; required 428 preconditions; new errors in §9; Core-safe URL/text evidence only.

**New entities beyond the draft:** student_profiles, organization_invitations, mentor_eligibility_decisions, participation_milestones, progress_reports, rubric_versions, submission_review_heads, participation_outcomes, project_messages, conversation_read_states, notifications, notification_preferences. Clarify existing draft typed review-evidence links and passport source FKs; no polymorphic unenforced source relation. Membership pending invitations move to a distinct entity. Explicit additions are marked + in §7; existing draft routes marked = are still unimplemented except /me.

**Endpoint adjustments:** membership accept returns created role memberships; organization project lists return scoped summaries rather than full drafts; offer replacement allowed on existing offer path; review commands return fact plus parent version; external artifact mutation draft-only; `/me` PATCH deferred to identity owner rather than altering C-01. Promote draft offer-revoke and read-own-reports to Core; membership/profile/message/dashboard APIs can follow the critical workflow. Proposed missing GET detail/terms/rubric/admin context routes make UI actions reviewable without private-data overfetch. No archive, public passport, payout, raw-file or global-role mutation endpoint.

### B02 readiness and sequence

1. Obtain recorded decisions D01–D10 for the scope being implemented, and D11 conditions for any real-user operations. Name backend owner and independent portal reviewers; provide an issue packet with allowed paths and negative tests. Approval of a document does not approve production migration execution.
2. B02 implements approved organization/membership and resource-permission foundation plus transaction/audit/idempotency primitives, reusing C-01. Controlled synthetic role/bootstrap fixtures only until onboarding policy is approved. Student/mentor profile contracts and safe moderation context are dependencies for the later slice.
3. Coordinate one reviewed Alembic chain after `20261026_0001`; verify actual development schema in a separately authorized task; plan rollback/recovery and immutable record permissions. No rewriting existing applied migration.
4. Generate executable OpenAPI and TypeScript types from the approved subset; snapshot C-01 and verify new error/DTO schemas. Do not hand-edit generated client or export fixture types as API schemas.
   Shared transport configuration must also permit the proposed If-None-Match header and expose any additional response headers used by clients; this requires explicit implementation write scope. This proposal does not change current CORS, authentication or deployment settings.
5. Next vertical tasks: projects/terms/admin publication → applications/offers/atomic consent → mentor proposals/workspace → submissions/independent reviews → completion/private passport. Admin publication cannot be postponed until after Student integration.
6. Each vertical task includes own/foreign-tenant and stale/concurrent tests, PostgreSQL transaction validation, and separately authorized portal adapters. Messages/profiles/notifications can follow; binary uploads/public sharing stay gated.

## 13. Decisions requiring project-owner approval

**Every row is pending. No checkbox is pre-approved.** Approval should list accepted IDs and any amended values; unresolved rows block their dependent work, not independent documentation. These recommendations are not a substitute for ADR sign-off, cross-owner review, or real-user safeguards.

| ID | Recommended decision | Alternative / impact | Required review |
|---|---|---|---|
| D01 | Canonical project lifecycle, immutable published scope, no recruitment after start, no archive mutation; strict publication moderation | Live amendments/recruitment require re-consent and capacity/state redesign before implementation | Organization + Admin + backend; ADR-003 |
| D02 | One application ever per project/student; sequential replacement offers; live offers reserve seats; release before start on withdrawal | Reapplication needs application attempts and new uniqueness policy; no reservation exposes acceptance races to applicants | Student + Organization + backend |
| D03 | Participation-scoped mentor proposals with expiry, explicit consent, admin eligibility, no affiliated/self reviewer, advisory capacity | Project-wide assignments or conflict exceptions need different access/attribution model | Mentor + Organization + backend; ADR-008 |
| D04 | Shared multi-student project with individual scope/consent/submission/review per seat; all required milestones per student | Solo-only simplifies launch; named subteams/joint submissions need attribution and consent entities before schema freeze | All portal owners; ADR-004 |
| D05 | Progress reports separate; immutable revisions; independent review streams; mentor decision before org acceptance; original-author corrections | Org acceptance before any mentor assessment can be allowed, but completion still requires both; correction policy affects trust | Student + Mentor + Organization; ADR-003 |
| D06 | Full completion requires current mentor reviewed + org accepted for every required milestone; partial only student-requested; source-backed private passport and explicit invalidation | Any waiver must be named, attributed and never presented as independently assessed evidence | All owners; ADR-003/006 |
| D07 | Owner manages scoped memberships; project authority explicit; invitations to known user UUIDs; no global-role self-grants or owner transfer | Email invitations and owner succession need separate recipient-proof/abuse/last-owner workflow | Backend + Organization + identity owner |
| D08 | URL/text metadata first, no fetch/scanning claim, no binary upload/public passport, typed source FKs | Files or public sharing require approved storage, scanning, rights, consent and revocation design | Backend + privacy/storage owners; ADR-005/006 |
| D09 | Durable append-only audit and transaction outbox; in-app recipient notices first; shared project discussion audience disclosed | Email/digest/scheduler must be approved before delivery promises; private channels require separate audience model | All portal owners; ADR-010 |
| D10 | DTOs/routes/errors/limits, preconditions, lock order and 24-hour replay policy in this document; generated client after approval | Revise concrete values or freeze a smaller named endpoint subset; no silent implementation divergence | Backend + all consuming frontend owners |
| D11 | BUILD uses controlled synthetic actors only until creator/student eligibility, age/workload, verification/vetting, compensation/IP, privacy/retention and admin elevation are approved | Real onboarding requires named policies, operators and safeguard sign-offs; B01 cannot decide legal compliance | Product/operations/privacy + responsible human reviewers; ADR-007/008 |
| D12 | Preserve ADR-011 deployment controller; separately reconcile older deployment prose, screen IDs, and missing ADR files; approve B02 issue/reviewer scope separately | No runtime or deployment expansion bundled into B01 acceptance | Project owner + platform lead |

**Stop point:** B01 delivers this proposal only. No backend, frontend, database or migration implementation begins until the owner approves the relevant decisions and assigns B02.
