import type { StudentDecisionAudit } from "../lib/types";

export function DecisionsActivityCard({
  decisions,
}: {
  decisions: StudentDecisionAudit[];
}) {
  if (decisions.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center">
        <h3 className="text-sm font-semibold text-slate-800">No recent evaluations</h3>
        <p className="mt-1 text-xs text-slate-500">
          Mentor evaluations and organization acceptance notices will appear here once work is submitted.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-wide uppercase text-slate-800">
          Recent Evaluations & Decisions
        </h2>
        <span className="text-[11px] text-slate-500">Separated Evidence Records</span>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs divide-y divide-slate-100">
        {decisions.map((dec) => {
          const isMentor = dec.authorType === "mentor";

          return (
            <div key={dec.id} className="py-3 first:pt-0 last:pb-0 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                      isMentor
                        ? "bg-purple-100 text-purple-900 border border-purple-200"
                        : "bg-blue-100 text-blue-900 border border-blue-200"
                    }`}
                  >
                    {isMentor ? "Mentor Assessment" : "Org Acceptance"}
                  </span>
                  <span className="text-xs font-semibold text-slate-800">
                    {dec.authorName}
                  </span>
                </div>
                <span className="text-[11px] text-slate-400">{dec.createdAt}</span>
              </div>

              <div className="text-xs font-medium text-slate-900">
                {dec.actionText} • <span className="text-slate-500">{dec.projectTitle}</span>
              </div>

              <blockquote className="rounded-md bg-slate-50 border-l-2 border-slate-300 p-2 text-xs italic text-slate-600">
                &ldquo;{dec.excerpt}&rdquo;
              </blockquote>
            </div>
          );
        })}
      </div>
    </div>
  );
}
