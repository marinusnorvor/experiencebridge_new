import Link from "next/link";
import type { StudentPassportTeaser } from "../lib/types";

export function PassportTeaserCard({
  summary,
}: {
  summary: StudentPassportTeaser;
}) {
  return (
    <div className="rounded-xl border border-teal-200 bg-gradient-to-br from-teal-900 to-slate-900 p-5 text-white shadow-xs">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="inline-block text-[10px] font-bold uppercase tracking-wider bg-teal-800/80 text-teal-200 px-2 py-0.5 rounded border border-teal-700/60">
            Private Preview
          </span>
          <h3 className="mt-2 text-base font-bold text-white">
            Experience Passport
          </h3>
          <p className="mt-1 text-xs text-slate-300 max-w-sm leading-relaxed">
            Your evidence-backed record of completed milestones, independent mentor assessments, and organization deliverables.
          </p>
        </div>

        <div className="hidden sm:flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-800/50 text-teal-300 border border-teal-700/50">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-teal-800/60 pt-3">
        <div className="text-center">
          <div className="text-lg font-bold text-teal-300">
            {summary.verifiedClaimsCount}
          </div>
          <div className="text-[10px] text-slate-400 uppercase tracking-wide">
            Verified Claims
          </div>
        </div>

        <div className="text-center border-x border-teal-800/60">
          <div className="text-lg font-bold text-teal-300">
            {summary.completedProjectsCount}
          </div>
          <div className="text-[10px] text-slate-400 uppercase tracking-wide">
            Projects Accepted
          </div>
        </div>

        <div className="text-center">
          <div className="text-lg font-bold text-teal-300">
            {summary.mentorObservationsCount}
          </div>
          <div className="text-[10px] text-slate-400 uppercase tracking-wide">
            Mentor Reviews
          </div>
        </div>
      </div>

      <div className="mt-4 pt-2">
        <Link
          href="/student/passport"
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-teal-700/80 px-3 py-2 text-xs font-semibold text-white transition hover:bg-teal-600 focus-visible:outline-2 focus-visible:outline-white"
        >
          <span>Preview Private Passport (STU-10)</span>
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
