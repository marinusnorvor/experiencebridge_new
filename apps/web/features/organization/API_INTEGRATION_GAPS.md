# O12 — Organization contract review (not an approved API design)

Inspected 31 October 2026 on `lib`. No backend files, schemas, shared clients,
authentication or teammate code changed. This document is a review packet for
the responsible humans; their agreement has not been obtained.

## Confirmed blocker

The checked-in `packages/api-client/openapi.json` exposes only `GET /health`
and `GET /api/v1/me`. The generated client has no organization workflow DTOs or
operations. `apps/api/app/core/domains.py:create_domain_router` returns an empty
APIRouter; organization, project, application, mentorship and assessment packages
register domain metadata, not business endpoints. Their module docstrings
explicitly defer unapproved operations.

Consequently O13 cannot be connected to real data within the current assignment.
Calling proposed URL strings would invent an interface. The current local
presentation model and transition helpers are not an API, authorization layer,
database, transaction engine or substitute for the generated shared client.

## Required contracts and owners

| UI capability | Relevant draft references | Existing executable support | Review dependency |
| --- | --- | --- | --- |
| Organization context/profile/verification request | Document 3 §8.1, API-ORG-01–04/08 | None | D3 + D1; active organization membership, field permissions, admin decision boundary |
| Drafts, versioned terms, moderation, project list | Document 3 §8.2, API-PROJ-01–11 | None | D3 + admin/platform owner; moderation and immutable terms |
| Application shortlist/decline/offers | Document 3 §8.3, API-APP-* and offer operations | None | D2 + D3; consent, expiry, capacity, atomic membership creation |
| Mentor invitations/assignment | Mentorship module metadata; ADR-003/008, DEC-008 | None | D4 + D3; eligibility, conflicts, mentor acceptance |
| Milestones, project updates and completion | API-MILE-01–03; API-PROJ-09–11 | None | D3 + D2/D4; allowable edits, completion outcomes, disputes/holds |
| Versioned submissions, private evidence, organization reviews | API-OREV-01/02; Document 3 §3/§7 | None | D3 + D4 + D1; artifact access, criteria, immutable review revisions |
| Discussions/notifications/read state | Portal spec §5 ORG-08; notification/audit conventions | None | Shared ownership/retention/redaction rules and notification delivery contract |

Backend module metadata lists blocking decisions including ADR-003/004/005/007/008
and DEC-004/005/008/009/012. No approval for new contracts or migrations is inferred
from this frontend task. The issue packet still needs a named independent reviewer,
precise allowed backend/shared-client paths, accepted contracts and negative tests.

## Conflicts to resolve before mapping presentation state to DTOs

1. Portal §8 suggests `New/Shortlisted/Offered/Accepted/Declined/Withdrawn`
   application-like states. Document 3 §3 defines an application separately from
   an offer and participation, using `submitted/under_review/shortlisted/rejected/
   offered/withdrawn`. The local labels must not become backend enums. Define an
   explicit read-model projection and independent offer expiry/acceptance records.
2. Portal ORG-07 offers Accept and Request Changes. Document 3 organization-review
   decisions also include `rejected` and a supersession model. The demo supports
   the two requested actions and locks a decided version. Human owners must decide
   real rejection, correction, supersession and appeal permissions.
3. Portal uses Published/Recruiting/Completed/Closed; Document 3 proposes its own
   project lifecycle and completion/cancellation endpoints. Do not infer a new
   backend `archive` operation. The demo can only archive an already-completed
   fixture. Starting/completing real projects remains unimplemented.
4. Portal §4 and §5 reuse ORG-04/05/06 screen IDs differently (detail vs applications
   vs workspace). Routes follow the explicit URL table. Stabilize screen IDs for
   formal requirement traceability before API/release sign-off.
5. The portal specifies five wizard steps; Document 4 separates additional terms
   semantics. The demo includes paid compensation/IP/privacy in Terms & Preview;
   this does not approve real legal text, compensation or safeguarding policy.

## Required integration guarantees

- Server-verified identity plus active contextual organization/project membership;
  never authorize from `demoActor`, a client role, route ID or hidden control.
- Resource-specific 401/403/404 behavior and no cross-organization record leakage.
- Server state/terms guards, exact decimal currency, capacity transactions,
  `If-Match`/row versions and approved idempotency semantics. The demo revision
  counter only rejects stale actions within one browser tab.
- Private artifact retrieval, upload validation and explicit shareable mentor
  observations. No permanent public evidence URLs or inherited verification.
- Durable attributed audit and independent notification/outbox delivery.
- Test real duplicate offers, concurrent capacity claims, revoked memberships,
  expired offers, stale terms, missing evidence and unauthorized reviews.

## Approval needed to unblock O13

A separately assigned, human-reviewed backend/contract task must supply approved
operations and DTOs, lifecycle decisions, owner/reviewer agreement and explicit
write scope. Once those exist, replace the feature-local synthetic adapter with
the generated API client under an authorized integration task. Keep the existing
production authentication boundary. Do not expose these synthetic actions to
production or present them as persisted workflows.

No GitHub issue, message to another developer, or external review request was
created; this local packet is ready for the user to share with the owners.
