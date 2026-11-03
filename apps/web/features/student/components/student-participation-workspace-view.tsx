"use client";

import { useCallback, useRef, useState } from "react";
import { usePortalResource } from "@/lib/api/use-portal-resource";
import { isPortalPresentationMode } from "@/lib/auth/portal-presentation";
import { emptyWorkspace, loadWorkspace, saveEvidence } from "../lib/api-records";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { StudentParticipationActions } from "./student-participation-actions";
import { StudentPortalHeader } from "./student-portal-header";
import {
  syntheticParticipationDetails,
  syntheticParticipationsList,
} from "../lib/mock-data";
import type {
  MilestoneSubmission,
  ParticipationWorkspaceDetails,
  StudentParticipationSummaryItem,
} from "../lib/types";

interface WorkspaceProps {
  participationId: string;
}

const PROJECTS_LIST_STORAGE_KEY = "experiencebridge_student_projects_list";

function getInitialWorkspace(participationId: string): ParticipationWorkspaceDetails {
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(`experiencebridge_workspace_${participationId}`);
      if (stored) {
        const parsed = JSON.parse(stored) as ParticipationWorkspaceDetails;
        if (parsed && parsed.participationId) {
          return parsed;
        }
      }
    } catch {
      // Ignore read errors
    }
  }

  if (syntheticParticipationDetails && syntheticParticipationDetails[participationId]) {
    return syntheticParticipationDetails[participationId];
  }

  const sample = syntheticParticipationDetails?.["part-healthnet-01"];
  if (sample) {
    return {
      ...sample,
      participationId,
      projectTitle: `Project Workspace (${participationId})`,
    };
  }

  return {
    participationId,
    projectId: "proj-fallback",
    projectTitle: "Community Health Tracker",
    organizationName: "HealthNet Africa",
    organizationContact: "Dr. A. Osei (Technical Director)",
    organizationVerificationStatus: "Verified Non-Profit Healthcare NGO",
    mentor: {
      name: "Dr. K. Mensah",
      title: "Senior Lecturer, Ashesi University",
      status: "accepted",
      email: "k.mensah@ashesi.edu.gh",
    },
    status: "active",
    startedAt: "Oct 18, 2026",
    targetCompletionDate: "Dec 15, 2026",
    progressPercent: 45,
    currentMilestoneId: "m-02",
    milestones: [],
    submissions: [],
    agreedTerms: {
      termsVersionId: "terms-healthnet-v1.2",
      termsHash: "sha256:4f8a9e120bc71d43a88c2e71d87e0254c2978d338f07a16b32c66d2134599a01",
      compensationSummary: "",
      weeklyHours: 15,
      durationWeeks: 8,
      ipConditions: "Permissive Open Source (MIT License)",
      confidentialitySummary: "De-identified records only",
      acceptedAt: "Oct 18, 2026",
    },
    isSyntheticDemo: true,
  };
}

