"use client";

import { useCallback, useRef, useState } from "react";
import { usePortalResource, requireData } from "@/lib/api/use-portal-resource";
import { isPortalPresentationMode } from "@/lib/auth/portal-presentation";
import { mapApplication, termsSnapshot } from "../lib/api-records";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { StudentPortalHeader } from "./student-portal-header";
import { syntheticApplicationsList } from "../lib/mock-data";
import { toast } from "sonner";
import { BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NextStepHint, PageSkeleton, StatusTimeline, type TimelineStep } from "@/components/ui/primitives";
import { Pill, StatusBadge } from "@/components/ui/status-badge";
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


const STEP_ORDER = ["submitted", "under_review", "shortlisted", "offered", "accepted"] as const;
const STEP_LABEL: Record<(typeof STEP_ORDER)[number], string> = { submitted: "Sent", under_review: "In review", shortlisted: "Shortlisted", offered: "Offer", accepted: "Accepted" };

function applicationSteps(status: string): TimelineStep[] {
  if (status === "rejected" || status === "withdrawn") {
    return [
      { label: "Sent", state: "done" },
      { label: status === "rejected" ? "Not accepted" : "Withdrawn", state: "stopped" },
    ];
  }
  const index = Math.max(0, STEP_ORDER.indexOf(status as (typeof STEP_ORDER)[number]));
  return STEP_ORDER.map((step, i) => ({ label: STEP_LABEL[step], state: i < index || status === "accepted" ? "done" : i === index ? "current" : "upcoming" }));
}

