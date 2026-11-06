"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { StudentPortalHeader } from "./student-portal-header";
import { BadgeCheck, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, EmptyState, NextStepHint, StatCard } from "@/components/ui/primitives";
import { Pill, StatusBadge } from "@/components/ui/status-badge";
import { ActionList, useActionItems } from "@/components/app/action-centre";
import { isPortalPresentationMode } from "@/lib/auth/portal-presentation";
import {
  loadApplications,
  loadOpportunities,
  loadParticipations,
  loadStudentPassportAndDecisions,
} from "../lib/api-records";
import { usePortalApi } from "@/lib/api/portal-api";
import { useVisibleRefresh } from "@/lib/api/use-visible-refresh";
import {
  syntheticActiveStudentDashboard,
  syntheticEmptyStudentDashboard,
} from "../lib/mock-data";
import type {
  StudentApplicationDetails,
  StudentDashboardData,
  StudentDecisionAudit,
  StudentParticipationSummaryItem,
  StudentPassportTeaser,
} from "../lib/types";

const APPLICATIONS_STORAGE_KEY = "experiencebridge_student_applications_list";
const PARTICIPATIONS_STORAGE_KEY = "experiencebridge_student_participations_list";
const PROFILE_STORAGE_KEY = "experiencebridge_student_profile_data";

const EMPTY_PASSPORT_SUMMARY: StudentPassportTeaser = {
  verifiedClaimsCount: 0,
  completedProjectsCount: 0,
  mentorObservationsCount: 0,
};