export function StudentParticipationWorkspaceView({ participationId }: WorkspaceProps) {
  const pathname = usePathname();
  const isDevPreview = Boolean(pathname?.startsWith("/dev/student"));
  const preview = isDevPreview || isPortalPresentationMode();
  const live = usePortalResource(useCallback(api => loadWorkspace(api, participationId), [participationId]), !preview);
  const [actionError, setActionError] = useState("");
  const saving = useRef(false);
  const savedSubmission = useRef<string | undefined>(undefined);
  const basePath = isDevPreview ? "/dev/student" : "/student";

  const [previewWorkspace, setWorkspace] = useState<ParticipationWorkspaceDetails>(() =>
    preview ? getInitialWorkspace(participationId) : emptyWorkspace(participationId)
  );
  const workspace = preview ? previewWorkspace : live.data ?? emptyWorkspace(participationId);

  const [activeTab, setActiveTab] = useState<
    "overview" | "milestones" | "submissions" | "terms" | "support"
  >("overview");

  // Evidence Submission Modal State (STU-08)
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [selectedMilestoneId, setSelectedMilestoneId] = useState(workspace.currentMilestoneId);
  const [workSummary, setWorkSummary] = useState("");
  const [contributionStatement, setContributionStatement] = useState("");
  const [githubPrUrl, setGithubPrUrl] = useState("");
  const [demoOrDocUrl, setDemoOrDocUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionSuccessFeedback, setSubmissionSuccessFeedback] = useState<string | null>(null);

  // Copy Terms Hash State
  const [isCopiedHash, setIsCopiedHash] = useState(false);

  // Confidential Report Modal State (STU-12)
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportCategory, setReportCategory] = useState("scope");
  const [reportDetails, setReportDetails] = useState("");
  const [activeReportTicket, setActiveReportTicket] = useState<string | null>(null);

  // Reset to initial synthetic state
  const handleResetWorkspace = () => {
    if (!preview) { void live.reload().catch(() => {}); return; }
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(`experiencebridge_workspace_${participationId}`);
      } catch {
        // Ignore
      }
    }
    const fresh = syntheticParticipationDetails[participationId] ?? getInitialWorkspace(participationId);
    setWorkspace(fresh);
    setSubmissionSuccessFeedback("Workspace reset to default synthetic preview fixtures.");
    setTimeout(() => setSubmissionSuccessFeedback(null), 3000);
  };

  // Copy SHA256 Hash
  const handleCopyHash = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(workspace.agreedTerms.termsHash);
      setIsCopiedHash(true);
      setTimeout(() => setIsCopiedHash(false), 2500);
    }
  };

  // Submit Evidence Live (STU-08)
  const handleSubmitEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!preview) {
      if (saving.current) return;
      saving.current = true; setIsSubmitting(true); setActionError("");
      try {
        if (!workspace.canSubmit) throw new Error("Evidence can be submitted after the organization starts this project, while your participation is active.");
        const milestone = selectedMilestoneId || workspace.currentMilestoneId;
        if (!workspace.milestones.some(m => m.id === milestone)) throw new Error("Select a milestone.");
        const api = await live.getApi();
        await saveEvidence(api, participationId, Number(milestone), workSummary.trim(), contributionStatement.trim(),
          [{label:"Repository evidence",url:githubPrUrl.trim()},{label:"Document evidence",url:demoOrDocUrl.trim()}].filter(l => l.url),
          savedSubmission.current, id => { savedSubmission.current = id; });
        await live.reload(); savedSubmission.current = undefined;
        setIsSubmitModalOpen(false); setWorkSummary(""); setContributionStatement(""); setGithubPrUrl(""); setDemoOrDocUrl("");
        setActiveTab("submissions"); setSubmissionSuccessFeedback("Evidence submission confirmed by the API. Mentor assessment and organization acceptance remain separate.");
      } catch (e) { setActionError(e instanceof Error ? e.message : "Evidence could not be confirmed. Your draft can be retried."); }
      finally { saving.current = false; setIsSubmitting(false); }
      return;
    }
    if (!workSummary.trim() || !contributionStatement.trim()) {
      alert("Please provide both a work summary and personal contribution statement.");
      return;
    }

    setIsSubmitting(true);

    setTimeout(() => {
      const milestone = workspace.milestones.find((m) => m.id === selectedMilestoneId);
      const newSubmission: MilestoneSubmission = {
        id: `sub-${Date.now()}`,
        milestoneId: selectedMilestoneId,
        milestoneTitle: milestone ? `Milestone ${milestone.order}: ${milestone.title}` : "Assigned Milestone",
        revisionNumber:
          (workspace.submissions.filter((s) => s.milestoneId === selectedMilestoneId).length || 0) + 1,
        summary: workSummary.trim(),
        contributionStatement: contributionStatement.trim(),
        links: [
          ...(githubPrUrl.trim()
            ? [{ label: "Pull Request / Git Branch", url: githubPrUrl.trim() }]
            : []),
          ...(demoOrDocUrl.trim()
            ? [{ label: "Artifact / Demo URL", url: demoOrDocUrl.trim() }]
            : []),
        ],
        status: "submitted",
        submittedAt: new Date().toLocaleString([], { dateStyle: "medium", timeStyle: "short" }),
        mentorReview: {
          id: `rev-pending-${Date.now()}`,
          reviewerType: "mentor",
          reviewerName: workspace.mentor.name,
          status: "under_review",
          feedback: "Submission received into mentor queue. Automated static checks passed.",
          reviewedAt: "Just now",
        },
        organizationDecision: {
          id: `dec-pending-${Date.now()}`,
          reviewerType: "organization",
          reviewerName: workspace.organizationName,
          status: "under_review",
          feedback: "Awaiting mentor technical assessment before final sign-off.",
          reviewedAt: "Just now",
        },
      };

      // Live Milestone State Progression
      const updatedMilestones = workspace.milestones.map((m) => {
        if (m.id === selectedMilestoneId) {
          return { ...m, status: "completed" as const, submissionId: newSubmission.id };
        }
        if (m.order === (milestone?.order ?? 0) + 1 && m.status === "upcoming") {
          return { ...m, status: "in_progress" as const };
        }
        return m;
      });

      const completedCount = updatedMilestones.filter((m) => m.status === "completed").length;
      const totalCount = updatedMilestones.length || 1;
      const calculatedProgress = Math.min(100, Math.round((completedCount / totalCount) * 100));

      const nextActiveMilestone = updatedMilestones.find((m) => m.status === "in_progress");

      const updatedWorkspace: ParticipationWorkspaceDetails = {
        ...workspace,
        progressPercent: calculatedProgress,
        currentMilestoneId: nextActiveMilestone?.id ?? workspace.currentMilestoneId,
        milestones: updatedMilestones,
        submissions: [newSubmission, ...workspace.submissions],
      };

      // 1. Persist this workspace live to localStorage
      try {
        localStorage.setItem(
          `experiencebridge_workspace_${participationId}`,
          JSON.stringify(updatedWorkspace, null, 2)
        );
      } catch (err) {
        console.error("Failed to save workspace state to localStorage:", err);
      }

      // 2. Sync progress and counts to the main projects list in localStorage
      try {
        const storedProjects = localStorage.getItem(PROJECTS_LIST_STORAGE_KEY);
        const list: StudentParticipationSummaryItem[] = storedProjects
          ? JSON.parse(storedProjects)
          : syntheticParticipationsList;

        const updatedList = list.map((item) => {
          if (item.participationId === participationId) {
            return {
              ...item,
              progressPercent: calculatedProgress,
              completedMilestonesCount: completedCount,
              currentMilestone: nextActiveMilestone
                ? `Milestone ${nextActiveMilestone.order}: ${nextActiveMilestone.title}`
                : "All milestones submitted & verified",
              status: calculatedProgress === 100 ? ("completed" as const) : ("active" as const),
            };
          }
          return item;
        });

        localStorage.setItem(PROJECTS_LIST_STORAGE_KEY, JSON.stringify(updatedList, null, 2));
      } catch {
        // Ignore list sync errors
      }

      setWorkspace(updatedWorkspace);
      setIsSubmitting(false);
      setIsSubmitModalOpen(false);
      setWorkSummary("");
      setContributionStatement("");
      setGithubPrUrl("");
      setDemoOrDocUrl("");
      setActiveTab("submissions");
      setSubmissionSuccessFeedback(
        `Milestone evidence v${newSubmission.revisionNumber} saved live! Workspace progress advanced to ${calculatedProgress}%.`
      );

      setTimeout(() => setSubmissionSuccessFeedback(null), 6000);
    }, 600);
  };

  // Submit Confidential Report (STU-12)
  const handleSubmitReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!preview) { setActionError("Reporting is not connected to a backend endpoint. No report was sent or recorded."); return; }
    const ticketId = `REP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    setActiveReportTicket(ticketId);
    setIsReportModalOpen(false);
    setReportDetails("");
  };

  if (!preview && (live.loading || live.error)) return <main className="mx-auto max-w-6xl p-6"><p role={live.error ? "alert" : "status"}>{live.error || "Loading workspace records..."}</p><button onClick={() => void live.reload().catch(() => {})}>Refresh records</button></main>;

  const currentMilestone = workspace.milestones.find((m) => m.id === workspace.currentMilestoneId);

  return (
    <div className="min-h-[calc(100vh-65px)] bg-slate-50 pb-16">
      <StudentPortalHeader studentName={preview ? "Stella Appiok" : "Student"} isSynthetic={true} />

      <main className="mx-auto max-w-6xl px-4 sm:px-6 pt-6 space-y-6">
        {actionError && <p role="alert" className="text-red-700">{actionError}</p>}
        {/* Breadcrumb & Navigation Back */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href={`${basePath}/projects`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-teal-800 transition"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Back to My Projects</span>
          </Link>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetWorkspace}
              className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 underline"
              title="Reset state to default synthetic fixtures"
            >
              Reset Workspace
            </button>
            <span className="text-[11px] font-semibold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
              Workspace ID: {workspace.participationId}
            </span>
          </div>
        </div>

        {/* Feedback Alert Banner */}
        {submissionSuccessFeedback && (
          <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-xs font-semibold text-emerald-900 flex items-center justify-between shadow-2xs animate-fade-in">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-600" />
              <span>{submissionSuccessFeedback}</span>
            </div>
            <button
              type="button"
              onClick={() => setSubmissionSuccessFeedback(null)}
              className="text-emerald-700 hover:text-emerald-950 text-sm font-bold"
            >
              ×
            </button>
          </div>
        )}

        {/* Active Safety Report Notification */}
        {activeReportTicket && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs font-semibold text-amber-950 flex items-center justify-between shadow-2xs animate-fade-in">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-amber-600 animate-pulse" />
              <span>
                <strong>Confidential Report Active ({activeReportTicket}):</strong> Platform safety team has opened an independent investigation. Your identity remains protected.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setActiveReportTicket(null)}
              className="text-amber-800 hover:text-amber-950 text-sm font-bold"
            >
              ×
            </button>
          </div>
        )}

        {/* Hero Card / Project Identity */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-slate-600">
                  {workspace.organizationName}
                </span>
                <span className="inline-flex items-center gap-1 rounded bg-teal-50 px-2 py-0.5 text-[10px] font-semibold text-teal-800 border border-teal-200">
                  {workspace.organizationVerificationStatus}
                </span>
                <span className="rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-semibold">
                  Live Active Workspace
                </span>
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                {workspace.projectTitle}
              </h1>

              <p className="text-xs text-slate-500">
                Started on {workspace.startedAt} • Target completion: {workspace.targetCompletionDate}
              </p>
            </div>

            {!preview && <StudentParticipationActions workspace={workspace} getApi={live.getApi} reload={live.reload} />}
            {/* Quick Action Buttons */}
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                type="button"
                disabled={!preview && !workspace.canSubmit}
                onClick={() => setIsSubmitModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-teal-800 px-4 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-teal-900 transition focus-visible:outline-2 focus-visible:outline-teal-800"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                <span>Submit Milestone Evidence</span>
              </button>

              <Link
                href={`${basePath}/passport`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition"
              >
                <svg className="h-3.5 w-3.5 text-teal-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span>Passport</span>
              </Link>

              <button
                type="button"
                onClick={() => setActiveTab("terms")}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition"
              >
                <svg className="h-3.5 w-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Agreed Terms</span>
              </button>
            </div>
          </div>

          {/* Overall Progress Meter */}
          <div className="pt-2 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="text-slate-700">
                Milestone Progress: <strong>{workspace.progressPercent}%</strong>
              </span>
              <span className="text-slate-500">
                {workspace.milestones.filter((m) => m.status === "completed").length} of {workspace.milestones.length} milestones verified
              </span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-teal-800 transition-all duration-500"
                style={{ width: `${workspace.progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Tab Navigation (STU-07 Specification) */}
        <div className="flex items-center gap-1 sm:gap-2 border-b border-slate-200 overflow-x-auto pb-px">
          {(
            [
              { id: "overview", label: "Overview & Contacts" },
              { id: "milestones", label: `Milestones (${workspace.milestones.length})` },
              { id: "submissions", label: `Submissions & Reviews (${workspace.submissions.length})` },
              { id: "terms", label: "Agreed Terms" },
              { id: "support", label: "Support & Reporting" },
            ] as const
          ).map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap px-4 py-2.5 text-xs font-semibold border-b-2 transition ${
                  isActive
                    ? "border-teal-800 text-teal-900 bg-white rounded-t-lg"
                    : "border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* TAB 1: OVERVIEW & CONTACTS */}
        {activeTab === "overview" && (
          <div className="space-y-6 animate-fade-in">
            {/* Current Milestone Action Focus */}
            {currentMilestone && (
              <div className="rounded-2xl border border-teal-200 bg-teal-50/50 p-5 sm:p-6 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-2.5 w-2.5 rounded-full bg-teal-800 animate-pulse" />
                    <span className="text-xs font-bold uppercase tracking-wider text-teal-900">
                      Current Milestone Focus (Milestone {currentMilestone.order})
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-teal-800 bg-white px-2.5 py-0.5 rounded border border-teal-200">
                    Deadline: {currentMilestone.deadline}
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-900">{currentMilestone.title}</h3>
                  <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                    {currentMilestone.description}
                  </p>
                </div>

                <div className="pt-2 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedMilestoneId(currentMilestone.id);
                      setIsSubmitModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-teal-800 px-3.5 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-teal-900 transition"
                  >
                    <span>Submit Evidence for Milestone {currentMilestone.order}</span>
                    <span aria-hidden="true">→</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab("milestones")}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-teal-300 bg-white px-3 py-2 text-xs font-semibold text-teal-900 hover:bg-teal-50 transition"
                  >
                    View Deliverables Checklist
                  </button>
                </div>
              </div>
            )}

            {/* Key Personnel & Scoped Links Grid */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Accountable Parties */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-2">
                  Supervision &amp; Accountable Parties
                </h3>

                {/* Assigned Mentor */}
                <div className="rounded-xl border border-teal-100 bg-teal-50/40 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-teal-800">
                      Confirmed Primary Mentor
                    </span>
                    <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Accepted Assignment
                    </span>
                  </div>
                  <div className="text-sm font-bold text-slate-900">{workspace.mentor.name}</div>
                  <div className="text-xs text-slate-600">{workspace.mentor.title}</div>
                  {workspace.mentor.email && (
                    <div className="pt-1 text-xs text-teal-800 font-medium">
                      Email: <a href={`mailto:${workspace.mentor.email}`} className="underline">{workspace.mentor.email}</a>
                    </div>
                  )}
                </div>

                {/* Organization Representative */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                      Organization Representative
                    </span>
                    <span className="text-[10px] font-semibold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                      Project Sponsor
                    </span>
                  </div>
                  <div className="text-sm font-bold text-slate-900">{workspace.organizationContact}</div>
                  <div className="text-xs text-slate-600">{workspace.organizationName}</div>
                </div>
              </div>

              {/* Scoped Project Resources */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-2">
                  Authorized Scoped Resources
                </h3>

                <div className="space-y-3">
                  {workspace.repositoryUrl && (
                    <a
                      href={workspace.repositoryUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-100 transition"
                    >
                      <div className="flex items-center gap-3">
                        <svg className="h-5 w-5 text-slate-700" fill="currentColor" viewBox="0 0 24 24">
                          <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                        </svg>
                        <div>
                          <div className="text-xs font-bold text-slate-900">GitHub Codebase</div>
                          <div className="text-[11px] text-slate-500 truncate max-w-xs">{workspace.repositoryUrl}</div>
                        </div>
                      </div>
                      <span className="text-xs text-teal-800 font-semibold">Open ↗</span>
                    </a>
                  )}

                  {workspace.designUrl && (
                    <a
                      href={workspace.designUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-100 transition"
                    >
                      <div className="flex items-center gap-3">
                        <svg className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <div>
                          <div className="text-xs font-bold text-slate-900">Figma Wireframes &amp; Tokens</div>
                          <div className="text-[11px] text-slate-500">Design systems &amp; prototypes</div>
                        </div>
                      </div>
                      <span className="text-xs text-teal-800 font-semibold">Open ↗</span>
                    </a>
                  )}

                  {workspace.documentationUrl && (
                    <a
                      href={workspace.documentationUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-100 transition"
                    >
                      <div className="flex items-center gap-3">
                        <svg className="h-5 w-5 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                        <div>
                          <div className="text-xs font-bold text-slate-900">Offline Sync Architecture Spec</div>
                          <div className="text-[11px] text-slate-500">Requirements &amp; data models</div>
                        </div>
                      </div>
                      <span className="text-xs text-teal-800 font-semibold">Open ↗</span>
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: MILESTONES ROADMAP */}
        {activeTab === "milestones" && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Project Milestones &amp; Deliverables</h3>
                <p className="text-xs text-slate-500">
                  Each milestone requires evidence submission followed by independent mentor review and organization sign-off.
                </p>
              </div>

              <button
                type="button"
                disabled={!preview && !workspace.canSubmit}
                onClick={() => setIsSubmitModalOpen(true)}
                className="inline-flex items-center gap-1.5 self-start rounded-lg bg-teal-800 px-3.5 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-teal-900 transition"
              >
                + Submit Milestone Evidence
              </button>
            </div>

            <div className="space-y-4">
              {workspace.milestones.map((m) => {
                const isCompleted = m.status === "completed";
                const isInProgress = m.status === "in_progress";

                return (
                  <div
                    key={m.id}
                    className={`rounded-2xl border p-5 sm:p-6 shadow-xs transition space-y-4 ${
                      isInProgress
                        ? "border-teal-300 bg-white ring-1 ring-teal-200"
                        : isCompleted
                        ? "border-slate-200 bg-white"
                        : "border-slate-200 bg-slate-50/70 opacity-90"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                            isCompleted
                              ? "bg-emerald-600 text-white"
                              : isInProgress
                              ? "bg-teal-800 text-white"
                              : "bg-slate-200 text-slate-600"
                          }`}
                        >
                          {isCompleted ? "✓" : m.order}
                        </span>

                        <h4 className="text-sm font-bold text-slate-900">
                          Milestone {m.order}: {m.title}
                        </h4>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">Deadline: <strong>{m.deadline}</strong></span>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase ${
                            isCompleted
                              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                              : isInProgress
                              ? "bg-teal-50 text-teal-800 border border-teal-200"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {m.status.replace("_", " ")}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed">
                      {m.description}
                    </p>

                    <div className="grid gap-4 sm:grid-cols-2 pt-1 text-xs">
                      {/* Deliverables */}
                      <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 space-y-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700">
                          Required Deliverables
                        </span>
                        <ul className="space-y-1.5 text-slate-600">
                          {m.deliverables.map((d, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-teal-800 font-bold">•</span>
                              <span>{d}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Acceptance Criteria */}
                      <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 space-y-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700">
                          Acceptance Criteria
                        </span>
                        <ul className="space-y-1.5 text-slate-600">
                          {m.acceptanceCriteria.map((c, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-emerald-700 font-bold">✓</span>
                              <span>{c}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end pt-2 border-t border-slate-100">
                      {isInProgress && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedMilestoneId(m.id);
                            setIsSubmitModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-teal-800 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-teal-900 transition shadow-2xs"
                        >
                          <span>Submit Evidence for Milestone {m.order}</span>
                          <span aria-hidden="true">→</span>
                        </button>
                      )}

                      {isCompleted && (
                        <button
                          type="button"
                          onClick={() => setActiveTab("submissions")}
                          className="text-xs font-semibold text-teal-800 hover:underline"
                        >
                          View Verified Submission &amp; Mentor Review
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: SUBMISSIONS & REVIEWS (Invariant §6.5: Separate Mentor & Org Review Cards) */}
        {activeTab === "submissions" && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900">
                    Evidence Submissions &amp; Review Decisions
                  </h3>
                  <span className="text-[10px] font-bold uppercase text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                    STU-07 Provenance
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  Mentor technical assessments and Organization decisions are recorded on independent verifiable review cards.
                </p>
              </div>

              <button
                type="button"
                disabled={!preview && !workspace.canSubmit}
                onClick={() => setIsSubmitModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-teal-800 px-3.5 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-teal-900 transition shrink-0"
              >
                + New Submission Revision
              </button>
            </div>

            {workspace.submissions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center space-y-2">
                <p className="text-xs text-slate-500">No submissions recorded yet.</p>
                <button
                  type="button"
                  disabled={!preview && !workspace.canSubmit}
                onClick={() => setIsSubmitModalOpen(true)}
                  className="text-xs font-semibold text-teal-800 underline"
                >
                  Submit your first milestone evidence
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {workspace.submissions.map((sub) => (
                  <div
                    key={sub.id}
                    className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-5"
                  >
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 border-b border-slate-100 pb-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">
                            {sub.milestoneTitle}
                          </span>
                          <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                            Revision v{sub.revisionNumber}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                              sub.status === "accepted"
                                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                : "bg-amber-50 text-amber-900 border border-amber-200"
                            }`}
                          >
                            {sub.status.replace("_", " ")}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Submitted on {sub.submittedAt}
                        </div>
                      </div>
                    </div>

                    {/* Summary and Contribution Statement */}
                    <div className="space-y-3 text-xs">
                      <div>
                        <span className="font-bold text-slate-800">Work Accomplished:</span>
                        <p className="mt-1 text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
                          {sub.summary}
                        </p>
                      </div>

                      <div>
                        <span className="font-bold text-slate-800">Personal Contribution Statement:</span>
                        <p className="mt-1 text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
                          {sub.contributionStatement}
                        </p>
                      </div>

                      {/* Links */}
                      {sub.links.length > 0 && (
                        <div>
                          <span className="font-bold text-slate-800">Submitted Links &amp; Evidence:</span>
                          <div className="mt-1 flex flex-wrap gap-2">
                            {sub.links.map((link, idx) => (
                              <a
                                key={idx}
                                href={link.url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 rounded-md bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-900 border border-teal-200 hover:bg-teal-100 transition"
                              >
                                <span>{link.label}</span>
                                <span aria-hidden="true">↗</span>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* SEPARATE REVIEWS (Invariant STU-07: Mentor & Org distinction) */}
                    <div className="grid gap-4 md:grid-cols-2 pt-2 border-t border-slate-100">
                      {/* Review Card 1: Mentor Technical Review */}
                      <div className="rounded-xl border border-teal-200 bg-teal-50/40 p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-teal-900">
                            1. Mentor Technical Assessment
                          </span>
                          <span className="text-[10px] font-semibold text-teal-800 bg-white px-2 py-0.5 rounded border border-teal-200">
                            {sub.mentorReview ? sub.mentorReview.status.replaceAll("_", " ") : "Not assessed"}
                          </span>
                        </div>

                        <div className="text-xs font-bold text-slate-800">
                          Assessor: {sub.mentorReview?.reviewerName}
                        </div>

                        <p className="text-xs text-slate-600 leading-relaxed italic bg-white p-2.5 rounded-md border border-teal-100">
                          “{sub.mentorReview?.feedback}”
                        </p>

                        <div className="text-[10px] text-slate-400">
                          Reviewed: {sub.mentorReview?.reviewedAt}
                        </div>
                      </div>

                      {/* Review Card 2: Organization Decision */}
                      <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700">
                            2. Organization Milestone Decision
                          </span>
                          <span className="text-[10px] font-semibold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                            {sub.organizationDecision ? sub.organizationDecision.status.replaceAll("_", " ") : "No decision"}
                          </span>
                        </div>

                        <div className="text-xs font-bold text-slate-800">
                          Approver: {sub.organizationDecision?.reviewerName}
                        </div>

                        <p className="text-xs text-slate-600 leading-relaxed italic bg-white p-2.5 rounded-md border border-slate-200/60">
                          “{sub.organizationDecision?.feedback}”
                        </p>

                        <div className="text-[10px] text-slate-400">
                          Recorded: {sub.organizationDecision?.reviewedAt}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: AGREED TERMS (Exact Hash & IP Snapshot - No Compensation) */}
        {activeTab === "terms" && (
          <div className="space-y-6 animate-fade-in">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-5">
              <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Immutable Agreed Project Terms
                  </h3>
                  <p className="text-xs text-slate-500">
                    Locked at affirmative offer acceptance pursuant to API-OFFER-02 and ADR-002.
                  </p>
                </div>

                <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
                  Confirmed &amp; Binding
                </span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Terms Version ID
                  </span>
                  <div className="text-xs font-mono font-bold text-slate-900">
                    {workspace.agreedTerms.termsVersionId}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Terms Content SHA256 Hash
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyHash}
                      className="text-[10px] font-semibold text-teal-800 hover:text-teal-900 transition"
                    >
                      {isCopiedHash ? "✓ Copied!" : "Copy Hash"}
                    </button>
                  </div>
                  <div className="text-[11px] font-mono font-bold text-slate-800 break-all">
                    {workspace.agreedTerms.termsHash}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Expected Work Commitment
                  </span>
                  <div className="text-xs font-bold text-slate-900">
                    {workspace.agreedTerms.weeklyHours ? `${workspace.agreedTerms.weeklyHours} hours/week` : "Not supplied"}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Project Timeframe
                  </span>
                  <div className="text-xs font-bold text-slate-900">
                    {workspace.agreedTerms.durationWeeks} weeks total duration
                  </div>
                </div>
              </div>

              {/* IP and Confidentiality Disclosures */}
              <div className="space-y-4 pt-2">
                <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-1.5">
                  <h4 className="text-xs font-bold text-slate-900">
                    Intellectual Property &amp; Evidence Sharing Rights
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {workspace.agreedTerms.ipConditions}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-1.5">
                  <h4 className="text-xs font-bold text-slate-900">
                    Confidentiality &amp; Data Restrictions
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {workspace.agreedTerms.confidentialitySummary}
                  </p>
                </div>
              </div>

              <div className="pt-2 text-[11px] text-slate-400 border-t border-slate-100 flex items-center justify-between">
                <span>Consent recorded on: {workspace.agreedTerms.acceptedAt}</span>
                <span>Web Confirmation Hash Verified</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: SUPPORT & CONFIDENTIAL REPORTING (STU-12) */}
        {activeTab === "support" && (
          <div className="space-y-6 animate-fade-in">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-5">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Support, Safety &amp; Dispute Resolution
                </h3>
                <p className="text-xs text-slate-500">
                  ExperienceBridge guarantees safe, fair, and documented student participation environments.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 p-4 space-y-2">
                  <h4 className="text-xs font-bold text-slate-900">
                    Project Supervisor Contact
                  </h4>
                  <p className="text-xs text-slate-600">
                    For questions regarding milestone scope, design requirements, or repo access:
                  </p>
                  <div className="text-xs font-semibold text-teal-800">
                    {workspace.organizationContact}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 p-4 space-y-2">
                  <h4 className="text-xs font-bold text-slate-900">
                    Faculty / Mentor Escalation
                  </h4>
                  <p className="text-xs text-slate-600">
                    For independent academic guidance or rubric evaluation assistance:
                  </p>
                  <div className="text-xs font-semibold text-teal-800">
                    {workspace.mentor.name} ({workspace.mentor.email})
                  </div>
                </div>
              </div>

              {/* Confidential Reporting Box (STU-12) */}
              <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-rose-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <h4 className="text-xs font-bold text-rose-950">
                    Confidential Issue or Safety Report (STU-12)
                  </h4>
                </div>
                <p className="text-xs text-rose-900 leading-relaxed">
                  If you encounter unexpected non-disclosure demands, unsafe working conditions, or inappropriate behavior, you can submit a confidential report directly to platform administrators. Reports are never disclosed to project sponsors without your affirmative permission.
                </p>
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setIsReportModalOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-xs font-semibold text-rose-800 hover:bg-rose-50 transition"
                  >
                    <span>File Confidential Report</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* EVIDENCE SUBMISSION MODAL (STU-08) */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade-in">
          <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900">
                    Submit Milestone Evidence
                  </h3>
                  <span className="text-[10px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                    STU-08 Evidence Submission
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Provide verifiable deliverables and your personal contribution statement for mentor rubric assessment.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsSubmitModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              >
                ✕
              </button>
            </div>

            {/* Invariant Security Warning (§6.6) */}
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-3.5 text-xs text-amber-950 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <svg className="h-4 w-4 text-amber-700 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span>Privacy &amp; Security Requirement</span>
              </div>
              <p className="leading-relaxed">
                Do not include passwords, production credentials, sensitive customer records, or information you don&apos;t have permission to share.
              </p>
            </div>

            {/* Submission Form */}
            <form onSubmit={handleSubmitEvidence} className="space-y-4">
              {actionError && <p role="alert" className="text-red-700">{actionError}</p>}
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Assigned Milestone *
                </label>
                <select
                  value={selectedMilestoneId || workspace.currentMilestoneId}
                  onChange={(e) => setSelectedMilestoneId(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-teal-800 focus:ring-1 focus:ring-teal-800"
                >
                  {workspace.milestones.map((m) => (
                    <option key={m.id} value={m.id}>
                      Milestone {m.order}: {m.title} ({m.status.replace("_", " ")})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Work Accomplished Summary *
                </label>
                <textarea
                  rows={3}
                  value={workSummary}
                  onChange={(e) => setWorkSummary(e.target.value)}
                  placeholder="Summarize the core technical features built, bugs resolved, and systems integrated..."
                  className="mt-1 block w-full rounded-lg border border-slate-300 p-3 text-xs text-slate-900 focus:border-teal-800 focus:ring-1 focus:ring-teal-800 leading-relaxed"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Personal Contribution Statement *
                </label>
                <textarea
                  rows={2}
                  value={contributionStatement}
                  onChange={(e) => setContributionStatement(e.target.value)}
                  placeholder="State specifically what code, tests, or architecture artifacts you personally wrote or designed..."
                  className="mt-1 block w-full rounded-lg border border-slate-300 p-3 text-xs text-slate-900 focus:border-teal-800 focus:ring-1 focus:ring-teal-800 leading-relaxed"
                  required
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    GitHub PR / Commit Link
                  </label>
                  <input
                    type="url"
                    value={githubPrUrl}
                    onChange={(e) => setGithubPrUrl(e.target.value)}
                    placeholder="https://github.com/.../pull/12"
                    className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-teal-800 focus:ring-1 focus:ring-teal-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Live Demo or Artifact URL
                  </label>
                  <input
                    type="url"
                    value={demoOrDocUrl}
                    onChange={(e) => setDemoOrDocUrl(e.target.value)}
                    placeholder="https://demo.experiencebridge.internal/..."
                    className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-teal-800 focus:ring-1 focus:ring-teal-800"
                  />
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsSubmitModalOpen(false)}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting || (!preview && (!workspace.milestones.length || !workspace.canSubmit))}
                  className="inline-flex items-center gap-2 rounded-lg bg-teal-800 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-teal-900 transition disabled:opacity-70"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      <span>Submitting evidence live...</span>
                    </>
                  ) : (
                    <span>Submit Milestone Evidence</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIDENTIAL REPORT MODAL (STU-12) */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade-in">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  File Confidential Safety / Issue Report
                </h3>
                <p className="text-xs text-slate-500">
                  Handled under strict confidentiality by platform ombudspersons.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsReportModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitReport} className="space-y-3 text-xs">
              {actionError && <p role="alert" className="text-red-700">{actionError}</p>}
              <div>
                <label className="block font-semibold text-slate-700">Issue Category</label>
                <select
                  value={reportCategory}
                  onChange={(e) => setReportCategory(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-900"
                >
                  <option value="scope">Unexpected Out-of-Scope Demands</option>
                  <option value="safety">Unsafe or Discriminatory Working Environment</option>
                  <option value="mentor">Mentor Unresponsiveness / Non-Adherence</option>
                  <option value="ip">Intellectual Property / Non-Disclosure Overreach</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700">Confidential Description</label>
                <textarea
                  rows={4}
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  placeholder="Describe what occurred with dates and relevant context. This statement will not be shared with the organization without your permission..."
                  className="mt-1 block w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-900"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsReportModalOpen(false)}
                  className="rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-rose-700 px-4 py-1.5 text-xs font-semibold text-white hover:bg-rose-800 transition"
                >
                  Submit Confidential Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
