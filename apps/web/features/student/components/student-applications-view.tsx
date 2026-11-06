"use client";

import { useState } from "react";
import { isPortalPresentationMode } from "@/lib/auth/portal-presentation";
import { usePortalResource } from "@/lib/api/use-portal-resource";
import { loadApplications } from "../lib/api-records";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import { BadgeCheck, FileText, RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, EmptyState, NextStepHint, PageHeader, Skeleton } from "@/components/ui/primitives";
import { Pill, StatusBadge } from "@/components/ui/status-badge";
import { StudentOpportunities } from "./student-opportunities";
import { useVisibleRefresh } from "@/lib/api/use-visible-refresh";
import { ApplyModal } from "./apply-modal";
import { syntheticApplicationsList } from "../lib/mock-data";
import type { ApplicationStatus, StudentApplicationDetails } from "../lib/types";

const STORAGE_KEY = "experiencebridge_student_applications_list";

function getInitialApplications(): StudentApplicationDetails[] {
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as StudentApplicationDetails[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Ignore read errors
    }
  }
  return syntheticApplicationsList ?? [];
}

export function StudentApplicationsView() {
  const pathname = usePathname();
  const isDevPreview = Boolean(pathname?.startsWith("/dev/student"));
  const preview = isDevPreview || isPortalPresentationMode();
  const live = usePortalResource(loadApplications, !preview);
  useVisibleRefresh(live.reload, !preview);
  const [selectedProjectId, setSelectedProjectId] = useState<string>();
  const basePath = isDevPreview ? "/dev/student" : "/student";

  const [previewApplications, setApplications] = useState<StudentApplicationDetails[]>(() => preview ? getInitialApplications() : []);
  const applications = preview ? previewApplications : live.data ?? [];
  const [filter, setFilter] = useState<"all" | ApplicationStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);

  // Reset defaults handler
  const handleResetDefaults = () => {
    if (!preview) { void live.reload().catch(() => {}); return; }
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // Ignore
      }
    }
    setApplications(syntheticApplicationsList ?? []);
    toast("Preview data reset.");
  };

  // Add new application from ApplyModal
  const handleApplicationCreated = (newApp: StudentApplicationDetails) => {
    if (!preview) { toast.success("Application sent", { description: "The organisation will review it. We'll show updates here." }); void live.reload().catch(() => {}); return; }
    const updated = [newApp, ...applications];
    setApplications(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated, null, 2));
    } catch (err) {
      console.error("Failed to save application to localStorage:", err);
    }
    toast.success("Application sent", { description: newApp.projectTitle });
  };

  const applicationsList = applications ?? [];

  // Filter by status and search query
  const filteredApps = applicationsList.filter((app) => {
    const matchesFilter = filter === "all" || app.status === filter;
    const matchesSearch =
      searchQuery.trim() === "" ||
      app.projectTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.organizationName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.declaredSkills.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  const offeredCount = applicationsList.filter((a) => a.status === "offered").length;
  const underReviewCount = applicationsList.filter((a) => a.status === "under_review").length;
  const shortlistedCount = applicationsList.filter((a) => a.status === "shortlisted").length;
  const submittedCount = applicationsList.filter((a) => a.status === "submitted").length;

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Student" title="Find projects"
        description="Real, short projects from verified organisations. Apply to the ones that fit your skills."
        actions={<>
          <Button variant="secondary" size="sm" onClick={handleResetDefaults}><RefreshCw aria-hidden />{preview ? "Reset preview" : "Refresh"}</Button>
          <Button size="sm" onClick={() => { setSelectedProjectId(undefined); setIsApplyModalOpen(true); }}>Apply to a project</Button>
        </>} />

      {!preview && live.error && (
        <p role="alert" className="rounded-[var(--radius-card)] border border-danger/20 bg-danger-bg p-4 text-sm text-danger-text">
          We couldn&apos;t load your applications. <button type="button" className="font-medium underline" onClick={() => void live.reload().catch(() => {})}>Try again</button>
        </p>
      )}

      {!preview && <StudentOpportunities applications={applicationsList} basePath={basePath} onApply={id => { setSelectedProjectId(id); setIsApplyModalOpen(true); }} />}

      <section aria-labelledby="my-applications" className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="my-applications" className="text-lg font-semibold text-ink-900">Your applications</h2>
            <p className="text-sm text-ink-500">{offeredCount > 0 ? `You have ${offeredCount} offer${offeredCount === 1 ? "" : "s"} waiting for your reply.` : "Track each application from sent to offer."}</p>
          </div>
          <div className="relative sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400" aria-hidden />
            <input type="search" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search your applications"
              aria-label="Search your applications" className="h-10 w-full rounded-[var(--radius-control)] border border-line-strong bg-surface pl-9 pr-3 text-[16px] text-ink-900 placeholder:text-ink-400 focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-100 sm:text-sm" />
          </div>
        </div>

        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
          {([
            { label: `All (${applicationsList.length})`, value: "all" },
            { label: `Offers (${offeredCount})`, value: "offered" },
            { label: `Shortlisted (${shortlistedCount})`, value: "shortlisted" },
            { label: `Under review (${underReviewCount})`, value: "under_review" },
            { label: `Sent (${submittedCount})`, value: "submitted" },
          ] as const).map((tab) => (
            <button key={tab.value} type="button" onClick={() => setFilter(tab.value)} aria-pressed={filter === tab.value}
              className={`shrink-0 rounded-full px-3 py-1.5 text-[13px] font-medium transition ${filter === tab.value ? "bg-ink-900 text-white" : "border border-line bg-surface text-ink-700 hover:border-ink-400"}`}>
              {tab.label}
            </button>
          ))}
        </div>

        {!preview && live.loading && !live.data ? (
          <div className="space-y-3">{[0, 1].map((i) => <Skeleton key={i} className="h-32" />)}</div>
        ) : filteredApps.length === 0 ? (
          <EmptyState icon={FileText}
            title={applicationsList.length ? "No applications match" : "You haven't applied yet"}
            description={applicationsList.length ? "Clear the search or pick another filter." : "Pick a project above and send a short application. It takes about five minutes."}
            action={applicationsList.length ? <Button variant="secondary" onClick={() => { setFilter("all"); setSearchQuery(""); }}>Clear filters</Button> : undefined} />
        ) : (
          <div className="grid gap-4">
            {filteredApps.map((app) => {
              const detailHref = `${basePath}/applications/${app.id}`;
              return (
                <Card key={app.id} className={app.status === "offered" ? "border-gold-500/40 ring-4 ring-gold-100" : undefined}>
                  <div className="space-y-4 p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge status={app.status} />
                          {app.organizationVerified && <Pill tone="gold"><BadgeCheck className="size-3.5" aria-hidden />Verified organisation</Pill>}
                        </div>
                        <h3 className="text-base font-semibold text-ink-900"><Link href={detailHref} className="hover:text-brand-700">{app.projectTitle}</Link></h3>
                        <p className="text-[13px] text-ink-500">Applied {String(app.appliedAt ?? "").slice(0, 10)}</p>
                      </div>
                      <Button asChild variant={app.status === "offered" ? "primary" : "secondary"} size="sm">
                        <Link href={detailHref}>{app.status === "offered" ? "Review offer" : "View details"}</Link>
                      </Button>
                    </div>
                    {app.status === "offered" && (
                      <NextStepHint tone="gold" waitingOn="You" detail={app.offerDeadline ? `Reply to the offer · ${app.offerDeadline}` : "Accept or decline the offer"} />
                    )}
                    {app.motivationStatement && <p className="line-clamp-3 text-sm text-ink-700">{app.motivationStatement}</p>}
                    {app.declaredSkills.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {app.declaredSkills.map((skill, idx) => <Pill key={idx} tone="brand">{skill}</Pill>)}
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <ApplyModal key={selectedProjectId ?? "all-projects"} initialProjectId={selectedProjectId} preview={preview}
        isOpen={isApplyModalOpen}
        onClose={() => setIsApplyModalOpen(false)}
        onApplicationCreated={handleApplicationCreated}
        existingApplications={applicationsList}
      />
    </div>
  );
}
