"use client";

import { useState } from "react";
import {
  syntheticActiveStudentDashboard,
  syntheticEmptyStudentDashboard,
} from "../lib/mock-data";
import { StudentPortalHeader } from "./student-portal-header";
import { ActionRequiredBanner } from "./action-required-banner";
import { ActiveProjectsCard } from "./active-projects-card";
import { ApplicationsOverviewCard } from "./applications-overview-card";
import { DecisionsActivityCard } from "./decisions-activity-card";
import { PassportTeaserCard } from "./passport-teaser-card";

export function StudentDashboardView() {
  const [viewMode, setViewMode] = useState<"active" | "empty">("active");

  const currentData =
    viewMode === "active"
      ? syntheticActiveStudentDashboard
      : syntheticEmptyStudentDashboard;

  return (
    <div className="min-h-[calc(100vh-65px)] bg-slate-50 pb-16">
      {/* Sub-navigation & Header */}
      <StudentPortalHeader
        studentName={currentData.student.displayName}
        isSynthetic={currentData.isSyntheticDemo}
      />

      {/* Main Container */}
      <main className="mx-auto max-w-6xl px-4 sm:px-6 pt-6 space-y-6">
        {/* State Toggle for Reviewers & Testing */}
        <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-2.5 shadow-2xs">
          <div className="text-xs text-slate-600">
            <strong>State Selector (Testing & Review):</strong> Toggle between active projects and empty state (UX-STU-01).
          </div>
          <div className="flex items-center gap-1.5 rounded-md bg-slate-100 p-0.5 text-xs font-medium">
            <button
              type="button"
              onClick={() => setViewMode("active")}
              className={`rounded px-2.5 py-1 transition ${
                viewMode === "active"
                  ? "bg-white text-slate-900 shadow-2xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Active Workflow
            </button>
            <button
              type="button"
              onClick={() => setViewMode("empty")}
              className={`rounded px-2.5 py-1 transition ${
                viewMode === "empty"
                  ? "bg-white text-slate-900 shadow-2xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Empty State
            </button>
          </div>
        </div>

        {/* Action Required Banner (STU-01 Section 1) */}
        <ActionRequiredBanner items={currentData.actionItems} />

        {/* 2-Column Responsive Layout */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Column: Active Project + Applications */}
          <div className="space-y-6 lg:col-span-2">
            <ActiveProjectsCard projects={currentData.activeProjects} />
            <ApplicationsOverviewCard applications={currentData.applications} />
            <DecisionsActivityCard decisions={currentData.recentDecisions} />
          </div>

          {/* Sidebar: Passport Teaser & Fast Resources */}
          <div className="space-y-6">
            <PassportTeaserCard summary={currentData.passportSummary} />

            {/* Verification and Safeguarding Note */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs text-xs text-slate-600 space-y-2">
              <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                <svg className="h-4 w-4 text-teal-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Student Safeguards & Invariants</span>
              </div>
              <p className="leading-relaxed">
                Project compensation terms and IP ownership are locked upon offer acceptance. Neither party can unilaterally alter agreed scopes.
              </p>
              <div className="pt-2 border-t border-slate-100 flex justify-between text-[11px] text-slate-500">
                <span>Code of Conduct: Active</span>
                <span className="text-teal-800 font-medium">Privacy Protected</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
