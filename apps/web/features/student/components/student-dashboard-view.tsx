"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { StudentPortalHeader } from "./student-portal-header";
import {
  syntheticActiveStudentDashboard,
  syntheticEmptyStudentDashboard,
} from "../lib/mock-data";
import type {
  StudentApplicationDetails,
  StudentDashboardData,
  StudentParticipationSummaryItem,
} from "../lib/types";

const APPLICATIONS_STORAGE_KEY = "experiencebridge_student_applications_list";
const PARTICIPATIONS_STORAGE_KEY = "experiencebridge_student_participations_list";
const PROFILE_STORAGE_KEY = "experiencebridge_student_profile_data";

export function StudentDashboardView() {
  const pathname = usePathname();
  const isDevPreview = Boolean(pathname?.startsWith("/dev/student"));
  const basePath = isDevPreview ? "/dev/student" : "/student";

  // State to toggle between active mock dashboard and empty state dashboard
  const [dashboardState, setDashboardState] = useState<"active" | "empty">("active");

  // Read student display name from profile localStorage if available
  const [studentName] = useState<string>(() => {
    if (typeof window !== "undefined") {
      try {
        const storedProfile = localStorage.getItem(PROFILE_STORAGE_KEY);
        if (storedProfile) {
          const parsed = JSON.parse(storedProfile);
          if (parsed.displayName) return parsed.displayName;
        }
      } catch {
        // Fallback
      }
    }
    return "Stella Appiok";
  });

  // Read applications from localStorage if available
  const [applications] = useState<StudentApplicationDetails[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(APPLICATIONS_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {
        // Fallback
      }
    }
    return [];
  });

  // Read participations from localStorage if available
  const [participations] = useState<StudentParticipationSummaryItem[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(PARTICIPATIONS_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {
        // Fallback
      }
    }
    return [];
  });

  const activeData: StudentDashboardData = syntheticActiveStudentDashboard;
  const emptyData: StudentDashboardData = syntheticEmptyStudentDashboard;

  const currentData = dashboardState === "active" ? activeData : emptyData;

  // Active project calculation
  const activeProject =
    dashboardState === "active"
      ? participations.find((p) => p.status === "active") || currentData.activeProjects[0]
      : null;

  // Action items calculation
  const pendingOffers = applications.filter((a) => a.status === "offered");
  const hasPendingOffer = pendingOffers.length > 0;

  return (
    <div className="min-h-[calc(100vh-65px)] bg-slate-50 pb-16">
      <StudentPortalHeader studentName={studentName} isSynthetic={true} />

      <main className="mx-auto max-w-6xl px-4 sm:px-6 pt-6 space-y-6">
        {/* Top Header & Fixture Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded border border-teal-200">
                STU-01 · Overview
              </span>
              <span className="text-xs text-slate-500">D2 Student Dashboard</span>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
              Welcome back, {studentName}
            </h1>
            <p className="mt-0.5 text-xs text-slate-500 max-w-2xl">
              Monitor active project milestones, review pending offers, and track verified competencies.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Fixture State Switcher */}
            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-2xs text-xs">
              <button
                type="button"
                onClick={() => setDashboardState("active")}
                className={`rounded-md px-3 py-1 font-semibold transition ${
                  dashboardState === "active"
                    ? "bg-teal-800 text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Active State
              </button>
              <button
                type="button"
                onClick={() => setDashboardState("empty")}
                className={`rounded-md px-3 py-1 font-semibold transition ${
                  dashboardState === "empty"
                    ? "bg-teal-800 text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Empty State
              </button>
            </div>

            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-lg bg-teal-800 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-teal-900 transition"
            >
              <span>Explore Projects</span>
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>

        {/* 1. ACTION REQUIRED ITEMS (§6.1 Outstanding Offer / Submissions / Revisions) */}
        {dashboardState === "active" && (
          <section aria-labelledby="action-required-heading" className="space-y-3">
            <h2 id="action-required-heading" className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Action Required Items
            </h2>

            <div className="grid gap-3.5 sm:grid-cols-2">
              {/* Dynamic pending offer banner if present */}
              {hasPendingOffer ? (
                <div className="rounded-2xl border border-amber-300 bg-amber-50/70 p-4 shadow-2xs flex flex-col justify-between gap-3 animate-fade-in">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-xs font-bold text-amber-950">
                        <span className="h-2 w-2 rounded-full bg-amber-600 animate-pulse" />
                        Project Offer Extended
                      </span>
                      <span className="rounded bg-amber-100 border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                        {pendingOffers[0].offerDeadline || "Action Required"}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">
                      {pendingOffers[0].projectTitle}
                    </h3>
                    <p className="text-xs text-amber-900">
                      {pendingOffers[0].organizationName} extended an official project offer. Affirmative acceptance binds observed terms (§6.4).
                    </p>
                  </div>

                  <div className="pt-2 flex items-center justify-end">
                    <Link
                      href={`${basePath}/applications/${pendingOffers[0].id}`}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-teal-800 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-teal-900 transition"
                    >
                      <span>Review Offer &amp; Terms</span>
                      <span aria-hidden="true">→</span>
                    </Link>
                  </div>
                </div>
              ) : (
                /* Static fixture offer if no dynamic offer */
                <div className="rounded-2xl border border-amber-300 bg-amber-50/70 p-4 shadow-2xs flex flex-col justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-xs font-bold text-amber-950">
                        <span className="h-2 w-2 rounded-full bg-amber-600 animate-pulse" />
                        Offer Extended
                      </span>
                      <span className="rounded bg-amber-100 border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                        Expires in 36 hours
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Solar Microgrid Telemetry
                    </h3>
                    <p className="text-xs text-amber-900">
                      SunPower Labs has reviewed your profile and extended an offer. Confirm terms acknowledgment within 36 hours.
                    </p>
                  </div>

                  <div className="pt-2 flex items-center justify-end">
                    <Link
                      href={`${basePath}/applications/app-101`}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-teal-800 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-teal-900 transition"
                    >
                      <span>Review Offer Terms</span>
                      <span aria-hidden="true">→</span>
                    </Link>
                  </div>
                </div>
              )}

              {/* Next Milestone Deliverable Action */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs flex flex-col justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs font-bold text-teal-800">
                      <span className="h-2 w-2 rounded-full bg-teal-600" />
                      Milestone In Progress
                    </span>
                    <span className="rounded bg-teal-50 border border-teal-200 px-2 py-0.5 text-[10px] font-semibold text-teal-800">
                      Due Nov 15, 2026
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Community Health Tracker
                  </h3>
                  <p className="text-xs text-slate-600">
                    Milestone 2: Offline-First Sync Layer is currently in progress. Submit contribution statement and pull request evidence before deadline.
                  </p>
                </div>

                <div className="pt-2 flex items-center justify-end">
                  <Link
                    href={`${basePath}/projects/part-101`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                  >
                    <span>Open Project Workspace</span>
                    <span aria-hidden="true">→</span>
                  </Link>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* 2-COLUMN MAIN CONTENT: ACTIVE PROJECT & APPLICATIONS */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* LEFT 2 COLUMNS: ACTIVE PROJECT & RECENT AUDIT DECISIONS */}
          <div className="lg:col-span-2 space-y-6">
            {/* ACTIVE PROJECT CARD (§6.1 / §6.5) */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Active Project Workspace
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Your current assigned project and active deliverables.
                  </p>
                </div>

                {activeProject && (
                  <span className="rounded-full bg-teal-50 border border-teal-200 px-2.5 py-0.5 text-[11px] font-semibold text-teal-800">
                    ● Active Participation
                  </span>
                )}
              </div>

              {activeProject ? (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div>
                      <span className="text-xs font-bold text-slate-600">
                        {activeProject.organizationName}
                      </span>
                      <h3 className="text-lg font-bold text-slate-900">
                        {activeProject.projectTitle}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Assigned Mentor: <strong className="text-slate-700">{activeProject.mentorName}</strong>
                      </p>
                    </div>

                    <Link
                      href={`${basePath}/projects/${activeProject.participationId || "part-101"}`}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-teal-800 px-4 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-teal-900 transition shrink-0"
                    >
                      <span>Open Workspace</span>
                      <span aria-hidden="true">→</span>
                    </Link>
                  </div>

                  {/* Progress Meter */}
                  <div className="space-y-1.5 rounded-xl bg-slate-50 p-3.5 border border-slate-100">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-700">{activeProject.currentMilestone}</span>
                      <span className="text-teal-800 font-bold">{activeProject.progressPercent}% Completed</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-teal-800 transition-all duration-500"
                        style={{ width: `${activeProject.progressPercent}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
                      <span>Next Due: <strong>{activeProject.nextMilestoneDue}</strong></span>
                      <span>Weekly Commitment: <strong>15 hrs/week</strong></span>
                    </div>
                  </div>
                </div>
              ) : (
                /* EMPTY STATE (Fulfilling UX-STU-01 Acceptance: "You don't have an active project yet...") */
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/50 p-8 text-center space-y-3">
                  <div className="mx-auto w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">
                    You don&apos;t have an active project yet.
                  </h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Browse approved organization opportunities to submit an application and get matched with a faculty mentor.
                  </p>
                  <div className="pt-1">
                    <Link
                      href="/"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-teal-800 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-900 transition"
                    >
                      Browse Approved Opportunities
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* RECENT REVIEWS & DECISIONS AUDIT TRAIL (§6.1 Strict Provenance Separation) */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Recent Reviews &amp; Decisions
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Attributed review outcomes from assigned mentors and organization supervisors.
                  </p>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                  Strict Provenance
                </span>
              </div>

              {currentData.recentDecisions.length > 0 ? (
                <div className="space-y-3">
                  {currentData.recentDecisions.map((decision) => {
                    const isMentor = decision.authorType === "mentor";
                    return (
                      <div
                        key={decision.id}
                        className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-2 hover:bg-white transition"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span
                              className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                                isMentor
                                  ? "bg-teal-100 text-teal-950 border border-teal-200"
                                  : "bg-blue-100 text-blue-950 border border-blue-200"
                              }`}
                            >
                              {isMentor ? "Mentor Rubric Review" : "Organization Decision"}
                            </span>
                            <span className="text-xs font-bold text-slate-800">
                              {decision.authorName}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400 shrink-0">
                            {decision.createdAt}
                          </span>
                        </div>

                        <div>
                          <h4 className="text-xs font-bold text-slate-900">
                            {decision.actionText} · <span className="text-slate-500 font-normal">{decision.projectTitle}</span>
                          </h4>
                          <p className="mt-1 text-xs text-slate-600 leading-relaxed bg-white p-2.5 rounded-lg border border-slate-100">
                            &quot;{decision.excerpt}&quot;
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-400 text-center py-4">
                  No review decisions recorded yet.
                </p>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: APPLICATIONS SNAPSHOT & PASSPORT TEASER */}
          <div className="space-y-6">
            {/* APPLICATIONS SNAPSHOT (§6.1 / §6.3) */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900">
                  Applications Overview
                </h3>
                <Link
                  href={`${basePath}/applications`}
                  className="text-xs font-semibold text-teal-800 hover:underline"
                >
                  View All ({currentData.applications.length}) →
                </Link>
              </div>

              {currentData.applications.length > 0 ? (
                <div className="space-y-2.5">
                  {currentData.applications.map((app) => {
                    const statusColor =
                      app.status === "offered"
                        ? "bg-amber-100 text-amber-950 border-amber-300 font-bold"
                        : app.status === "shortlisted"
                        ? "bg-teal-50 text-teal-900 border-teal-200 font-semibold"
                        : "bg-slate-100 text-slate-700 border-slate-200";

                    return (
                      <Link
                        key={app.id}
                        href={`${basePath}/applications/${app.id}`}
                        className="block rounded-xl border border-slate-100 p-3 hover:border-slate-300 hover:bg-slate-50/50 transition space-y-1"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-bold text-slate-500 truncate">
                            {app.organizationName}
                          </span>
                          <span className={`rounded-full px-2 py-0.2 text-[10px] border ${statusColor}`}>
                            {app.status === "offered"
                              ? "Offer Extended"
                              : app.status === "shortlisted"
                              ? "Shortlisted"
                              : "Under Review"}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-900 truncate">
                          {app.projectTitle}
                        </h4>
                        <span className="text-[10px] text-slate-400 block">
                          Applied: {app.appliedAt}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6 space-y-2">
                  <p className="text-xs text-slate-500">No applications on record.</p>
                  <Link
                    href="/"
                    className="inline-block text-xs font-semibold text-teal-800 hover:underline"
                  >
                    Browse projects →
                  </Link>
                </div>
              )}
            </div>

            {/* EXPERIENCE PASSPORT PREVIEW TEASER (§6.8) */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                    §6.8 Private Passport
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    Preview
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-900 mt-2">
                  Experience Passport
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Combines student self-reported coursework with verifiable mentor reviews.
                </p>
              </div>

              {/* Verified Count Metrics */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                  <span className="text-base font-bold text-teal-800 block">
                    {currentData.passportSummary.verifiedClaimsCount}
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium">Verified Skills</span>
                </div>

                <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                  <span className="text-base font-bold text-slate-800 block">
                    {currentData.passportSummary.completedProjectsCount}
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium">Projects Done</span>
                </div>

                <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                  <span className="text-base font-bold text-slate-800 block">
                    {currentData.passportSummary.mentorObservationsCount}
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium">Observations</span>
                </div>
              </div>

              <div className="rounded-xl bg-teal-50/40 border border-teal-100 p-3 text-xs text-teal-950 space-y-1">
                <span className="font-bold text-[11px] block">Cryptographic Verification Guarantee</span>
                <p className="text-[11px] text-teal-900 leading-relaxed">
                  Assertions require independent mentor sign-off before being credited to your permanent transcript.
                </p>
              </div>

              <Link
                href={`${basePath}/passport`}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-teal-800 px-3.5 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-teal-900 transition"
              >
                <span>Open Private Experience Passport</span>
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
