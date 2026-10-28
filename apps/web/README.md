This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

From the repository root, run the development server:

```bash
npm run dev --workspace apps/web -- --port 3002
```

Open [http://localhost:3002](http://localhost:3002). Use port 3000 when it is free.

EB-012 connects the homepage to `/student/dashboard`, `/mentor/dashboard`,
`/organization/dashboard`, and `/admin/dashboard`. The merged Student and Mentor
interfaces still use their existing labeled fixtures and browser-local state.
Organization and Admin currently retain their existing reserved-route pages.

Local `next dev` allows viewing these interfaces without Clerk or private API
requests. This applies only with `NEXT_PUBLIC_APP_ENV` unset or `development`,
and without `VERCEL`. Production builds, staging, and Vercel retain Clerk route
protection. Sign-in/up and the API diagnostic screen retain their Clerk provider.
Backend JWT verification and permissions are unchanged. Restoring local sign-in
requirements only requires disabling `isPortalPresentationMode()` in
`lib/auth/portal-presentation.ts`.

Validation from the repository root (Node 24 for the built-in test runner):

```powershell
npm ci
npm run lint --workspace apps/web
npm run typecheck --workspace apps/web
npm run build --workspace apps/web
node --test apps/web/tests/portal-presentation.test.mjs
# With the development server running:
$env:PORTAL_TEST_URL = 'http://localhost:3002'
node --test apps/web/tests/portal-routes.test.mjs
```

Scope: EB-012 (D1; independent D2 review pending), BUILD interface integration.
Traceability: PRD AUTH-001/002, SEC-001/002, PRIV-001, ACC-001; UI PUB-01,
STU-01/02/03/04/06/07, MEN-01/02/03, ORG-01, ADM-01. ADR-002 remains the
authentication baseline outside this explicitly requested local presentation
exception. C-01 / `GET /api/v1/me` and all backend contracts are unchanged.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
