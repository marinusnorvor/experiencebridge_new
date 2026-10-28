# ADR-002: Clerk Managed Authentication, Next.js 16 Proxy Session Handling, and FastAPI JWKS Verification

- **Status:** APPROVED
- **Date:** 2026-10-26
- **Owner:** D1 (Technical Lead / Platform Foundation)
- **Reviewers:** D2, D3, D4
- **Related Requirements:** `AUTH-001`, `AUTH-002`, `SEC-001`, `SEC-002`, `OBS-001`, `QUAL-001`
- **Related Contracts:** `C-01` (`UserSelf`, `GET /api/v1/me`), `users`, `user_role_grants`
- **Related Documents:** `docs/01-product-requirements.md`, `docs/02-system-architecture.md` (§3.2, §21), `docs/03-database-api.md` (§1.1, §3.1, §4, §6.1, §9), `docs/04-ui-ux.md` (§2.1–2.3, §3.1)

---

## 1. Context

ExperienceBridge is deployed as a decoupled Next.js 16 frontend (`apps/web`) and FastAPI backend (`apps/api`) on separate Vercel projects, backed by environment-isolated Neon PostgreSQL branches (`ADR-001`, `ADR-009`, `ADR-011`).

We require a managed authentication provider and a secure browser-to-API authentication mechanism that:
1. Avoids storing passwords, recovery secrets, or session secrets in the application database.
2. Protects portal routes (`/student/*`, `/organization/*`, `/mentor/*`, `/admin/*`) against unauthenticated access while preserving public routes (`/`, `/sign-in/*`, `/sign-up/*`).
3. Verifies credentials server-side in FastAPI on every protected request without trusting client-supplied user IDs or role claims.
4. Strictly separates **identity verification** (who the user is) from **contextual authorization** (which role grants, organization memberships, or project assignments the user holds in Neon PostgreSQL).

---

## 2. Decision

### 2.1 Managed Identity Provider
- Select **Clerk** as the managed OIDC/OAuth authentication provider.
- Connect the existing Clerk Development application **ExperienceBridge** (`app_3LEpoE8O013ojsnjd0xb5GkNWOJ`). Separate Clerk instances/keys are used for development, staging, and production.

### 2.2 Frontend Authentication (`apps/web` — Next.js 16)
- Use `@clerk/nextjs` with `<ClerkProvider>` at the root layout (`apps/web/app/layout.tsx`).
- Use Next.js 16's `apps/web/proxy.ts` convention with `clerkMiddleware()` and `createRouteMatcher()` from `@clerk/nextjs/server` to require authentication on `/student(.*)`, `/organization(.*)`, `/mentor(.*)`, and `/admin(.*)`.
- Provide dedicated App Router sign-in (`/sign-in/[[...sign-in]]`) and sign-up (`/sign-up/[[...sign-up]]`) pages matching ExperienceBridge's slate/teal design system.
- Never treat a signed-in Clerk session as automatic authorization for a specific portal role; portal access and contextual capabilities are resolved from FastAPI (`GET /api/v1/me`).

### 2.3 Browser-to-API Token Flow & FastAPI Verification (`apps/api`)
- Frontend and server-side API callers send Clerk session tokens in the `Authorization: Bearer <token>` HTTP header via `@experiencebridge/api-client`.
- FastAPI verifies Bearer tokens statelessly using Clerk's JSON Web Key Set (`JWKS`) with `RS256` signature verification (`PyJWT[crypto]`):
  - Verify cryptographic signature against Clerk's JWKS (`CLERK_JWKS_URL` or `<CLERK_ISSUER_URL>/.well-known/jwks.json`).
  - Require and validate `iss` against `CLERK_ISSUER_URL`, `sub` (non-empty Clerk user ID), `exp`, and `nbf`.
  - Validate `azp` (Authorized Party) against configured frontend origins (`CLERK_AUTHORIZED_PARTIES`, defaulting to `CORS_ALLOWED_ORIGINS` when `azp` is present in the token) and optional `aud` (`CLERK_AUDIENCE`) when configured.
  - Reject missing, malformed, expired, wrong-issuer, wrong-signature, or unauthorized-origin tokens with HTTP `401 AUTH_REQUIRED` in the standard error envelope.

### 2.4 Neon PostgreSQL Identity Persistence (`users` & `user_role_grants`)
- Map verified `(identity_issuer, identity_subject)` to internal `users.id` (UUID) in Neon PostgreSQL (`docs/03-database-api.md` §3.1).
- On first authenticated request to `GET /api/v1/me`, create or synchronize the local `users` record (`active` status by default, with zero privileged role grants).
- Block `suspended` or `disabled` local accounts with HTTP `403 FORBIDDEN`.
- Store global role grants in `user_role_grants` (`student`, `mentor_candidate`, `platform_admin`). Never allow self-service `platform_admin` or `mentor_candidate` grants or trust client-supplied role fields.

---

## 3. Consequences

- **Positive:** Zero password storage in ExperienceBridge; cryptographically verified stateless JWTs suitable for Vercel serverless functions; strict database-backed separation between identity (`users`) and authorization (`user_role_grants` and future contextual memberships).
- **Guardrails:** `CLERK_SECRET_KEY` must never be exposed via `NEXT_PUBLIC_*` variables or API responses. Database migrations must be executed via Alembic against the `development` branch first and never automatically against `production`.
