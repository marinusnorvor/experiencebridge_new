import Link from "next/link";
import { Suspense } from "react";
import {
  Show,
  SignInButton,
  SignOutButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";

import { portalLinks } from "@/lib/portal-routes";
import { isPortalPresentationMode } from "@/lib/auth/portal-presentation";

function AuthControlsFallback() {
  return (
    <div
      aria-label="Loading authentication controls"
      className="h-9 w-36 animate-pulse rounded-lg bg-slate-200"
    />
  );
}

export function SiteHeader() {
  return (
    <header className="border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
          <Link
            href="/"
            className="text-base font-semibold tracking-tight text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800"
          >
            ExperienceBridge
          </Link>
          <nav
            aria-label="Primary portal navigation"
            className="flex flex-wrap items-center gap-2 text-sm font-medium text-slate-600 sm:gap-4"
          >
            {portalLinks.map((portal) => (
              <Link
                key={portal.href}
                href={portal.href}
                className="rounded-md px-2 py-1 transition hover:bg-slate-100 hover:text-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800"
              >
                {portal.label}
              </Link>
            ))}
          </nav>
        </div>

        {!isPortalPresentationMode() && <div className="flex items-center gap-3">
          <Suspense fallback={<AuthControlsFallback />}>
            <Show when="signed-out">
              <SignInButton mode="redirect">
                <button
                  type="button"
                  className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-800 transition hover:border-teal-700 hover:text-teal-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800"
                >
                  Sign in
                </button>
              </SignInButton>
              <SignUpButton mode="redirect">
                <button
                  type="button"
                  className="rounded-lg bg-teal-800 px-3.5 py-2 text-sm font-medium text-white transition hover:bg-teal-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800"
                >
                  Create account
                </button>
              </SignUpButton>
            </Show>

            <Show when="signed-in">
              <div className="flex items-center gap-3">
                <SignOutButton redirectUrl="/">
                  <button
                    type="button"
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800"
                  >
                    Sign out
                  </button>
                </SignOutButton>
                <UserButton />
              </div>
            </Show>
          </Suspense>
        </div>}
      </div>
    </header>
  );
}
