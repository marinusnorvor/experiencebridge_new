"use client";

import { useState } from "react";
import { isPortalPresentationMode } from "@/lib/auth/portal-presentation";
import { usePortalResource } from "@/lib/api/use-portal-resource";
import { useVisibleRefresh } from "@/lib/api/use-visible-refresh";
import { loadParticipations } from "../lib/api-records";
import Link from "next/link";
import { PageSkeleton } from "@/components/ui/primitives";
import { usePathname } from "next/navigation";
import { StudentPortalHeader } from "./student-portal-header";
import { syntheticParticipationsList } from "../lib/mock-data";
import type { ParticipationStatus, StudentParticipationSummaryItem } from "../lib/types";

const STORAGE_KEY = "experiencebridge_student_projects_list";

function getInitialProjects(): StudentParticipationSummaryItem[] {
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as StudentParticipationSummaryItem[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Ignore read errors
    }
  }
  return syntheticParticipationsList ?? [];
}

export function StudentProjectsView() {
  const pathname = usePathname();
  const isDevPreview = Boolean(pathname?.startsWith("/dev/student"));
  const preview = isDevPreview || isPortalPresentationMode();
  const live = usePortalResource(loadParticipations, !preview);
  useVisibleRefresh(live.reload, !preview);
  const basePath = isDevPreview ? "/dev/student" : "/student";

  const [filter, setFilter] = useState<"all" | ParticipationStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [previewProjects, setProjects] = useState<StudentParticipationSummaryItem[]>(() => preview ? getInitialProjects() : []);
  const projects = preview ? previewProjects : live.data ?? [];

  // Sync projects with localStorage on refresh / reset
  const handleResetDefaults = () => {
    if (!preview) { void live.reload().catch(() => {}); return; }
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // Ignore
      }
    }
    setProjects(syntheticParticipationsList ?? []);
  };

  const projectsList = projects ?? [];

  // Filter projects by both status filter and live search query
  const filteredProjects = projectsList.filter((p) => {
    const matchesFilter = filter === "all" || p.status === filter;
    const matchesSearch =
      searchQuery.trim() === "" ||
      p.projectTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.organizationName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.mentorName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const activeCount = projectsList.filter((p) => p.status === "active").length;
  const underReviewCount = projectsList.filter((p) => p.status === "under_review").length;
  const completedCount = projectsList.filter((p) => p.status === "completed").length;
  const totalWeeklyHours = projectsList
    .filter((p) => p.status === "active" || p.status === "under_review")
    .reduce((sum, p) => sum + (p.weeklyHours || 0), 0);

  return (
    <div className="space-y-6">
      {preview && <StudentPortalHeader studentName="Stella Appiok" isSynthetic />}
        {!preview && live.loading && !live.data && <PageSkeleton />}
        {!preview && live.error && <p role="alert" className="rounded-[var(--radius-card)] border border-danger/20 bg-danger-bg p-3 text-sm text-danger-text">We couldn&apos;t load your projects. Check your connection and try again.</p>}
        {/* Page Title & Context */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-[13px] font-medium text-brand-600">Student</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink-900 sm:text-[28px]">
              My projects
            </h1>
            <p className="mt-0.5 text-xs text-slate-500 max-w-2xl">
              Projects you&apos;ve joined. Open one to see milestones, submit work and read feedback.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleResetDefaults}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-2xs hover:bg-slate-50 transition"
            >
              <svg className="h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>{preview ? "Reset preview" : "Refresh"}</span>
            </button>

            <Link
              href={`${basePath}/applications`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition"
            >
              <svg className="h-3.5 w-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Applications</span>
            </Link>

            <Link
              href={`${basePath}/passport`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition"
            >
              <svg className="h-3.5 w-3.5 text-teal-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span>Passport</span>
            </Link>

            <Link
              href={`${basePath}/applications#opportunities`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-teal-800 px-3.5 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-teal-900 transition"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span>Find projects</span>
            </Link>
          </div>
        </div>

        {/* Top Summary Metrics */}
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
            <span className="text-xs font-medium text-slate-500">Active Workspaces</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-teal-800">{activeCount}</span>
              <span className="text-[11px] text-teal-700 font-medium">In Progress</span>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
            <span className="text-xs font-medium text-slate-500">Under Review</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-amber-700">{underReviewCount}</span>
              <span className="text-[11px] text-amber-800 font-medium">Pending Decision</span>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
            <span className="text-xs font-medium text-slate-500">Completed Projects</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-emerald-700">{completedCount}</span>
              <span className="text-[11px] text-emerald-800 font-medium">In your Passport</span>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
            <span className="text-xs font-medium text-slate-500">Weekly Commitment</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900">{totalWeeklyHours}</span>
              <span className="text-[11px] text-slate-500">hours/week allocated</span>
            </div>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-3">
          {/* Status Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { label: `All (${projectsList.length})`, value: "all" },
                { label: `Active (${activeCount})`, value: "active" },
                { label: `Under Review (${underReviewCount})`, value: "under_review" },
                { label: `Completed (${completedCount})`, value: "completed" },
              ] as const
            ).map((tab) => {
              const isSelected = filter === tab.value;
              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setFilter(tab.value)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition shadow-2xs ${
                    isSelected
                      ? "bg-teal-800 text-white"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Live Search Input */}
          <div className="relative sm:w-64">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search projects or mentors..."
              className="w-full rounded-lg border border-slate-300 bg-white pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-teal-800 focus:ring-1 focus:ring-teal-800"
            />
            <svg
              className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1.5 text-xs text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Projects Cards List */}
        {filteredProjects.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center space-y-3">
            <div className="mx-auto w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-slate-900">No projects found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchQuery
                ? `No projects matched "${searchQuery}". Try searching for another keyword or clear the search.`
                : "There are no projects matching the selected status filter."}
            </p>
            <button
              type="button"
              onClick={() => {
                setFilter("all");
                setSearchQuery("");
              }}
              className="inline-flex text-xs font-semibold text-teal-800 hover:underline pt-1"
            >
              Reset search &amp; filters
            </button>
          </div>
        ) : (
          <div className="grid gap-5">
            {filteredProjects.map((item) => {
              const statusBadge =
                item.status === "active"
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                  : item.status === "under_review"
                  ? "bg-amber-50 text-amber-900 border-amber-200"
                  : "bg-blue-50 text-blue-900 border-blue-200";

              const statusLabel =
                item.status === "active"
                  ? "Active • Milestone in progress"
                  : item.status === "under_review"
                  ? "Under Review • Pending feedback"
                  : "Completed";

              const workspaceHref = `${basePath}/projects/${item.participationId}`;

              return (
                <div
                  key={item.participationId}
                  className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs hover:border-slate-300 transition space-y-4"
                >
                  {/* Card Header */}
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 border-b border-slate-100 pb-4">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-slate-600">
                          {item.organizationName}
                        </span>
                        {item.organizationVerified && (
                          <span className="inline-flex items-center gap-1 rounded bg-teal-50 px-1.5 py-0.5 text-[10px] font-semibold text-teal-800">
                            ✓ Verified organisation
                          </span>
                        )}
                        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold border ${statusBadge}`}>
                          {statusLabel}
                        </span>
                      </div>

                      <h3 className="text-lg font-bold tracking-tight text-slate-900">
                        <Link href={workspaceHref} className="hover:text-teal-800 transition">
                          {item.projectTitle}
                        </Link>
                      </h3>
                    </div>

                    <div className="shrink-0">
                      <Link
                        href={workspaceHref}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-teal-800 px-4 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-teal-900 transition focus-visible:outline-2 focus-visible:outline-teal-800"
                      >
                        <span>Open Workspace</span>
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                      </Link>
                    </div>
                  </div>

                  {/* Progress Bar & Milestone Status */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700">
                        Progress: {item.progressPercent}%
                      </span>
                      <span className="text-slate-500 font-medium">
                        {item.completedMilestonesCount} of {item.totalMilestonesCount} milestones completed
                      </span>
                    </div>

                    <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-teal-800 transition-all duration-500"
                        style={{ width: `${item.progressPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Current Milestone Spotlight Box */}
                  <div className="rounded-xl border border-teal-100 bg-teal-50/50 p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-teal-800">
                        Current Milestone Focus
                      </div>
                      <div className="text-xs font-bold text-slate-900">
                        {item.currentMilestone}
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      <span className="text-[11px] text-slate-500">
                        Target: <strong className="text-slate-800">{item.nextMilestoneDue}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Project Metadata Footer */}
                  <div className="grid gap-3 sm:grid-cols-2 pt-1 text-xs text-slate-600 border-t border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-teal-100 text-teal-900 flex items-center justify-center text-xs font-bold shrink-0">
                        {item.mentorName
                          .replace("Dr. ", "")
                          .replace("Ing. ", "")
                          .replace("Prof. ", "")[0] ?? "M"}
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500">Mentor</div>
                        <div className="font-semibold text-slate-800 truncate">{item.mentorName}</div>
                      </div>
                    </div>

                    <div className="flex items-center sm:justify-end gap-2">
                      <div className="text-right">
                        <div className="text-[10px] text-slate-400">Weekly Commitment</div>
                        <div className="font-semibold text-slate-800">{item.weeklyHours ? `${item.weeklyHours} hours/week` : "Not supplied"}</div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Opportunities Promotion Banner */}
        <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-teal-900 to-slate-900 p-6 text-white shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-base font-bold tracking-tight">
              Ready for your next real-world project?
            </h3>
            <p className="text-xs text-teal-100 max-w-xl leading-relaxed">
              Verified organisations post short, real projects. Each one comes with a mentor and adds to your Passport.
            </p>
          </div>

          <Link
            href={`${basePath}/applications#opportunities`}
            className="inline-flex items-center justify-center rounded-lg bg-white px-4 py-2 text-xs font-semibold text-slate-900 shadow-sm hover:bg-teal-50 transition shrink-0"
          >
            Explore Open Projects
          </Link>
        </div>

    </div>
  );
}
