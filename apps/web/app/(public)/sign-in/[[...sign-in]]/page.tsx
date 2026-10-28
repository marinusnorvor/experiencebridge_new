import Link from "next/link";
import { Suspense } from "react";
import { SignIn } from "@clerk/nextjs";

import {
  CLERK_APPLICATION_ID,
  isClerkPublishableKeyConfigured,
} from "@/lib/auth/clerk-config";

function SignInLoadingFallback() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-sm"
    >
      <div className="h-6 w-40 animate-pulse rounded bg-slate-200" />
      <div className="mt-3 h-4 w-64 animate-pulse rounded bg-slate-100" />
      <div className="mt-6 space-y-4">
        <div className="h-10 w-full animate-pulse rounded-lg bg-slate-100" />
        <div className="h-10 w-full animate-pulse rounded-lg bg-slate-100" />
        <div className="h-10 w-full animate-pulse rounded-lg bg-teal-800/20" />
      </div>
      <p className="mt-4 text-xs text-slate-500">Loading ExperienceBridge sign-in…</p>
    </div>
  );
}

export default function SignInPage() {
  const hasLiveClerkKey = isClerkPublishableKeyConfigured();

  return (
    <main className="mx-auto flex min-h-[calc(100vh-4.5rem)] w-full max-w-5xl flex-col justify-center px-6 py-12">
      <div className="grid items-start gap-10 lg:grid-cols-[1fr_auto]">
        <div className="max-w-xl">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-800">
            Team JAMS · ExperienceBridge
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            Sign in to ExperienceBridge
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-600">
            Authenticate with your ExperienceBridge account to access your workspace.
            Signing in verifies your identity; portal access to Student, Organization,
            Mentor, or Admin views is verified separately by the ExperienceBridge API
            using server-side role grants and memberships.
          </p>

          <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700 shadow-sm">
            <p className="font-semibold text-slate-900">Trust boundary</p>
            <p className="mt-1 leading-6 text-slate-600">
              Identity is not authorization. After sign-in, protected portal routes request
              your server-verified profile from <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">GET /api/v1/me</code>.
            </p>
          </div>

          {!hasLiveClerkKey && (
            <div
              role="note"
              className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950"
            >
              <p className="font-semibold">Local environment setup required</p>
              <p className="mt-1 leading-6">
                Connect Clerk application{" "}
                <code className="rounded bg-amber-100 px-1.5 py-0.5 text-xs">
                  {CLERK_APPLICATION_ID}
                </code>{" "}
                by setting <code className="rounded bg-amber-100 px-1.5 py-0.5 text-xs">NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</code>{" "}
                in <code className="rounded bg-amber-100 px-1.5 py-0.5 text-xs">apps/web/.env.local</code>.
              </p>
            </div>
          )}

          <p className="mt-6 text-sm text-slate-600">
            Need an account?{" "}
            <Link
              href="/sign-up"
              className="font-medium text-teal-800 underline-offset-4 hover:underline"
            >
              Create an ExperienceBridge account
            </Link>
          </p>
        </div>

        <div className="flex justify-center lg:justify-end">
          <Suspense fallback={<SignInLoadingFallback />}>
            <SignIn
              routing="path"
              path="/sign-in"
              signUpUrl="/sign-up"
              fallbackRedirectUrl="/student/dashboard"
            />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
