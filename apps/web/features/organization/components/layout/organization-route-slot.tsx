"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getNavItemByPath } from "../../lib/organization-routes";

export function OrganizationRouteSlot({
  slugPath,
}: {
  slugPath?: string;
}) {
  const currentPathname = usePathname();
  const effectivePath = slugPath ? `/organization/${slugPath}` : currentPathname;
  const navItem = getNavItemByPath(effectivePath);

  return (
    <main className="p-6 sm:p-8 lg:p-10 max-w-4xl">
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 sm:p-10 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-teal-50 text-teal-800">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </svg>
        </div>

        <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-mono font-medium text-slate-700">
          <span>{navItem ? navItem.screenId : "ORG-ROUTE"}</span>
          <span>·</span>
          <span>{navItem ? `Checkpoint ${navItem.checkpoint}` : "Upcoming Checkpoint"}</span>
        </div>

        <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900">
          {navItem ? navItem.label : "Organization Route Slot"}
        </h1>

        <p className="mt-2 text-sm leading-6 text-slate-600 max-w-lg mx-auto">
          {navItem
            ? `The route ${navItem.href} is successfully registered and connected to the Organization Portal layout. Screen implementation is scheduled for Checkpoint ${navItem.checkpoint}.`
            : `The route ${effectivePath} is connected to the Organization Portal shell layout.`}
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/organization/dashboard"
            className="rounded-lg bg-teal-800 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-teal-900 focus-visible:outline-2 focus-visible:outline-teal-800"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}

