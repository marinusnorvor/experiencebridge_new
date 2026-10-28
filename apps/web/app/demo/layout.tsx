import type { ReactNode } from "react";
import Link from "next/link";

const demoPortals = [
  { label: "Student", href: "/demo/student" },
  { label: "Organization", href: "/demo/organization" },
  { label: "Mentor", href: "/demo/mentor" },
  { label: "Admin", href: "/demo/admin" },
] as const;

export default function DemoLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-[calc(100vh-4.5rem)]">
      <div className="border-b border-amber-300 bg-amber-50 px-4 py-3 text-center text-sm font-semibold text-amber-950">
        Demo environment · Synthetic sample content · No real accounts, API calls,
        or database actions
      </div>
      <nav
        aria-label="Demo portals"
        className="border-b border-slate-200 bg-white px-4 py-3"
      >
        <div className="mx-auto flex max-w-6xl flex-wrap gap-2">
          {demoPortals.map((portal) => (
            <Link
              key={portal.href}
              href={portal.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-teal-50 hover:text-teal-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800"
            >
              {portal.label}
            </Link>
          ))}
        </div>
      </nav>
      {children}
    </div>
  );
}
