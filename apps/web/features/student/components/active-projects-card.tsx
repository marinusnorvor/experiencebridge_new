import Link from "next/link";
import type { StudentActiveProject } from "../lib/types";

export function ActiveProjectsCard({
  projects,
}: {
  projects: StudentActiveProject[];
}) {
  if (projects.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <h3 className="mt-3 text-sm font-semibold text-slate-800">No active projects</h3>
        <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
          You don&apos;t have an active project yet. Browse approved opportunities to get started.
        </p>
        <div className="mt-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-lg bg-teal-800 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-teal-900"
          >
            Explore Projects
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-wide uppercase text-slate-800">
          Active Projects ({projects.length})
        </h2>
        <Link
          href="/student/projects"
          className="text-xs font-semibold text-teal-800 hover:text-teal-900"
        >
          View all projects →
        </Link>
      </div>

      <div className="space-y-3">
        {projects.map((proj) => (
          <div
            key={proj.participationId}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-slate-300"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <span className="text-[11px] font-semibold text-teal-800 uppercase tracking-wider">
                  {proj.organizationName}
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  {proj.projectTitle}
                </h3>
              </div>

              <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 border border-emerald-200">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                Active Engagement
              </span>
            </div>

            {/* Mentor info */}
            <div className="mt-3 flex items-center gap-2 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
              <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span>
                Assigned Mentor: <strong className="text-slate-800">{proj.mentorName}</strong>
              </span>
            </div>

            {/* Current Milestone & Progress */}
            <div className="mt-4 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-700">
                  Current: {proj.currentMilestone}
                </span>
                <span className="font-semibold text-teal-800">
                  {proj.progressPercent}%
                </span>
              </div>

              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-teal-800 transition-all duration-300"
                  style={{ width: `${proj.progressPercent}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                <span>Next Milestone Due: {proj.nextMilestoneDue}</span>
                <span>Target completion: Q4 2026</span>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100">
              <Link
                href={`/student/projects/${proj.participationId}`}
                className="text-xs font-semibold text-slate-700 hover:text-teal-800"
              >
                Workspace & Milestones →
              </Link>

              <Link
                href={`/student/projects/${proj.participationId}/submit`}
                className="inline-flex items-center gap-1 rounded-lg bg-teal-800 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-teal-900"
              >
                <span>Submit Deliverable</span>
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
