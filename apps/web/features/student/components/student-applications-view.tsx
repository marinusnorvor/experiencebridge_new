"use client";

import { useState } from "react";
import { isPortalPresentationMode } from "@/lib/auth/portal-presentation";
import { usePortalResource } from "@/lib/api/use-portal-resource";
import { loadApplications } from "../lib/api-records";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { StudentPortalHeader } from "./student-portal-header";
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
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

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
    setFeedbackMessage("Applications reset to default synthetic fixtures.");
    setTimeout(() => setFeedbackMessage(null), 3000);
  };

  // Add new application from ApplyModal
  const handleApplicationCreated = (newApp: StudentApplicationDetails) => {
    if (!preview) { setFeedbackMessage("Application saved by the API."); void live.reload().catch(() => {}); return; }
    const updated = [newApp, ...applications];
    setApplications(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated, null, 2));
    } catch (err) {
      console.error("Failed to save application to localStorage:", err);
    }
    setFeedbackMessage(`Application for "${newApp.projectTitle}" submitted successfully!`);
    setTimeout(() => setFeedbackMessage(null), 4000);
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
    <div className="min-h-[calc(100vh-65px)] bg-slate-50 pb-16">
      <StudentPortalHeader studentName={preview ? "Stella Appiok" : "Student"} isSynthetic={preview} />

      <main className="mx-auto max-w-6xl px-4 sm:px-6 pt-6 space-y-6">
        {!preview && live.loading && <p role="status">Loading database records...</p>}
        {!preview && live.error && <p role="alert" className="text-red-700">{live.error}</p>}
        {/* Page Title & Context */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded">
                STU-03 · My Applications
              </span>
              <span className="text-xs text-emerald-800 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                ● Live Status Tracking
              </span>
            </div>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
              Project Applications &amp; Offers
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 max-w-2xl">
              Track submitted applications across review stages, inspect snapshots of observed terms versions, and review project offers.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href={`${basePath}/passport`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition"
            >
              <svg className="h-3.5 w-3.5 text-teal-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span>Experience Passport</span>
            </Link>

            <button
              type="button"
              onClick={handleResetDefaults}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-2xs hover:bg-slate-50 transition"
              title="Reset state to initial synthetic fixtures"
            >
              <svg className="h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>{preview ? "Reset Defaults" : "Refresh records"}</span>
            </button>

            <button
              type="button"
              onClick={() => { setSelectedProjectId(undefined); setIsApplyModalOpen(true); }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-teal-800 px-4 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-teal-900 transition focus-visible:outline-2 focus-visible:outline-teal-800"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>+ Apply for Project</span>
            </button>
          </div>
        </div>

        {!preview && <StudentOpportunities applications={applicationsList} basePath={basePath} onApply={id => { setSelectedProjectId(id); setIsApplyModalOpen(true); }} />}

        {/* Feedback Alert Banner */}
        {feedbackMessage && (
          <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-xs font-semibold text-emerald-900 flex items-center justify-between shadow-2xs animate-fade-in">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-600" />
              <span>{feedbackMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedbackMessage(null)}
              className="text-emerald-700 hover:text-emerald-950 text-sm font-bold"
            >
              ×
            </button>
          </div>
        )}

        {/* Top Summary Metrics */}
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
            <span className="text-xs font-medium text-slate-500">Total Applications</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900">{applicationsList.length}</span>
              <span className="text-[11px] text-slate-500 font-medium">All time</span>
            </div>
          </div>

          <div className={`rounded-xl border p-4 shadow-2xs transition ${offeredCount > 0 ? "border-amber-300 bg-amber-50/50 ring-1 ring-amber-200" : "border-slate-200 bg-white"}`}>
            <span className="text-xs font-medium text-amber-900">Offers Extended</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-amber-700">{offeredCount}</span>
              <span className="text-[11px] text-amber-800 font-semibold">Action Required</span>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
            <span className="text-xs font-medium text-slate-500">Shortlisted</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-teal-800">{shortlistedCount}</span>
              <span className="text-[11px] text-teal-700 font-medium">Final selection</span>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
            <span className="text-xs font-medium text-slate-500">Under Review</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-700">{underReviewCount + submittedCount}</span>
              <span className="text-[11px] text-slate-500 font-medium">Active screening</span>
            </div>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-3">
          {/* Status Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { label: `All (${applicationsList.length})`, value: "all" },
                { label: `Offered (${offeredCount})`, value: "offered" },
                { label: `Shortlisted (${shortlistedCount})`, value: "shortlisted" },
                { label: `Under Review (${underReviewCount})`, value: "under_review" },
                { label: `Submitted (${submittedCount})`, value: "submitted" },
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

          {/* Search Input */}
          <div className="relative sm:w-64">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search applications or skills..."
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

        {/* Applications List */}
        {filteredApps.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center space-y-3">
            <div className="mx-auto w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-slate-900">No applications found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchQuery
                ? `No applications matched "${searchQuery}". Clear your search or adjust status filter.`
                : "You don't have any applications matching the selected filter."}
            </p>
            <button
              type="button"
              onClick={() => {
                setFilter("all");
                setSearchQuery("");
              }}
              className="inline-flex text-xs font-semibold text-teal-800 hover:underline pt-1"
            >
              Reset filters
            </button>
          </div>
        ) : (
          <div className="grid gap-5">
            {filteredApps.map((app) => {
              const detailHref = `${basePath}/applications/${app.id}`;

              const statusBadgeColor =
                app.status === "offered"
                  ? "bg-amber-100 text-amber-950 border-amber-300 font-bold"
                  : app.status === "accepted"
                  ? "bg-emerald-50 text-emerald-900 border-emerald-300 font-bold"
                  : app.status === "shortlisted"
                  ? "bg-teal-50 text-teal-900 border-teal-200 font-semibold"
                  : app.status === "under_review"
                  ? "bg-blue-50 text-blue-900 border-blue-200"
                  : app.status === "rejected"
                  ? "bg-red-50 text-red-900 border-red-200 font-semibold"
                  : app.status === "withdrawn"
                  ? "bg-slate-100 text-slate-600 border-slate-200"
                  : "bg-slate-100 text-slate-800 border-slate-200";

              const statusLabel =
                app.status === "offered"
                  ? "Offer Extended • Action Required"
                  : app.status === "accepted"
                  ? "Offer Accepted • Active Placement"
                  : app.status === "shortlisted"
                  ? "Shortlisted for Final Placement"
                  : app.status === "under_review"
                  ? "Under Technical Review"
                  : app.status === "rejected"
                  ? "Not Selected"
                  : app.status === "withdrawn"
                  ? "Withdrawn"
                  : "Submitted • In Queue";

              return (
                <div
                  key={app.id}
                  className={`rounded-2xl border bg-white p-5 sm:p-6 shadow-xs hover:border-slate-300 transition space-y-4 ${
                    app.status === "offered"
                      ? "border-amber-300 ring-1 ring-amber-200"
                      : "border-slate-200"
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 border-b border-slate-100 pb-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-slate-600">
                          {app.organizationName}
                        </span>
                        {app.organizationVerified && (
                          <span className="inline-flex items-center gap-1 rounded bg-teal-50 px-1.5 py-0.5 text-[10px] font-semibold text-teal-800">
                            ✓ Verified Org
                          </span>
                        )}
                        <span className={`rounded-full px-2.5 py-0.5 text-[11px] border ${statusBadgeColor}`}>
                          {statusLabel}
                        </span>
                      </div>

                      <h3 className="text-lg font-bold tracking-tight text-slate-900">
                        <Link href={detailHref} className="hover:text-teal-800 transition">
                          {app.projectTitle}
                        </Link>
                      </h3>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      <Link
                        href={detailHref}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition"
                      >
                        <span>View Details</span>
                        <span aria-hidden="true">→</span>
                      </Link>
                    </div>
                  </div>

                  {/* URGENT OFFER BANNER (If offered) */}
                  {app.status === "offered" && (
                    <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-2xs animate-fade-in">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="flex h-2.5 w-2.5 rounded-full bg-amber-600 animate-pulse" />
                          <span className="text-xs font-bold text-amber-950">
                            Official Project Offer Ready for Acceptance
                          </span>
                        </div>
                        <p className="text-xs text-amber-900">
                          {app.offerDeadline ?? "Review terms within 48 hours to confirm participation."}
                        </p>
                      </div>

                      <Link
                        href={detailHref}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-teal-800 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-teal-900 transition shrink-0"
                      >
                        <span>Review Offer &amp; Accept</span>
                        <span aria-hidden="true">→</span>
                      </Link>
                    </div>
                  )}

                  {/* Motivation Snippet */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Statement of Fit / Motivation
                    </span>
                    <p className="text-xs text-slate-600 leading-relaxed bg-slate-50/70 p-3 rounded-lg border border-slate-100">
                      {app.motivationStatement}
                    </p>
                  </div>

                  {/* Declared Skills */}
                  {app.declaredSkills.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[10px] text-slate-400 font-semibold mr-1">Skills Highlighted:</span>
                      {app.declaredSkills.map((skill, idx) => (
                        <span
                          key={idx}
                          className="rounded bg-teal-50 px-2 py-0.5 text-[10px] font-medium text-teal-900 border border-teal-100"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Footer Metadata */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-[11px] text-slate-400 border-t border-slate-100">
                    <span>Applied on: <strong className="text-slate-700">{app.appliedAt}</strong></span>
                    <span>Observed Terms: <strong className="font-mono text-slate-700">{app.observedTermsSnapshot.termsVersionId}</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Apply Modal */}
      <ApplyModal key={selectedProjectId ?? "all-projects"} initialProjectId={selectedProjectId} preview={preview}
        isOpen={isApplyModalOpen}
        onClose={() => setIsApplyModalOpen(false)}
        onApplicationCreated={handleApplicationCreated}
        existingApplications={applicationsList}
      />
    </div>
  );
}
