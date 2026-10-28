import Link from "next/link";
import type { StudentApplicationSummary } from "../lib/types";

function getStatusBadgeClass(status: StudentApplicationSummary["status"]) {
  switch (status) {
    case "offered":
      return "bg-amber-100 text-amber-900 border-amber-300";
    case "shortlisted":
      return "bg-teal-100 text-teal-900 border-teal-300";
    case "under_review":
      return "bg-sky-100 text-sky-900 border-sky-300";
    case "submitted":
      return "bg-slate-100 text-slate-800 border-slate-300";
    case "rejected":
      return "bg-rose-100 text-rose-800 border-rose-300";
    case "withdrawn":
      return "bg-slate-100 text-slate-600 border-slate-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
}

function getStatusLabel(status: StudentApplicationSummary["status"]) {
  switch (status) {
    case "offered":
      return "Offer Extended";
    case "shortlisted":
      return "Shortlisted";
    case "under_review":
      return "Under Review";
    case "submitted":
      return "Submitted";
    case "rejected":
      return "Not Selected";
    case "withdrawn":
      return "Withdrawn";
    default:
      return status;
  }
}

export function ApplicationsOverviewCard({
  applications,
}: {
  applications: StudentApplicationSummary[];
}) {
  if (applications.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center">
        <h3 className="text-sm font-semibold text-slate-800">No applications submitted</h3>
        <p className="mt-1 text-xs text-slate-500">
          Find matching projects from partner organizations and apply with your verified skills.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-wide uppercase text-slate-800">
          My Applications ({applications.length})
        </h2>
        <Link
          href="/student/applications"
          className="text-xs font-semibold text-teal-800 hover:text-teal-900"
        >
          View all →
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        <div className="divide-y divide-slate-100">
          {applications.map((app) => (
            <div
              key={app.id}
              className="p-4 transition hover:bg-slate-50/70 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
            >
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  {app.organizationName}
                </span>
                <h3 className="text-sm font-bold text-slate-900">
                  {app.projectTitle}
                </h3>
                <div className="mt-1 flex items-center gap-3 text-[11px] text-slate-500">
                  <span>Applied: {app.appliedAt}</span>
                  <span>•</span>
                  <span>Acknowledged: {app.termsVersionViewed}</span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 self-start sm:self-center">
                <span
                  className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full border ${getStatusBadgeClass(
                    app.status
                  )}`}
                >
                  {getStatusLabel(app.status)}
                </span>

                <Link
                  href={`/student/applications/${app.id}`}
                  className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                >
                  Details
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
