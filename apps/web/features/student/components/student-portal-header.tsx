"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function StudentPortalHeader({
  studentName,
  isSynthetic,
}: {
  studentName?: string;
  isSynthetic?: boolean;
}) {
  const pathname = usePathname();
  const isDevPreview = pathname.startsWith("/dev/student");
  const basePath = isDevPreview ? "/dev/student" : "/student";

  const studentNavItems = [
    { label: "Dashboard", href: `${basePath}/dashboard` },
    { label: "Applications", href: `${basePath}/applications` },
    { label: "Projects", href: `${basePath}/projects` },
    { label: "Passport", href: `${basePath}/passport` },
    { label: "Profile", href: `${basePath}/profile` },
  ] as const;

  // Inside the signed-in AppShell the shell owns navigation; keep only a quiet page heading.
  if (!isDevPreview) {
    return (
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[13px] font-medium text-brand-600">Student</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink-900 sm:text-[28px]">
            {studentName && studentName !== "Student" ? `Welcome back, ${studentName.split(" ")[0]}` : "Your workspace"}
          </h1>
        </div>
        <Link href="/student/applications#opportunities" className="inline-flex h-10 items-center gap-1.5 self-start rounded-[var(--radius-control)] bg-brand-600 px-4 text-sm font-medium text-white hover:bg-brand-700 sm:self-auto">
          Find projects <span aria-hidden>→</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="border-b border-slate-200 bg-white">
      {isSynthetic && (
        <div className="bg-amber-50 px-4 py-1.5 text-xs font-medium text-amber-900 border-b border-amber-200/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            <span><strong>Preview:</strong> sample data for local design work.</span>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-5 pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-teal-800 bg-teal-50 px-2 py-0.5 rounded">
                Student Portal
              </span>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
              {studentName ? `Welcome back, ${studentName}` : "Student Workspace"}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href={`${basePath}/applications#opportunities`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-teal-800"
            >
              <span>Explore Opportunities</span>
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav aria-label="Student portal navigation" className="mt-5 flex gap-1 sm:gap-2 overflow-x-auto pb-1">
          {studentNavItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href.endsWith("/dashboard") && pathname === basePath);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  isActive
                    ? "bg-teal-800 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
