"use client";

import { useCallback, useRef, useState } from "react";
import { usePortalResource, requireData } from "@/lib/api/use-portal-resource";
import { isPortalPresentationMode } from "@/lib/auth/portal-presentation";
import { mapApplication, termsSnapshot } from "../lib/api-records";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { StudentPortalHeader } from "./student-portal-header";
import { syntheticApplicationsList } from "../lib/mock-data";
import type { ApplicationStatus, StudentApplicationDetails } from "../lib/types";

const APPLICATIONS_STORAGE_KEY = "experiencebridge_student_applications_list";
const PARTICIPATIONS_STORAGE_KEY = "experiencebridge_student_participations_list";

function generateEventId(prefix: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

interface StudentApplicationDetailViewProps {
  applicationId: string;
}

export function StudentApplicationDetailView({
  applicationId,
}: StudentApplicationDetailViewProps) {
  const pathname = usePathname();
  const isDevPreview = Boolean(pathname?.startsWith("/dev/student"));
  const preview = isDevPreview || isPortalPresentationMode();
  const live = usePortalResource(useCallback(async api => {
    const record = requireData(await api.getApplication(applicationId));
    const offer = record.latest_offer ? requireData(await api.getOffer(record.latest_offer.id)) : null;
    return { record, offer, view: mapApplication(record, offer) };
  }, [applicationId]), !preview);
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState(false);
  const acting = useRef(false);
  const basePath = isDevPreview ? "/dev/student" : "/student";

  // Load applications from localStorage or fallback to synthetic mock data
  const [applications, setApplications] = useState<StudentApplicationDetails[]>(() => {
    if (!preview) return [];
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(APPLICATIONS_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as StudentApplicationDetails[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      } catch {
        // Fall back to synthetic fixtures
      }
    }
    return syntheticApplicationsList ?? [];
  });

  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [isAcceptModalOpen, setIsAcceptModalOpen] = useState(false);
  const [decliningOffer, setDecliningOffer] = useState(false);
  const [withdrawReason, setWithdrawReason] = useState("");
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  // Find the target application
  const currentApp = preview ? applications.find((a) => a.id === applicationId) : live.data?.view;

  const saveApplicationsToStorage = (updatedApps: StudentApplicationDetails[]) => {
    setApplications(updatedApps);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(APPLICATIONS_STORAGE_KEY, JSON.stringify(updatedApps, null, 2));
      } catch (err) {
        console.error("Failed to save applications to localStorage:", err);
      }
    }
  };

  // Handle Offer Acceptance (§6.4 Affirmative Offer Acceptance)
  const handleAcceptOffer = async () => {
    if (!preview) {
      if (acting.current || !live.data?.offer) return;
      acting.current = true; setBusy(true); setActionError("");
      try {
        const offer = live.data.offer;
        if (offer.status !== "offered") throw new Error("This offer is no longer available for acceptance.");
        const api = await live.getApi();
        requireData(await api.acceptOffer(offer.id, offer.row_version, offer.terms_version_id, offer.terms_hash));
        await live.reload(); setIsAcceptModalOpen(false);
        setActionSuccessMessage("Offer acceptance and participation confirmed by the API. Mentor acceptance remains separate.");
      } catch (e) { setActionError(e instanceof Error ? e.message : "Acceptance could not be confirmed. Refresh before retrying."); }
      finally { acting.current = false; setBusy(false); }
      return;
    }
    setIsAcceptModalOpen(false);
    if (!currentApp) return;

    const timestamp = new Date().toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
    const participationId = currentApp.participationId || `part-${currentApp.id}`;

    const updatedApp: StudentApplicationDetails = {
      ...currentApp,
      status: "accepted" as ApplicationStatus,
      participationId,
      timeline: [
        ...currentApp.timeline,
        {
          id: generateEventId("evt-accept"),
          status: "accepted" as ApplicationStatus,
          title: "Offer Accepted — Participation Activated",
          description: `Applicant affirmatively accepted project offer. Participation workspace created with terms hash ${currentApp.observedTermsSnapshot.termsVersionId}.`,
          timestamp,
        },
      ],
    };

    const updatedApps = applications.map((a) => (a.id === currentApp.id ? updatedApp : a));
    saveApplicationsToStorage(updatedApps);

    // Also notify participations list if stored in localStorage
    if (typeof window !== "undefined") {
      try {
        const existingPartsStr = localStorage.getItem(PARTICIPATIONS_STORAGE_KEY);
        const existingParts = existingPartsStr ? JSON.parse(existingPartsStr) : [];
        const alreadyExists = existingParts.some(
          (p: { participationId: string }) => p.participationId === participationId
        );
        if (!alreadyExists) {
          const newParticipation = {
            participationId,
            projectId: currentApp.projectId,
            projectTitle: currentApp.projectTitle,
            organizationName: currentApp.organizationName,
            organizationVerified: currentApp.organizationVerified,
            mentorName: "Dr. K. Mensah (Faculty Mentor)",
            mentorStatus: "accepted",
            status: "active",
            currentMilestone: "Milestone 1: Kickoff & Environment Setup",
            nextMilestoneDue: "In 14 days",
            progressPercent: 0,
            completedMilestonesCount: 0,
            totalMilestonesCount: 4,
            weeklyHours: currentApp.observedTermsSnapshot.weeklyHours,
          };
          localStorage.setItem(
            PARTICIPATIONS_STORAGE_KEY,
            JSON.stringify([newParticipation, ...existingParts], null, 2)
          );
        }
      } catch (e) {
        console.warn("Could not sync participation into localStorage:", e);
      }
    }

    setActionSuccessMessage("Congratulations! Project offer accepted and participation workspace initialized.");
  };

  // Handle Withdrawal
  const handleConfirmWithdrawal = async () => {
    if (!preview) {
      if (acting.current || !live.data) return;
      acting.current = true; setBusy(true); setActionError("");
      try {
        const api = await live.getApi();
        if (decliningOffer) {
          const offer = live.data.offer;
          if (!offer || offer.status !== "offered") throw new Error("This offer is no longer available.");
          requireData(await api.declineOffer(offer.id, offer.row_version, withdrawReason.trim() || undefined));
          if (requireData(await api.getOffer(offer.id)).status !== "declined") throw new Error("Offer decline could not be confirmed.");
        } else {
          requireData(await api.withdrawApplication(applicationId, live.data.record.row_version, withdrawReason.trim() || "Withdrawn by the student."));
        }
        await live.reload(); setIsWithdrawModalOpen(false); setActionSuccessMessage(decliningOffer ? "Offer declined." : "Application withdrawn.");
      } catch (e) { setActionError(e instanceof Error ? e.message : "Withdrawal failed."); }
      finally { acting.current = false; setBusy(false); }
      return;
    }
    if (!currentApp) return;

    const timestamp = new Date().toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
    const updatedApp: StudentApplicationDetails = {
      ...currentApp,
      status: "withdrawn",
      withdrawalReason: withdrawReason.trim() || "Withdrawn by candidate request.",
      timeline: [
        ...currentApp.timeline,
        {
          id: generateEventId("evt-withdraw"),
          status: "withdrawn",
          title: "Application Withdrawn",
          description: withdrawReason.trim()
            ? `Candidate withdrew application: "${withdrawReason.trim()}"`
            : "Candidate voluntarily withdrew this application.",
          timestamp,
        },
      ],
    };

    const updatedApps = applications.map((a) => (a.id === currentApp.id ? updatedApp : a));
    saveApplicationsToStorage(updatedApps);
    setIsWithdrawModalOpen(false);
    setWithdrawReason("");
    setActionSuccessMessage("Application has been successfully withdrawn.");
  };

  if (!preview && (live.loading || live.error)) return <main className="mx-auto max-w-5xl p-6"><p role={live.error ? "alert" : "status"}>{live.error || "Loading application..."}</p><button onClick={() => void live.reload().catch(() => {})}>Refresh records</button></main>;
  if (!currentApp) {
    return (
      <div className="min-h-[calc(100vh-65px)] bg-slate-50 pb-16">
        <StudentPortalHeader studentName={preview ? "Stella Appiok" : "Student"} isSynthetic={preview} />
        <main className="mx-auto max-w-4xl px-4 sm:px-6 pt-12 text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900">Application Not Found</h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            We could not find application with ID &quot;{applicationId}&quot;. It may have been reset or removed.
          </p>
          <div className="pt-2">
            <Link
              href={`${basePath}/applications`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-teal-800 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-900 transition"
            >
              ← Back to My Applications
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const statusBadgeColor =
    currentApp.status === "offered"
      ? "bg-amber-100 text-amber-950 border-amber-300 font-bold"
      : currentApp.status === "accepted"
      ? "bg-emerald-100 text-emerald-950 border-emerald-300 font-bold"
      : currentApp.status === "shortlisted"
      ? "bg-teal-50 text-teal-900 border-teal-200 font-semibold"
      : currentApp.status === "under_review"
      ? "bg-blue-50 text-blue-900 border-blue-200"
      : currentApp.status === "rejected"
      ? "bg-red-50 text-red-900 border-red-200 font-semibold"
      : currentApp.status === "withdrawn"
      ? "bg-slate-100 text-slate-600 border-slate-200"
      : "bg-slate-100 text-slate-800 border-slate-200";

  const statusLabel =
    currentApp.status === "offered"
      ? (currentApp.offerStatus && currentApp.offerStatus !== "offered" ? `Offer ${currentApp.offerStatus}` : "Offer Extended • Action Required")
      : currentApp.status === "accepted"
      ? "Offer Accepted • Active Project"
      : currentApp.status === "shortlisted"
      ? "Shortlisted for Final Placement"
      : currentApp.status === "under_review"
      ? "Under Technical Review"
      : currentApp.status === "rejected"
      ? "Not Selected"
      : currentApp.status === "withdrawn"
      ? "Withdrawn"
      : "Submitted • In Review Queue";

  const canWithdraw = ["submitted", "under_review", "shortlisted", "offered"].includes(currentApp.status);
  const participationLink = currentApp.participationId ? `${basePath}/projects/${currentApp.participationId}` : `${basePath}/projects`;

  return (
    <div className="min-h-[calc(100vh-65px)] bg-slate-50 pb-16">
      <StudentPortalHeader studentName={preview ? "Stella Appiok" : "Student"} isSynthetic={true} />

      <main className="mx-auto max-w-5xl px-4 sm:px-6 pt-6 space-y-6">
        {actionError && <p role="alert" className="text-red-700">{actionError}</p>}
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href={`${basePath}/applications`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-800 hover:text-teal-950 transition"
          >
            <span aria-hidden="true">←</span>
            <span>Back to My Applications</span>
          </Link>

          <span className="text-[10px] font-mono text-slate-400">
            ID: {currentApp.id}
          </span>
        </div>

        {/* Action Success Alert */}
        {actionSuccessMessage && (
          <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-xs font-semibold text-emerald-900 flex items-center justify-between shadow-2xs animate-fade-in">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-600" />
              <span>{actionSuccessMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setActionSuccessMessage(null)}
              className="text-emerald-700 hover:text-emerald-950 font-bold"
            >
              ×
            </button>
          </div>
        )}

        {/* HERO CARD */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-slate-700">
                  {currentApp.organizationName}
                </span>
                {currentApp.organizationVerified && (
                  <span className="inline-flex items-center gap-1 rounded bg-teal-50 px-2 py-0.5 text-[10px] font-semibold text-teal-800 border border-teal-200">
                    ✓ Verified Organization
                  </span>
                )}
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] border ${statusBadgeColor}`}>
                  {statusLabel}
                </span>
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                {currentApp.projectTitle}
              </h1>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                <span>Applied on: <strong className="text-slate-800">{currentApp.appliedAt}</strong></span>
                <span>•</span>
                <span>Observed Terms: <strong className="font-mono text-slate-800">{currentApp.observedTermsSnapshot.termsVersionId}</strong></span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {currentApp.status === "accepted" && (
                <Link
                  href={participationLink}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-teal-800 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-teal-900 transition"
                >
                  <span>Open Project Workspace</span>
                  <span aria-hidden="true">→</span>
                </Link>
              )}

              {canWithdraw && (
                <button
                  type="button"
                  onClick={() => { setDecliningOffer(false); setActionError(""); setIsWithdrawModalOpen(true); }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 transition shadow-2xs"
                >
                  <span>Withdraw Application</span>
                </button>
              )}
            </div>
          </div>

          {/* URGENT OFFER ACCEPTANCE CALLOUT BANNER (§6.4) */}
          {currentApp.status === "offered" && (preview || live.data?.offer?.status === "offered") && (
            <div className="rounded-xl border border-amber-300 bg-amber-50/70 p-5 space-y-3.5 shadow-xs">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="flex h-2.5 w-2.5 rounded-full bg-amber-600 animate-pulse" />
                    <h3 className="text-sm font-bold text-amber-950">
                      Official Project Offer Received
                    </h3>
                  </div>
                  <p className="text-xs text-amber-900 leading-relaxed max-w-2xl">
                    {currentApp.organizationName} has reviewed your application and extended an official offer to collaborate on this project.
                    Under ExperienceBridge governance (§6.4), affirmative acceptance binds the agreed terms snapshot and provisions your project workspace.
                  </p>
                </div>

                {currentApp.offerDeadline && (
                  <span className="shrink-0 rounded-lg bg-amber-100 border border-amber-200 px-2.5 py-1 text-[11px] font-bold text-amber-900">
                    {currentApp.offerDeadline}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-amber-200/60">
                <button
                  type="button"
                  onClick={() => setIsAcceptModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-teal-800 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-teal-900 transition focus-visible:outline-2 focus-visible:outline-teal-800"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Accept Offer &amp; Begin Project</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setDecliningOffer(true); setActionError(""); setIsWithdrawModalOpen(true); }}
                  className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Decline Offer
                </button>
              </div>
            </div>
          )}

          {!preview && currentApp.offerStatus && currentApp.offerStatus !== "offered" && currentApp.offerStatus !== "accepted" && <p role="status">Offer {currentApp.offerStatus}. You can check back for a new offer.</p>}
          {/* ACCEPTED BANNER */}
          {currentApp.status === "accepted" && (
            <div className="rounded-xl border border-emerald-300 bg-emerald-50/70 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-2xs">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-600" />
                  <span className="text-xs font-bold text-emerald-950">
                    Offer Accepted — Project Workspace Activated
                  </span>
                </div>
                <p className="text-xs text-emerald-900">
                  You are actively enrolled in this project. Access deliverables, milestone reviews, and mentor communications in your workspace.
                </p>
              </div>

              <Link
                href={participationLink}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800 transition shrink-0"
              >
                <span>Go to Workspace</span>
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          )}

          {/* WITHDRAWN BANNER */}
          {currentApp.status === "withdrawn" && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-1 text-xs text-slate-600">
              <span className="font-bold text-slate-800">Application Withdrawn</span>
              <p>{currentApp.withdrawalReason || "This application was withdrawn."}</p>
            </div>
          )}
        </div>

        {/* TWO-COLUMN LAYOUT: APPLICATION CONTENT & SIDEBAR */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* LEFT 2 COLUMNS: SUBMISSION DETAILS & TIMELINE */}
          <div className="lg:col-span-2 space-y-6">
            {/* Statement of Fit / Motivation */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <h2 className="text-sm font-bold text-slate-900">
                  Motivation &amp; Statement of Fit
                </h2>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Self-Reported Submission
                </span>
              </div>

              <p className="text-xs leading-relaxed text-slate-700 whitespace-pre-line bg-slate-50/70 p-4 rounded-xl border border-slate-100 font-normal">
                {currentApp.motivationStatement}
              </p>
            </div>

            {/* Declared Skills & External Evidence */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
              <div className="border-b border-slate-100 pb-2.5">
                <h2 className="text-sm font-bold text-slate-900">
                  Applicant Skills &amp; Portfolio Links
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Declared competencies and external proof links provided during application.
                </p>
              </div>

              {/* Skills */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Highlighted Skills
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {currentApp.declaredSkills.map((skill, idx) => (
                    <span
                      key={idx}
                      className="rounded-lg bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-900 border border-teal-200"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* Links */}
              {currentApp.externalLinks.length > 0 && (
                <div className="space-y-1.5 pt-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Verified Portfolio &amp; Repository Links
                  </span>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {currentApp.externalLinks.map((link, idx) => (
                      <a
                        key={idx}
                        href={link.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50/50 p-2.5 text-xs font-medium text-slate-700 hover:border-teal-700 hover:bg-teal-50/30 transition group"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <svg className="h-4 w-4 text-slate-400 group-hover:text-teal-700 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                          <span className="truncate">{link.label}</span>
                        </div>
                        <span className="text-[10px] text-teal-800 font-semibold shrink-0">Open ↗</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* CHRONOLOGICAL TIMELINE STEPPER */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
              <div className="border-b border-slate-100 pb-2.5">
                <h2 className="text-sm font-bold text-slate-900">
                  Application Progress &amp; Audit Trail
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Verifiable chronological milestones recorded by platform reviewers.
                </p>
              </div>

              <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {currentApp.timeline.map((event, index) => {
                  const isLatest = index === currentApp.timeline.length - 1;

                  return (
                    <div key={event.id} className="relative space-y-1">
                      {/* Timeline Dot */}
                      <span
                        className={`absolute -left-6 top-1 flex h-5 w-5 items-center justify-center rounded-full ring-4 ring-white ${
                          event.status === "accepted"
                            ? "bg-emerald-600 text-white"
                            : event.status === "offered"
                            ? "bg-amber-600 text-white"
                            : event.status === "shortlisted"
                            ? "bg-teal-700 text-white"
                            : event.status === "withdrawn"
                            ? "bg-rose-500 text-white"
                            : "bg-slate-600 text-white"
                        }`}
                      >
                        <span className="text-[10px] font-bold">●</span>
                      </span>

                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                        <span className={`text-xs font-bold ${isLatest ? "text-slate-900" : "text-slate-700"}`}>
                          {event.title}
                        </span>
                        <span className="text-[11px] text-slate-400">{event.timestamp}</span>
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed">
                        {event.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: OBSERVED TERMS SNAPSHOT (§5.4) */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                    §5.4 Terms Snapshot
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">
                    Immutable
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-900 mt-2">
                  Observed Project Terms
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Snapshot recorded at the exact moment of application submission.
                </p>
              </div>

              <div className="space-y-3.5 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">Terms Version ID</span>
                  <p className="font-mono text-xs font-bold text-slate-800">
                    {currentApp.observedTermsSnapshot.termsVersionId}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">Weekly Commitment</span>
                  <p className="font-semibold text-slate-800">
                    {currentApp.observedTermsSnapshot.weeklyHours} hours per week
                  </p>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">Project Duration</span>
                  <p className="font-semibold text-slate-800">
                    {currentApp.observedTermsSnapshot.durationWeeks} weeks
                  </p>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">IP &amp; Attribution</span>
                  <p className="text-slate-600 mt-0.5 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    {currentApp.observedTermsSnapshot.ipConditions}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">Confidentiality</span>
                  <p className="text-slate-600 mt-0.5 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    {currentApp.observedTermsSnapshot.confidentialitySummary}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-400">
                  Snapshot Date: <strong className="text-slate-600">{currentApp.observedTermsSnapshot.snapshotDate}</strong>
                </div>

                <button
                  type="button"
                  onClick={() => typeof window !== "undefined" && window.print()}
                  className="w-full mt-2 inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
                >
                  <svg className="h-3.5 w-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  <span>Print / Download Terms Snapshot</span>
                </button>
              </div>
            </div>

            {/* Support / Inquiries Info */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 space-y-2 text-xs">
              <span className="font-bold text-slate-800">Need to make adjustments?</span>
              <p className="text-slate-500 leading-relaxed">
                Applications undergo independent screening. If your availability has changed, you may voluntarily withdraw before an offer is extended.
              </p>
              <div className="pt-2">
                <Link
                  href={`${basePath}/projects`}
                  className="font-semibold text-teal-800 hover:underline"
                >
                  Explore Active Project Workspace →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* WITHDRAW APPLICATION MODAL */}
      {isWithdrawModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade-in">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {decliningOffer ? "Decline Offer" : "Withdraw Application"}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Are you sure you want to {decliningOffer ? "decline the offer" : "withdraw your application"} for &quot;{currentApp.projectTitle}&quot;?
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsWithdrawModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            {actionError && <p role="alert" className="text-red-700">{actionError}</p>}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700">
                Reason (Optional)
              </label>
              <textarea
                rows={3}
                value={withdrawReason}
                onChange={(e) => setWithdrawReason(e.target.value)}
                placeholder="E.g., Accepted another project, schedule conflict, or course load adjustment..."
                className="w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-rose-600 focus:ring-1 focus:ring-rose-600"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsWithdrawModalOpen(false)}
                className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy} onClick={handleConfirmWithdrawal}
                className="rounded-lg bg-rose-700 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-800 transition"
              >
                {decliningOffer ? "Confirm Decline" : "Confirm Withdrawal"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AFFIRMATIVE OFFER ACCEPTANCE CONFIRMATION MODAL (§6.4) */}
      {isAcceptModalOpen && currentApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade-in">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900">
                    Affirmative Offer Acceptance
                  </h3>
                  <span className="text-[10px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                    §6.4 Consent Contract
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Review terms snapshot confirmation before activating project participation.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAcceptModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-4 text-xs text-slate-700 leading-relaxed space-y-2">
              <span className="font-bold text-teal-900 block uppercase tracking-wider text-[10px]">
                Offer acceptance
              </span>
              <p>
                You are accepting project terms version{" "}
                <strong className="font-mono text-teal-900">
                  {currentApp.observedTermsSnapshot.termsVersionId}
                </strong>{" "}
                for <strong>{currentApp.projectTitle}</strong>, including{" "}
                <strong>{currentApp.observedTermsSnapshot.weeklyHours} hours per week</strong>{" "}
                over <strong>{currentApp.observedTermsSnapshot.durationWeeks} weeks</strong>.
              </p>
              <p className="text-[11px] text-slate-500 pt-1 border-t border-teal-100">
                You can report concerns or request a formal review if terms change during the project lifecycle.
              </p>
            </div>

            {!preview && live.data?.offer && <div className="text-xs space-y-2">
              <p>{live.data.offer.consent_statement}</p>
              <p>Scope: {termsSnapshot(live.data.offer.terms).scope.scope_in}</p>
              <p>Compensation: {termsSnapshot(live.data.offer.terms).terms.currency} {termsSnapshot(live.data.offer.terms).terms.fee_amount} ? {termsSnapshot(live.data.offer.terms).terms.payment_terms}</p>
              <p>IP: {termsSnapshot(live.data.offer.terms).terms.ip_ownership_terms}</p>
              <p>Confidentiality: {termsSnapshot(live.data.offer.terms).terms.confidentiality_terms}</p>
            </div>}
            {actionError && <p role="alert" className="text-red-700">{actionError}</p>}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsAcceptModalOpen(false)}
                className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleAcceptOffer();
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-teal-800 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-teal-900 transition"
              >
                <span>{busy ? "Saving..." : "Confirm & Accept Terms"}</span>
                <span aria-hidden="true">✓</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
