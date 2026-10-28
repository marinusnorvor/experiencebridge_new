import Link from "next/link";
import type { StudentActionRequiredItem } from "../lib/types";

export function ActionRequiredBanner({
  items,
}: {
  items: StudentActionRequiredItem[];
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-wide uppercase text-slate-800 flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-ping" />
          Action Required
          <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
            {items.length}
          </span>
        </h2>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((item) => {
          const isHigh = item.urgency === "high";

          return (
            <div
              key={item.id}
              className={`rounded-xl border p-4 shadow-xs transition ${
                isHigh
                  ? "border-amber-300 bg-amber-50/60"
                  : "border-slate-200 bg-white"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span
                    className={`inline-block text-[11px] font-semibold uppercase tracking-wider rounded px-2 py-0.5 ${
                      isHigh
                        ? "bg-amber-200 text-amber-900"
                        : "bg-teal-100 text-teal-800"
                    }`}
                  >
                    {item.type === "offer_pending"
                      ? "Offer Received"
                      : item.type === "revision_requested"
                      ? "Revision Needed"
                      : "Submission Due"}
                  </span>
                  <h3 className="mt-1.5 text-sm font-semibold text-slate-900">
                    {item.title}
                  </h3>
                </div>

                {item.deadlineText && (
                  <span className="whitespace-nowrap text-xs font-medium text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded">
                    {item.deadlineText}
                  </span>
                )}
              </div>

              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                {item.description}
              </p>

              <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-200/60">
                <span className="text-[11px] font-medium text-slate-500">
                  {item.organizationName}
                </span>
                <Link
                  href={item.actionHref}
                  className={`inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-semibold shadow-2xs transition ${
                    isHigh
                      ? "bg-amber-700 text-white hover:bg-amber-800"
                      : "bg-teal-800 text-white hover:bg-teal-900"
                  }`}
                >
                  <span>{item.actionLabel}</span>
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
