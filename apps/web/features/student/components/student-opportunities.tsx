"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import type { ProjectRead, TermsRead } from "@experiencebridge/api-client";
import { usePortalResource } from "@/lib/api/use-portal-resource";
import { useVisibleRefresh } from "@/lib/api/use-visible-refresh";
import { loadOpportunities } from "../lib/api-records";
import type { StudentApplicationDetails } from "../lib/types";
import { Banknote, BadgeCheck, CalendarDays, Clock, FolderSearch, Search, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, EmptyState, Skeleton } from "@/components/ui/primitives";
import { Pill, StatusBadge } from "@/components/ui/status-badge";

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
    <section id="opportunities" aria-labelledby="opportunities-heading" className="scroll-mt-20 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="opportunities-heading" className="text-lg font-semibold text-ink-900">Open projects</h2>
          <p className="text-sm text-ink-500">
            {totalCount ? `${entries.length} of ${totalCount} open project${totalCount === 1 ? "" : "s"} · every organisation is verified` : "Every organisation is verified before it can post."}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
          <div className="relative col-span-2 sm:w-60">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400" aria-hidden />
            <input type="search" aria-label="Search open projects" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search projects"
              className="h-10 w-full rounded-[var(--radius-control)] border border-line-strong bg-surface pl-9 pr-3 text-[16px] text-ink-900 placeholder:text-ink-400 focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-100 sm:text-sm" />
          </div>
          <select aria-label="Show projects" value={availabilityFilter}
            onChange={(e) => setAvailabilityFilter(e.target.value as "all" | "eligible" | "applied")}
            className="h-10 rounded-[var(--radius-control)] border border-line-strong bg-surface px-2.5 text-sm text-ink-700">
            <option value="all">All projects</option>
            <option value="eligible">Not applied yet</option>
            <option value="applied">Already applied</option>
          </select>
          <select aria-label="Sort projects" value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "newest" | "deadline" | "commitment")}
            className="h-10 rounded-[var(--radius-control)] border border-line-strong bg-surface px-2.5 text-sm text-ink-700">
            <option value="newest">Newest first</option>
            <option value="deadline">Due soonest</option>
            <option value="commitment">Fewest hours</option>
          </select>
        </div>
      </div>

      {!suppliedOpportunities && live.error && (
        <p role="alert" className="rounded-[var(--radius-card)] border border-danger/20 bg-danger-bg p-3 text-sm text-danger-text">
          We couldn&apos;t load open projects. <button type="button" className="font-medium underline" onClick={() => void live.reload().catch(() => {})}>Try again</button>
        </p>
      )}

      {!suppliedOpportunities && live.loading && !live.data ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-56" />)}</div>
      ) : entries.length === 0 ? (
        <EmptyState icon={FolderSearch}
          title={totalCount === 0 ? "No open projects yet" : "No projects match"}
          description={totalCount === 0 ? "New projects appear here as soon as they're approved. Check back soon." : "Try a different search or show all projects."}
          action={totalCount > 0 ? <Button variant="secondary" onClick={() => { setSearchQuery(""); setAvailabilityFilter("all"); }}>Show all projects</Button> : undefined} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {entries.map(([projId, opp]) => {
            const existingApp = applications.find((a) => a.projectId === projId && a.status !== "withdrawn");
            const places = opp.project?.capacity;
            return (
              <Card key={projId} className="flex flex-col justify-between gap-4 p-5 transition hover:-translate-y-0.5 hover:border-brand-600/40">
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <Pill tone="gold"><BadgeCheck className="size-3.5" aria-hidden />Verified organisation</Pill>
                    {existingApp && <StatusBadge status={existingApp.status} />}
                  </div>
                  <h3 className="text-base font-semibold leading-snug text-ink-900">{opp.title}</h3>
                  {opp.description && <p className="line-clamp-3 text-sm text-ink-500">{opp.description}</p>}
                  <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 pt-1 text-[13px]">
                    <div className="flex items-center gap-1.5 text-ink-700"><Clock className="size-3.5 text-ink-400" aria-hidden /><dt className="sr-only">Time</dt><dd>{opp.weeklyHours} hrs/week</dd></div>
                    <div className="flex items-center gap-1.5 text-ink-700"><CalendarDays className="size-3.5 text-ink-400" aria-hidden /><dt className="sr-only">Length</dt><dd>{opp.durationWeeks} week{opp.durationWeeks === 1 ? "" : "s"}</dd></div>
                    {typeof places === "number" && <div className="flex items-center gap-1.5 text-ink-700"><Users className="size-3.5 text-ink-400" aria-hidden /><dt className="sr-only">Places</dt><dd>{places} place{places === 1 ? "" : "s"}</dd></div>}
                    {opp.currency && opp.feeAmount ? (
                      <div className="flex items-center gap-1.5 font-medium text-brand-700"><Banknote className="size-3.5" aria-hidden /><dt className="sr-only">Pay</dt><dd>{opp.currency} {opp.feeAmount}</dd></div>
                    ) : null}
                  </dl>
                  {opp.dueOn && <p className="text-xs text-ink-500">Finish by {opp.dueOn}</p>}
                </div>
                {existingApp ? (
                  <Button asChild variant="secondary" className="w-full"><Link href={`${basePath}/applications/${existingApp.id}`}>View your application</Link></Button>
                ) : (
                  <Button className="w-full" onClick={() => onApply(projId)}>Apply</Button>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