export function StudentDashboardView() {
  const pathname = usePathname();
  const isDevPreview = Boolean(pathname?.startsWith("/dev/student"));
  const basePath = isDevPreview ? "/dev/student" : "/student";
  const { getApi, isSignedIn } = usePortalApi();
  const { data: actionItems } = useActionItems("student");

  const preview = isDevPreview || isPortalPresentationMode();
  const [loadError, setLoadError] = useState("");
  // State to toggle between active mock dashboard and empty state dashboard
  const [dashboardState, setDashboardState] = useState<"active" | "empty">("active");

  const [studentName, setStudentName] = useState("Student");
  const [applications, setApplications] = useState<StudentApplicationDetails[]>([]);
  const [participations, setParticipations] = useState<StudentParticipationSummaryItem[]>([]);
  const [liveDecisions, setLiveDecisions] = useState<StudentDecisionAudit[]>([]);
  const [livePassportSummary, setLivePassportSummary] = useState<StudentPassportTeaser>(
    EMPTY_PASSPORT_SUMMARY
  );
  const [availableProjectsCount, setAvailableProjectsCount] = useState<number>(0);
  const [pendingSubmissionsCount, setPendingSubmissionsCount] = useState<number>(0);

  useEffect(() => {
    if (!preview) return;
    // Read browser-only fixtures after hydration, and never in authenticated live mode.
    const timer = window.setTimeout(() => {
      try {
        const profile = JSON.parse(localStorage.getItem(PROFILE_STORAGE_KEY) ?? "null");
        setStudentName(typeof profile?.displayName === "string" ? profile.displayName : "Stella Appiok");
        const apps = JSON.parse(localStorage.getItem(APPLICATIONS_STORAGE_KEY) ?? "[]");
        const parts = JSON.parse(localStorage.getItem(PARTICIPATIONS_STORAGE_KEY) ?? "[]");
        if (Array.isArray(apps)) setApplications(apps);
        if (Array.isArray(parts)) setParticipations(parts);
      } catch {
        /* Invalid preview backups are ignored. */
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [preview]);

  const reloadLiveDashboard = useCallback(async () => {
    if (preview || !isSignedIn) return;
    const api = await getApi();
    const me = await api.getMe();
    if (!me.data) throw new Error(me.error ?? "Identity unavailable.");
    setStudentName(me.data.display_name ?? "Student");
    const [apps, parts, extras, discovery] = await Promise.all([
      loadApplications(api),
      loadParticipations(api),
      loadStudentPassportAndDecisions(api),
      loadOpportunities(api),
    ]);
    setLoadError("");
    setApplications(apps);
    setParticipations(parts);
    setLiveDecisions(extras.recentDecisions);
    setLivePassportSummary(extras.passportSummary);
    setAvailableProjectsCount(Object.keys(discovery.opportunities).length);
    setPendingSubmissionsCount(extras.pendingSubmissionsCount);
  }, [preview, isSignedIn, getApi]);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      if (preview) return;
      if (!isSignedIn) {
        if (active) {
          setStudentName("Student");
          setApplications([]);
          setParticipations([]);
          setLiveDecisions([]);
          setLivePassportSummary(EMPTY_PASSPORT_SUMMARY);
          setAvailableProjectsCount(0);
          setPendingSubmissionsCount(0);
          setLoadError("");
        }
        return;
      }
      void reloadLiveDashboard().catch((e) => {
        if (active) {
          setApplications([]);
          setParticipations([]);
          setLiveDecisions([]);
          setLivePassportSummary(EMPTY_PASSPORT_SUMMARY);
          setAvailableProjectsCount(0);
          setPendingSubmissionsCount(0);
          setLoadError(e instanceof Error ? e.message : "Student records unavailable.");
        }
      });
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [isSignedIn, preview, reloadLiveDashboard]);
  useVisibleRefresh(reloadLiveDashboard, !preview && isSignedIn);

  const activeData: StudentDashboardData = syntheticActiveStudentDashboard;
  const emptyData: StudentDashboardData = syntheticEmptyStudentDashboard;

  const currentData = preview && dashboardState === "active" ? activeData : emptyData;
  const displayedApplications = preview ? currentData.applications : applications;
  const displayedDecisions = preview ? currentData.recentDecisions : liveDecisions;
  const displayedPassportSummary = preview ? currentData.passportSummary : livePassportSummary;

  const displayedAvailableProjectsCount = preview
    ? 3
    : availableProjectsCount;
  const applicationsUnderReviewCount = displayedApplications.filter(
    (a) => a.status === "submitted" || a.status === "shortlisted"
  ).length;
  const offersReceivedCount = displayedApplications.filter(
    (a) =>
      a.status === "offered" ||
      a.status === "accepted" ||
      a.offerStatus === "offered" ||
      a.offerStatus === "accepted" ||
      a.offerStatus === "declined"
  ).length;
  const acceptedOffersCount = displayedApplications.filter(
    (a) => a.status === "accepted" || a.offerStatus === "accepted"
  ).length;
  const displayedPendingSubmissionsCount = preview
    ? dashboardState === "active"
      ? 1
      : 0
    : pendingSubmissionsCount;

  // Active project calculation
  const activeProject =
    !preview || dashboardState === "active"
      ? participations.find((p) => p.status === "active" || p.status === "under_review") ||
        (preview ? currentData.activeProjects[0] : undefined)
      : null;

  // Action items calculation
  const pendingOffers = displayedApplications.filter((a) => a.status === "offered");
  const hasPendingOffer = pendingOffers.length > 0;

  return (
    <div className="space-y-6">
      <StudentPortalHeader studentName={studentName} isSynthetic={preview} />

      {loadError && (
        <p role="alert" className="rounded-[var(--radius-card)] border border-danger/20 bg-danger-bg p-4 text-sm text-danger-text">
          We couldn&apos;t load everything. Check your connection and refresh the page.
        </p>
      )}

      {preview && (
        <div className="inline-flex rounded-lg border border-line bg-surface p-0.5 text-xs">
          {(["active", "empty"] as const).map((mode) => (
            <button key={mode} type="button" onClick={() => setDashboardState(mode)}
              className={`rounded-md px-3 py-1 font-semibold ${dashboardState === mode ? "bg-brand-600 text-white" : "text-ink-500"}`}>
              {mode === "active" ? "Preview: active" : "Preview: empty"}
            </button>
          ))}
        </div>
      )}

      <section aria-label="Your numbers" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Open projects" value={displayedAvailableProjectsCount} hint="Browse" href={`${basePath}/applications#opportunities`} />
        <StatCard label="Applications" value={displayedApplications.length} hint={applicationsUnderReviewCount ? `${applicationsUnderReviewCount} in review` : undefined} />
        <StatCard label="Offers" value={offersReceivedCount} hint={acceptedOffersCount ? `${acceptedOffersCount} accepted` : undefined} />
        <StatCard label="Passport entries" value={displayedPassportSummary.completedProjectsCount} hint="Open Passport" href={`${basePath}/passport`} />
      </section>

      {hasPendingOffer && (
        <NextStepHint tone="gold" waitingOn="You"
          detail={`You have an offer for ${pendingOffers[0].projectTitle}${pendingOffers[0].offerDeadline ? ` · reply by ${pendingOffers[0].offerDeadline}` : ""}`}
          action={<Button asChild size="sm"><Link href={`${basePath}/applications/${pendingOffers[0].id}`}>Review offer</Link></Button>} />
      )}

      <div className="grid gap-6 lg:grid-cols-3 [&>*]:min-w-0">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title="Needs your attention" description="What's waiting on you right now." />
            {preview ? (
              <p className="px-5 py-6 text-sm text-ink-500">Preview: live tasks appear here when you&apos;re signed in.</p>
            ) : (
              <ActionList items={actionItems ?? []} empty="You're all caught up. Find a new project to keep growing." />
            )}
          </Card>

          <Card>
            <CardHeader title="Your current project" action={activeProject ? <StatusBadge status="active" /> : undefined} />
            {activeProject ? (
              <div className="space-y-4 p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-[13px] text-ink-500">{activeProject.organizationName}</p>
                    <h3 className="text-lg font-semibold text-ink-900">{activeProject.projectTitle}</h3>
                    <p className="mt-0.5 text-[13px] text-ink-500">Mentor: <span className="font-medium text-ink-700">{activeProject.mentorName}</span></p>
                  </div>
                  <Button asChild size="sm"><Link href={`${basePath}/projects/${activeProject.participationId || "part-101"}`}>Open workspace</Link></Button>
                </div>
                <div className="rounded-xl border border-line bg-canvas p-3.5">
                  <div className="flex items-center justify-between text-[13px] font-medium">
                    <span className="text-ink-700">{activeProject.currentMilestone}</span>
                    <span className="text-brand-700">{activeProject.progressPercent}% done</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-line">
                    <div className="h-full rounded-full bg-brand-600 transition-all duration-500" style={{ width: `${activeProject.progressPercent}%` }} />
                  </div>
                  <p className="mt-2 text-xs text-ink-500">Next due: <span className="font-medium text-ink-700">{activeProject.nextMilestoneDue}</span>
                    {displayedPendingSubmissionsCount > 0 && <> · {displayedPendingSubmissionsCount} submission{displayedPendingSubmissionsCount === 1 ? "" : "s"} waiting for review</>}</p>
                </div>
              </div>
            ) : (
              <div className="p-5">
                <EmptyState icon={Briefcase} title="You don't have an active project yet"
                  description="Apply to an open project. When an organisation accepts you, your workspace opens here."
                  action={<Button asChild><Link href={`${basePath}/applications#opportunities`}>Find projects</Link></Button>} />
              </div>
            )}
          </Card>

          <Card>
            <CardHeader title="Recent feedback" description="Reviews from your mentor and decisions from organisations." />
            {displayedDecisions.length > 0 ? (
              <ul className="divide-y divide-line">
                {displayedDecisions.map((decision) => {
                  const isMentor = decision.authorType === "mentor";
                  return (
                    <li key={decision.id} className="space-y-2 px-5 py-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="flex flex-wrap items-center gap-2">
                          <Pill tone={isMentor ? "brand" : "info"}>{isMentor ? "Mentor review" : "Organisation decision"}</Pill>
                          {!isMentor && <span className="text-[13px] font-medium text-ink-900">{decision.actionText.replace(/^Organisation decision: /, "")}</span>}
                        </span>
                        <span className="text-xs text-ink-500">{decision.createdAt}</span>
                      </div>
                      <p className="text-[13px] text-ink-500">{decision.projectTitle}</p>
                      {decision.excerpt && <blockquote className="rounded-lg border-l-2 border-brand-600 bg-canvas px-3 py-2 text-sm text-ink-700">&ldquo;{decision.excerpt}&rdquo;</blockquote>}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="px-5 py-6 text-sm text-ink-500">No feedback yet. Once you submit work, your mentor&apos;s review appears here.</p>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Your applications" action={<Link href={`${basePath}/applications`} className="text-[13px] font-medium text-brand-600 hover:underline">View all</Link>} />
            {displayedApplications.length > 0 ? (
              <ul className="divide-y divide-line">
                {displayedApplications.slice(0, 5).map((app) => (
                  <li key={app.id}>
                    <Link href={`${basePath}/applications/${app.id}`} className="block space-y-1 px-5 py-3 hover:bg-canvas">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium text-ink-900">{app.projectTitle}</span>
                        <StatusBadge status={app.status} />
                      </span>
                      <span className="block text-xs text-ink-500">Applied {String(app.appliedAt ?? "").slice(0, 10)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-5 py-6 text-sm text-ink-500">
                No applications yet. <Link href={`${basePath}/applications#opportunities`} className="font-medium text-brand-600 hover:underline">Browse open projects</Link>
              </div>
            )}
          </Card>

          <Card className="overflow-hidden">
            <div className="bg-ink-900 p-5 text-white">
              <p className="flex items-center gap-2 text-[13px] font-medium text-gold-400"><BadgeCheck className="size-4" aria-hidden />Experience Passport</p>
              <p className="mt-2 text-lg font-semibold text-white">Proof of what you&apos;ve done</p>
              <p className="mt-1 text-[13px] text-white/70">Only work your mentor reviewed and the organisation accepted is added.</p>
            </div>
            <div className="grid grid-cols-3 divide-x divide-line text-center">
              {([
                [displayedPassportSummary.completedProjectsCount, "Projects"],
                [displayedPassportSummary.verifiedClaimsCount, "Skills shown"],
                [displayedPassportSummary.mentorObservationsCount, "Reviews"],
              ] as const).map(([value, label]) => (
                <div key={label} className="px-2 py-4">
                  <p className="text-xl font-semibold tabular-nums text-ink-900">{value}</p>
                  <p className="text-xs text-ink-500">{label}</p>
                </div>
              ))}
            </div>
            <div className="border-t border-line p-4">
              <Button asChild variant="secondary" className="w-full"><Link href={`${basePath}/passport`}>Open my Passport</Link></Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