function nextStep(status: string) {
  if (status === "submitted" || status === "under_review") return <NextStepHint waitingOn="The organisation" detail="They read every application and reply with a shortlist, an offer or a decision." />;
  if (status === "shortlisted") return <NextStepHint waitingOn="The organisation" detail="You're on the shortlist. They're deciding who to make offers to." />;
  if (status === "offered") return <NextStepHint tone="gold" waitingOn="You" detail="Accept or decline the offer below." />;
  if (status === "accepted") return <NextStepHint waitingOn="You" detail="Start your first milestone in your project workspace." />;
  if (status === "rejected") return <p className="rounded-xl bg-canvas p-3 text-sm text-ink-700">This organisation chose other applicants this time. Keep applying — every application helps.</p>;
  return null;
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

  // Handle Offer Acceptance (§6.4 Accept this offer?)
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
        toast.success("Offer accepted. Welcome to the project!", { description: "Your workspace is open. Your mentor will be assigned by the organisation." });
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
        await live.reload(); setIsWithdrawModalOpen(false); toast(decliningOffer ? "Offer declined" : "Application withdrawn");
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

  if (!preview && live.loading && !live.data) return <PageSkeleton />;
  if (!preview && live.error) return <div role="alert" className="mx-auto max-w-md py-16 text-center"><p className="text-lg font-semibold text-ink-900">We couldn&apos;t load this application</p><p className="mt-2 text-sm text-ink-500">Check your connection and try again.</p><Button className="mt-6" onClick={() => void live.reload().catch(() => {})}>Try again</Button></div>;
  if (!currentApp) {
    return (
      <div className="space-y-6">
        {preview && <StudentPortalHeader studentName="Stella Appiok" isSynthetic />}
        <div className="mx-auto max-w-4xl pt-12 text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-ink-900">We can&apos;t find this application</h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            It may have been removed. Go back to see all your applications.
          </p>
          <div className="pt-2">
            <Link
              href={`${basePath}/applications`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-teal-800 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-900 transition"
            >
              ← Back to your applications
            </Link>
          </div>
        </div>
      </div>
    );
  }



  const canWithdraw = ["submitted", "under_review", "shortlisted", "offered"].includes(currentApp.status);
  const participationLink = currentApp.participationId ? `${basePath}/projects/${currentApp.participationId}` : `${basePath}/projects`;

  return (
    <div className="space-y-6">
      {preview && <StudentPortalHeader studentName="Stella Appiok" isSynthetic />}

      <div className="space-y-6">
        {actionError && <p role="alert" className="rounded-[var(--radius-card)] border border-danger/20 bg-danger-bg p-3 text-sm text-danger-text">{actionError}</p>}
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href={`${basePath}/applications`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-800 hover:text-teal-950 transition"
          >
            <span aria-hidden="true">←</span>
            <span>Back to your applications</span>
          </Link>


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
                {currentApp.organizationVerified && <Pill tone="gold"><BadgeCheck className="size-3.5" aria-hidden />Verified organisation</Pill>}
                <StatusBadge status={currentApp.status} />
              </div>

              <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
                {currentApp.projectTitle}
              </h1>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                <span>Applied {String(currentApp.appliedAt ?? "").slice(0, 10)}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {currentApp.status === "accepted" && (
                <Link
                  href={participationLink}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-teal-800 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-teal-900 transition"
                >
                  <span>Open workspace</span>
                  <span aria-hidden="true">→</span>
                </Link>
              )}

              {canWithdraw && (
                <button
                  type="button"
                  onClick={() => { setDecliningOffer(false); setActionError(""); setIsWithdrawModalOpen(true); }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 transition shadow-2xs"
                >
                  <span>Withdraw application</span>
                </button>
              )}
            </div>
          </div>

          <StatusTimeline steps={applicationSteps(currentApp.status)} className="pt-1" />
          {nextStep(currentApp.status)}

          {/* Offer callout */}
          {currentApp.status === "offered" && (preview || live.data?.offer?.status === "offered") && (
            <div className="rounded-xl border border-amber-300 bg-amber-50/70 p-5 space-y-3.5 shadow-xs">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="flex h-2.5 w-2.5 rounded-full bg-amber-600 animate-pulse" />
                    <h3 className="text-sm font-bold text-amber-950">
                      You have an offer
                    </h3>
                  </div>
                  <p className="text-xs text-amber-900 leading-relaxed max-w-2xl">
                    The organisation reviewed your application and would like you to join this project.
                    Accepting means you agree to the project terms on this page, and your project workspace opens straight away.
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
                  <span>Accept offer</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setDecliningOffer(true); setActionError(""); setIsWithdrawModalOpen(true); }}
                  className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Decline offer
                </button>
              </div>
            </div>
          )}

          {!preview && currentApp.offerStatus && currentApp.offerStatus !== "offered" && currentApp.offerStatus !== "accepted" && <p role="status" className="rounded-xl bg-canvas p-3 text-sm text-ink-700">This offer is {currentApp.offerStatus}. The organisation may send a new one.</p>}
          {/* ACCEPTED BANNER */}
          {currentApp.status === "accepted" && (
            <div className="rounded-xl border border-emerald-300 bg-emerald-50/70 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-2xs">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-600" />
                  <span className="text-xs font-bold text-emerald-950">
                    You&apos;re on this project
                  </span>
                </div>
                <p className="text-xs text-emerald-900">
                  Your workspace has your milestones, submissions and feedback.
                </p>
              </div>

              <Link
                href={participationLink}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800 transition shrink-0"
              >
                <span>Go to workspace</span>
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          )}

          {/* WITHDRAWN BANNER */}
          {currentApp.status === "withdrawn" && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-1 text-xs text-slate-600">
              <span className="font-bold text-ink-900">You withdrew this application</span>
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
                    Terms
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">
                    Fixed
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-900 mt-2">
                  Project terms you saw
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  The terms shown when you applied.
                </p>
              </div>

              <div className="space-y-3.5 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 font-semibold uppercase">Terms version</span>
                  <p className="font-mono text-xs font-bold text-slate-800">
                    {currentApp.observedTermsSnapshot.termsVersionId}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">Hours per week</span>
                  <p className="font-semibold text-slate-800">
                    {currentApp.observedTermsSnapshot.weeklyHours} hours per week
                  </p>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">Length</span>
                  <p className="font-semibold text-slate-800">
                    {currentApp.observedTermsSnapshot.durationWeeks} weeks
                  </p>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">Who owns the work</span>
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
                  <span>Print terms</span>
                </button>
              </div>
            </div>

            {/* Support / Inquiries Info */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 space-y-2 text-xs">
              <span className="font-bold text-slate-800">Plans changed?</span>
              <p className="text-slate-500 leading-relaxed">
                If you can no longer take part, you can withdraw your application at any time before you accept an offer.
              </p>
              <div className="pt-2">
                <Link
                  href={`${basePath}/projects`}
                  className="font-semibold text-teal-800 hover:underline"
                >
                  Open your workspace →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

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
                    Your agreement
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Check the terms one last time. Accepting opens your project workspace.
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
                If the terms change later, the organisation must ask you again.
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
