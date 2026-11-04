"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import type { ProjectRead, TermsRead } from "@experiencebridge/api-client";
import { usePortalResource } from "@/lib/api/use-portal-resource";
import { useVisibleRefresh } from "@/lib/api/use-visible-refresh";
import { loadOpportunities } from "../lib/api-records";
import type { StudentApplicationDetails } from "../lib/types";

export interface OpportunityRecord {
  title: string;
  org: string;
  termsVersion: string;
  weeklyHours: number;
  durationWeeks: number;
  ipTerms: string;
  confidentiality: string;
  description?: string;
  startOn?: string;
  dueOn?: string;
  feeAmount?: string | number;
  currency?: string;
  paymentTerms?: string;
  milestonesCount?: number;
  project?: ProjectRead;
  terms?: TermsRead;
}

export function StudentOpportunities({
  opportunities: suppliedOpportunities,
  applications,
  onApply,
  basePath = "/student",
}: {
  opportunities?: Record<string, OpportunityRecord>;
  applications: StudentApplicationDetails[];
  onApply: (projectId: string) => void;
  basePath?: string;
}) {
  const live = usePortalResource(loadOpportunities, !suppliedOpportunities);
  useVisibleRefresh(live.reload, !suppliedOpportunities);
  const opportunities: Record<string, OpportunityRecord> = useMemo(
    () => suppliedOpportunities ?? live.data?.opportunities ?? {},
    [suppliedOpportunities, live.data]
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [availabilityFilter, setAvailabilityFilter] = useState<"all" | "eligible" | "applied">(
    "all"
  );
  const [sortBy, setSortBy] = useState<"newest" | "deadline" | "commitment">("newest");

  const entries = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const filtered = Object.entries(opportunities).filter(([projId, opp]) => {
      const existingApp = applications.find(
        (a) => a.projectId === projId && a.status !== "withdrawn"
      );
      if (availabilityFilter === "eligible" && existingApp) return false;
      if (availabilityFilter === "applied" && !existingApp) return false;

      if (!query) return true;
      const haystack = [
        opp.title,
        opp.org,
        opp.description ?? "",
        opp.ipTerms,
        opp.confidentiality,
        opp.paymentTerms ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });

    return filtered.sort(([, a], [, b]) => {
      if (sortBy === "deadline") {
        const dueA = a.dueOn ? Date.parse(a.dueOn) : Number.MAX_SAFE_INTEGER;
        const dueB = b.dueOn ? Date.parse(b.dueOn) : Number.MAX_SAFE_INTEGER;
        return dueA - dueB;
      }
      if (sortBy === "commitment") {
        return (a.weeklyHours || 0) - (b.weeklyHours || 0);
      }
      const createdA = a.project?.created_at ? Date.parse(a.project.created_at) : 0;
      const createdB = b.project?.created_at ? Date.parse(b.project.created_at) : 0;
      return createdB - createdA;
    });
  }, [opportunities, applications, searchQuery, availabilityFilter, sortBy]);

  const totalCount = Object.keys(opportunities).length;

  return (
    <section
      id="opportunities"
      className="pt-4 border-t border-slate-200 space-y-4 animate-fade-in"
    >
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
            Project Discovery
          </span>
          <h2 className="mt-1 text-lg font-bold text-slate-900">
            Browse Open Approved Projects ({entries.length} of {totalCount})
          </h2>
          <p className="text-xs text-slate-500">
            Published opportunities from verified organizations with approved scope and terms.
          </p>
        </div>

        {/* Search, Filter & Sort Controls (§4) */}
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="search"
            aria-label="Search published projects"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search title, scope, terms..."
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-teal-700 focus:outline-none"
          />
          <select
            aria-label="Filter projects by application eligibility"
            value={availabilityFilter}
            onChange={(e) =>
              setAvailabilityFilter(e.target.value as "all" | "eligible" | "applied")
            }
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:border-teal-700 focus:outline-none"
          >
            <option value="all">All Published</option>
            <option value="eligible">Eligible to Apply</option>
            <option value="applied">Already Applied</option>
          </select>
          <select
            aria-label="Sort published projects"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "newest" | "deadline" | "commitment")}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:border-teal-700 focus:outline-none"
          >
            <option value="newest">Sort: Newest</option>
            <option value="deadline">Sort: Target Deadline</option>
            <option value="commitment">Sort: Weekly Hours</option>
          </select>
        </div>
      </div>

      {!suppliedOpportunities && live.loading && (
        <p role="status" className="text-xs text-slate-500">
          Loading published projects...
        </p>
      )}
      {!suppliedOpportunities && live.error && (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          {live.error}
        </p>
      )}

      {entries.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center space-y-2">
          <p className="text-sm font-semibold text-slate-700">
            {totalCount === 0
              ? "No published projects are currently open for applications."
              : "No published projects match your search or filter."}
          </p>
          {totalCount > 0 && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setAvailabilityFilter("all");
              }}
              className="text-xs font-semibold text-teal-800 hover:underline"
            >
              Reset discovery filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {entries.map(([projId, opp]) => {
            const existingApp = applications.find(
              (a) => a.projectId === projId && a.status !== "withdrawn"
            );
            const hasApplied = Boolean(existingApp);
            return (
              <div
                key={projId}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between gap-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-slate-500">{opp.org}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                        hasApplied
                          ? "bg-teal-50 text-teal-900 border-teal-200"
                          : "bg-emerald-50 text-emerald-800 border-emerald-200"
                      }`}
                    >
                      {hasApplied
                        ? `Applied • ${existingApp?.status ?? "submitted"}`
                        : "Eligible to Apply"}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">{opp.title}</h3>
                  {opp.description && (
                    <p className="text-xs text-slate-600 line-clamp-2">{opp.description}</p>
                  )}
                  <div className="flex flex-wrap gap-1.5 pt-1 text-[10px] font-medium text-slate-600">
                    <span className="rounded bg-slate-100 px-2 py-0.5">
                      {opp.weeklyHours} hrs/wk
                    </span>
                    <span className="rounded bg-slate-100 px-2 py-0.5">
                      {opp.durationWeeks} weeks
                    </span>
                    {opp.currency && opp.feeAmount && (
                      <span className="rounded bg-teal-50 text-teal-800 border border-teal-100 px-2 py-0.5 font-semibold">
                        {opp.currency} {opp.feeAmount}
                      </span>
                    )}
                    {typeof opp.milestonesCount === "number" && opp.milestonesCount > 0 && (
                      <span className="rounded bg-slate-100 px-2 py-0.5">
                        {opp.milestonesCount} milestone{opp.milestonesCount === 1 ? "" : "s"}
                      </span>
                    )}
                    <span className="rounded bg-slate-100 px-2 py-0.5">{opp.ipTerms}</span>
                  </div>
                  {opp.dueOn && (
                    <p className="text-[11px] text-slate-400">
                      Target Completion: <strong className="text-slate-600">{opp.dueOn}</strong>
                    </p>
                  )}
                </div>

                {hasApplied && existingApp ? (
                  <div className="flex items-center gap-2">
                    <Link
                      href={`${basePath}/applications/${existingApp.id}`}
                      className="w-full rounded-lg border border-teal-300 bg-teal-50/70 px-3 py-2 text-center text-xs font-bold text-teal-900 hover:bg-teal-100 transition"
                    >
                      View Submitted Application →
                    </Link>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => onApply(projId)}
                    className="w-full rounded-lg bg-teal-800 px-3 py-2 text-xs font-bold text-white hover:bg-teal-900 transition"
                  >
                    Apply for Project →
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
