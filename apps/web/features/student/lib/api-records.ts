import type { ApplicationDetail, OfferDetail, ParticipationDetail, ProjectCreate, TermsCreate, TermsRead } from "@experiencebridge/api-client";
import type { StudentProfileDTO, StudentProfileUpsertInput } from "../../../lib/api/portal-api";
import { requireData, type PortalApi } from "../../../lib/api/use-portal-resource";
import type {
  AssessedSkill,
  MilestoneSubmission,
  ParticipationWorkspaceDetails,
  PassportProjectAssertion,
  SelfReportedSkill,
  StudentActionRequiredItem,
  StudentApplicationDetails,
  StudentDecisionAudit,
  StudentParticipationSummaryItem,
  StudentPassportDetails,
  StudentPassportTeaser,
  StudentProfile,
} from "./types";

export function termsSnapshot(terms: TermsRead) {
  return terms.snapshot as { title: string; description: string; scope: ProjectCreate; terms: TermsCreate };
}

export function computeDurationWeeks(startOn: string, dueOn: string): number {
  const diff = Date.parse(dueOn) - Date.parse(startOn);
  if (!Number.isFinite(diff) || diff <= 0) return 0;
  return Math.max(0, Math.ceil(diff / 604800000));
}

export function computeWeeklyHours(estimatedMinutes: number | undefined, startOn: string, dueOn: string): number {
  const weeks = Math.max(1, computeDurationWeeks(startOn, dueOn) || 1);
  if (typeof estimatedMinutes !== "number" || estimatedMinutes <= 0) return 1;
  return Math.max(1, Math.round(estimatedMinutes / 60 / weeks));
}

export function mapApplication(record: ApplicationDetail, offer?: OfferDetail | null): StudentApplicationDetails {
  const terms = offer?.terms ?? record.observed_terms;
  const snapshot = termsSnapshot(terms);
  return {
    id: record.id,
    projectId: record.project_id,
    projectTitle: snapshot.title,
    organizationName: "Organisation",
    // A project can't be published unless its organisation is verified.
    organizationVerified: true,
    status: record.latest_offer?.status === "accepted" ? "accepted" : record.status,
    offerStatus: record.latest_offer?.status,
    appliedAt: record.created_at,
    offerDeadline: record.latest_offer?.expires_at,
    motivationStatement: record.motivation,
    declaredSkills: record.declared_skills,
    externalLinks: record.links,
    participationId: record.participation_id ?? undefined,
    observedTermsSnapshot: {
      termsVersionId: terms.id,
      weeklyHours: Math.max(1, Math.round((record.weekly_minutes_available / 60) * 10) / 10),
      durationWeeks: computeDurationWeeks(snapshot.scope.start_on, snapshot.scope.due_on),
      ipConditions: snapshot.terms.ip_ownership_terms,
      confidentialitySummary: snapshot.terms.confidentiality_terms,
      snapshotDate: terms.created_at,
    },
    timeline: [
      {
        id: record.id,
        status: record.status,
        title: `Application: ${record.status}`,
        description: record.reason ?? "Recorded by the API.",
        timestamp: record.created_at,
      },
    ],
    rejectionReason: record.status === "rejected" ? record.reason ?? undefined : undefined,
    withdrawalReason: record.status === "withdrawn" ? record.reason ?? undefined : undefined,
    isSyntheticDemo: record.data_origin === "synthetic",
  };
}

export async function loadApplications(api: PortalApi) {
  const records = requireData(await api.getMyApplications());
  return Promise.all(records.map(async (r) => mapApplication(requireData(await api.getApplication(r.id)))));
}

export function mapParticipation(part: ParticipationDetail): StudentParticipationSummaryItem {
  const snapshot = termsSnapshot(part.agreed_terms);
  const weeklyHours = computeWeeklyHours(
    snapshot.scope.estimated_minutes,
    snapshot.scope.start_on,
    snapshot.scope.due_on
  );
  return {
    participationId: part.id,
    projectId: part.project_id,
    projectTitle: snapshot.title,
    organizationName: "Organisation",
    // A project can't be published unless its organisation is verified.
    organizationVerified: true,
    mentorName: "Not assigned yet",
    mentorStatus: "pending",
    status: part.status,
    currentMilestone: "See workspace",
    nextMilestoneDue: snapshot.scope.due_on,
    progressPercent: part.status === "completed" ? 100 : 0,
    completedMilestonesCount: 0,
    totalMilestonesCount: snapshot.scope.milestones.length,
    weeklyHours,
    compensationSummary: `${snapshot.terms.currency} ${snapshot.terms.fee_amount} — ${snapshot.terms.payment_terms}`,
  };
}

export async function loadParticipations(api: PortalApi) {
  const records = requireData(await api.getMyParticipations());
  return Promise.all(
    records.map(async (r) => {
      const part = requireData(await api.getParticipation(r.id));
      const workspace = await loadWorkspace(api, r.id, part);
      const current = workspace.milestones.find((m) => m.status !== "completed");
      return {
        ...mapParticipation(part),
        mentorName: workspace.mentor.name,
        mentorStatus: workspace.mentor.status,
        progressPercent: workspace.progressPercent,
        completedMilestonesCount: workspace.milestones.filter((m) => m.status === "completed").length,
        currentMilestone: current?.title ?? "All milestones reviewed",
        nextMilestoneDue: current?.deadline ?? workspace.targetCompletionDate,
        weeklyHours: workspace.agreedTerms.weeklyHours || mapParticipation(part).weeklyHours,
      };
    })
  );
}

export function emptyWorkspace(id: string): ParticipationWorkspaceDetails {
  return {
    participationId: id,
    projectId: "",
    projectTitle: "Loading workspace",
    organizationName: "",
    organizationContact: "",
    organizationVerificationStatus: "Not supplied",
    mentor: { name: "Not supplied", title: "", status: "pending" },
    status: "active",
    startedAt: "",
    targetCompletionDate: "",
    progressPercent: 0,
    currentMilestoneId: "",
    milestones: [],
    submissions: [],
    agreedTerms: {
      termsVersionId: "",
      termsHash: "",
      weeklyHours: 0,
      durationWeeks: 0,
      ipConditions: "",
      confidentialitySummary: "",
      acceptedAt: "",
    },
    isSyntheticDemo: true,
  };
}

export async function loadWorkspace(
  api: PortalApi,
  id: string,
  suppliedPart?: ParticipationDetail
): Promise<ParticipationWorkspaceDetails> {
  const part = suppliedPart ?? requireData(await api.getParticipation(id));
  const snapshot = termsSnapshot(part.agreed_terms);
  const assignments = requireData(await api.getParticipationAssignments(id));
  const assignment =
    assignments.find((a) => a.status === "accepted") ??
    assignments.find((a) => a.status === "proposed");
  const submissions = requireData(await api.getSubmissions(id));
  const evidence = await Promise.all(
    submissions.map(async (sub) => {
      const mentors = requireData(await api.getMentorReviews(sub.id));
      const organizations = requireData(await api.getOrganizationReviews(sub.id));
      return { sub, mentor: mentors[0], organization: organizations[0] };
    })
  );
  const milestones = snapshot.scope.milestones.map((m, index) => {
    const latest = evidence
      .filter((e) => e.sub.milestone_index === index)
      .sort((a, b) => b.sub.revision_no - a.sub.revision_no)[0];
    const complete =
      latest?.sub.status === "submitted" &&
      latest?.mentor?.decision === "reviewed" &&
      latest?.organization?.decision === "accepted";
    return {
      id: String(index),
      order: index + 1,
      title: m.title,
      description: snapshot.scope.scope_in,
      deadline: m.due_on,
      status: complete ? ("completed" as const) : ("in_progress" as const),
      deliverables: [snapshot.scope.scope_in],
      acceptanceCriteria: m.acceptance_criteria,
      submissionId: latest?.sub.id,
    };
  });
  const mapped: MilestoneSubmission[] = evidence.map(({ sub, mentor, organization }) => ({
    id: sub.id,
    milestoneId: String(sub.milestone_index),
    milestoneTitle: milestones[sub.milestone_index]?.title ?? "Milestone",
    revisionNumber: sub.revision_no,
    summary: sub.summary,
    contributionStatement: sub.contribution_statement,
    links: (sub.artifacts ?? []).filter((a) => a.url).map((a) => ({ label: a.label, url: a.url! })),
    status: sub.status,
    submittedAt: sub.submitted_at ?? undefined,
    mentorReview: mentor
      ? {
          id: mentor.id,
          reviewerType: "mentor",
          reviewerName: mentor.author_user_id,
          status: mentor.decision,
          feedback: mentor.participant_feedback ?? "Private feedback not disclosed",
          reviewedAt: mentor.created_at,
        }
      : undefined,
    organizationDecision: organization
      ? {
          id: organization.id,
          reviewerType: "organization",
          reviewerName: organization.reviewer_user_id,
          status: organization.decision,
          feedback: organization.explanation,
          reviewedAt: organization.created_at,
        }
      : undefined,
  }));
  const weeklyHours = computeWeeklyHours(
    snapshot.scope.estimated_minutes,
    snapshot.scope.start_on,
    snapshot.scope.due_on
  );
  return {
    ...emptyWorkspace(id),
    rowVersion: part.row_version,
    canSubmit: part.status === "active" && Boolean(part.started_at),
    mentor: assignment
      ? {
          name: "Your mentor",
          title: "Assigned mentor",
          status: assignment.status === "accepted" ? "accepted" : "proposed",
        }
      : { name: "No current mentor assignment", title: "", status: "pending" },
    projectId: part.project_id,
    projectTitle: snapshot.title,
    organizationName: "Organisation",
    organizationContact: "Authorized Project Sponsor",
    organizationVerificationStatus: "Verified",
    status: part.status,
    startedAt: part.started_at ?? "Not started",
    targetCompletionDate: snapshot.scope.due_on,
    milestones,
    submissions: mapped,
    currentMilestoneId:
      milestones.find((m) => m.status !== "completed")?.id ?? milestones[0]?.id ?? "",
    progressPercent: milestones.length
      ? Math.round(
          (milestones.filter((m) => m.status === "completed").length / milestones.length) * 100
        )
      : 0,
    agreedTerms: {
      termsVersionId: part.agreed_terms.id,
      termsHash: part.terms_acceptance.terms_hash,
      compensationSummary: `${snapshot.terms.currency} ${snapshot.terms.fee_amount} — ${snapshot.terms.payment_terms}`,
      weeklyHours,
      durationWeeks: computeDurationWeeks(snapshot.scope.start_on, snapshot.scope.due_on),
      ipConditions: snapshot.terms.ip_ownership_terms,
      confidentialitySummary: snapshot.terms.confidentiality_terms,
      acceptedAt: part.terms_acceptance.accepted_at,
    },
    isSyntheticDemo: part.data_origin === "synthetic",
  };
}

/** Resume a partially saved draft; success requires a server read of submitted evidence. */
export async function saveEvidence(
  api: PortalApi,
  participationId: string,
  milestoneIndex: number,
  summary: string,
  contribution: string,
  links: { label: string; url: string }[],
  resumeId?: string,
  remember: (id: string) => void = () => {}
) {
  const existing = resumeId
    ? requireData(await api.getSubmission(resumeId))
    : requireData(await api.getSubmissions(participationId)).find(
        (s) => s.milestone_index === milestoneIndex && s.status === "draft"
      );
  if (
    existing &&
    (existing.participation_id !== participationId || existing.milestone_index !== milestoneIndex)
  )
    throw new Error("Submission does not belong to this workspace milestone.");
  if (existing?.status === "submitted") return existing;
  const part = requireData(await api.getParticipation(participationId));
  let draft = existing
    ? requireData(
        await api.updateSubmission(
          existing.id,
          { summary, contribution_statement: contribution },
          existing.row_version
        )
      )
    : requireData(
        await api.createSubmission(participationId, part.row_version, milestoneIndex, summary, contribution)
      );
  remember(draft.id);
  for (const artifact of draft.artifacts ?? []) {
    if (
      artifact.kind === "external_url" &&
      !links.some((link) => link.url === artifact.url && link.label === artifact.label)
    ) {
      requireData(await api.deleteArtifact(draft.id, artifact.id));
    }
  }
  draft = requireData(await api.getSubmission(draft.id));
  for (const link of links) {
    if (!(draft.artifacts ?? []).some((a) => a.url === link.url))
      requireData(await api.attachArtifact(draft.id, link.label, link.url));
  }
  draft = requireData(await api.getSubmission(draft.id));
  requireData(await api.submitDeliverable(draft.id, draft.row_version));
  const recorded = requireData(await api.getSubmission(draft.id));
  if (recorded.status !== "submitted") throw new Error("The server did not confirm submission.");
  return recorded;
}

export async function loadOpportunities(api: PortalApi) {
  const me = requireData(await api.getMe());
  const projects = requireData(await api.getPublishedProjects());
  const opportunities = await Promise.all(
    projects.map(async (project) => {
      if (!project.published_terms_version_id)
        throw new Error("Published project is missing its terms reference.");
      const terms = requireData(
        await api.getTermsVersion(project.id, project.published_terms_version_id)
      );
      const snapshot = termsSnapshot(terms);
      const durationWeeks = computeDurationWeeks(snapshot.scope.start_on, snapshot.scope.due_on);
      const weeklyHours = computeWeeklyHours(
        snapshot.scope.estimated_minutes,
        snapshot.scope.start_on,
        snapshot.scope.due_on
      );
      return {
        project,
        terms,
        title: project.title,
        org: "Organisation",
        termsVersion: terms.id,
        weeklyHours,
        durationWeeks,
        ipTerms: snapshot.terms.ip_ownership_terms,
        confidentiality: snapshot.terms.confidentiality_terms,
        description: project.description || snapshot.description || "",
        startOn: snapshot.scope.start_on,
        dueOn: snapshot.scope.due_on,
        feeAmount: snapshot.terms?.fee_amount ?? "0.00",
        currency: snapshot.terms?.currency ?? "GHS",
        paymentTerms: snapshot.terms?.payment_terms ?? "",
        milestonesCount: Array.isArray(snapshot.scope.milestones)
          ? snapshot.scope.milestones.length
          : 0,
      };
    })
  );
  return { me, opportunities: Object.fromEntries(opportunities.map((o) => [o.project.id, o])) };
}

export function buildStudentActionItems(
  applications: StudentApplicationDetails[],
  participations: StudentParticipationSummaryItem[]
): StudentActionRequiredItem[] {
  const items: StudentActionRequiredItem[] = [];

  for (const app of applications) {
    if (app.status === "offered" && app.offerStatus !== "accepted" && app.offerStatus !== "declined") {
      items.push({
        id: `action-offer-${app.id}`,
        type: "offer_pending",
        title: `Project Offer Received: ${app.projectTitle}`,
        organizationName: app.organizationName,
        deadline: app.offerDeadline ? app.offerDeadline.slice(0, 10) : "Pending response",
        ctaLabel: "Review & Accept Offer",
        ctaHref: `/student/applications/${app.id}`,
        priority: "urgent",
      });
    }
  }

  for (const part of participations) {
    if (part.status === "active") {
      items.push({
        id: `action-part-${part.participationId}`,
        type: "submission_due",
        title: `Milestone In Progress: ${part.currentMilestone}`,
        organizationName: part.projectTitle,
        deadline: part.nextMilestoneDue,
        ctaLabel: "Open Workspace",
        ctaHref: `/student/projects/${part.participationId}`,
        priority: "normal",
      });
    }
  }

  return items;
}

export function computeProfileCompletion(profile: Pick<
  StudentProfile,
  | "displayName"
  | "headline"
  | "bio"
  | "institution"
  | "programOfStudy"
  | "preferredDomains"
  | "selfReportedSkills"
  | "topProjects"
  | "githubUrl"
  | "portfolioUrl"
>): number {
  let score = 0;
  if (profile.displayName?.trim()) score += 15;
  if (profile.headline?.trim()) score += 15;
  if (profile.bio?.trim()) score += 15;
  if (profile.institution?.trim() && profile.programOfStudy?.trim()) score += 15;
  if (profile.preferredDomains && profile.preferredDomains.length > 0) score += 10;
  if (profile.selfReportedSkills && profile.selfReportedSkills.length > 0) score += 15;
  if ((profile.topProjects && profile.topProjects.length > 0) || profile.githubUrl || profile.portfolioUrl) score += 15;
  return Math.min(100, score);
}

export function mapStudentProfileDto(dto: StudentProfileDTO): StudentProfile {
  const mapped: StudentProfile = {
    id: dto.user_id,
    userId: dto.user_id,
    displayName: dto.display_name,
    email: dto.email ?? "Not provided",
    headline: dto.headline ?? "",
    bio: dto.bio ?? "",
    institution: dto.institution ?? "",
    programOfStudy: dto.program_of_study ?? "",
    graduationYear: String(dto.graduation_year ?? 2026),
    weeklyHoursAvailable: dto.weekly_hours_available ?? 10,
    preferredDomains: dto.preferred_domains ?? [],
    portfolioUrl: dto.portfolio_url ?? "",
    githubUrl: dto.github_url ?? "",
    linkedinUrl: dto.linkedin_url ?? "",
    verificationBadge: {
      isVerified: true,
      provider: "ExperienceBridge authenticated identity",
      verifiedAt: dto.updated_at?.slice(0, 10) || "Active",
    },
    assessedSkills: [],
    selfReportedSkills: (dto.self_reported_skills ?? []).map((s: { id: string; name: string; category: string; proficiency: "beginner" | "intermediate" | "advanced"; notes?: string | null }) => ({
      id: s.id,
      name: s.name,
      proficiencyLevel: s.proficiency,
      yearsOfExperience: s.category || "1-2 years",
      contextOrProject: s.notes ?? undefined,
    })),
    topProjects: (dto.top_projects ?? []).map((p: { id: string; title: string; summary: string; role: string; link_url?: string | null }) => ({
      id: p.id,
      title: p.title,
      summary: p.summary,
      role: p.role,
      timeframe: "2026",
      technologies: ["Verified Profile Entry"],
      projectUrl: p.link_url ?? undefined,
      githubUrl: p.link_url ?? undefined,
    })),
    profileCompletionPercentage: 0,
    isSyntheticDemo: false,
  };
  mapped.profileCompletionPercentage = computeProfileCompletion(mapped);
  return mapped;
}

export async function loadStudentProfile(api: PortalApi): Promise<StudentProfile> {
  if (typeof api.getStudentProfile === "function") {
    const dto = requireData(await api.getStudentProfile());
    return mapStudentProfileDto(dto);
  }
  const me = requireData(await api.getMe());
  return mapStudentProfileDto({
    user_id: me.id,
    identity_issuer: me.identity_issuer,
    identity_subject: me.identity_subject,
    display_name: me.display_name,
    email: me.email ?? null,
    headline: "",
    bio: "",
    institution: "",
    program_of_study: "",
    graduation_year: 2026,
    weekly_hours_available: 10,
    preferred_domains: [],
    portfolio_url: null,
    github_url: null,
    linkedin_url: null,
    self_reported_skills: [],
    top_projects: [],
    updated_at: me.updated_at,
    row_version: me.row_version,
  });
}

export async function saveStudentProfile(
  api: PortalApi,
  profile: StudentProfile
): Promise<StudentProfile> {
  const payload: StudentProfileUpsertInput = {
    display_name: profile.displayName.trim(),
    headline: profile.headline.trim(),
    bio: profile.bio.trim(),
    institution: profile.institution.trim(),
    program_of_study: profile.programOfStudy.trim(),
    graduation_year: Number(profile.graduationYear) || 2026,
    weekly_hours_available: Number(profile.weeklyHoursAvailable) || 10,
    preferred_domains: profile.preferredDomains,
    portfolio_url: profile.portfolioUrl?.trim() || null,
    github_url: profile.githubUrl?.trim() || null,
    linkedin_url: profile.linkedinUrl?.trim() || null,
    self_reported_skills: (profile.selfReportedSkills ?? []).map((s) => ({
      id: s.id,
      name: s.name.trim(),
      category: s.yearsOfExperience?.trim() || "General",
      proficiency: s.proficiencyLevel,
      notes: s.contextOrProject?.trim() || null,
    })),
    top_projects: (profile.topProjects ?? []).map((p) => ({
      id: p.id,
      title: p.title.trim(),
      summary: p.summary.trim(),
      role: p.role.trim() || "Contributor",
      link_url: p.githubUrl?.trim() || p.projectUrl?.trim() || null,
    })),
  };
  const dto = requireData(await api.upsertStudentProfile(payload));
  return mapStudentProfileDto(dto);
}

export async function loadStudentPassportAndDecisions(api: PortalApi): Promise<{
  passport: StudentPassportDetails;
  recentDecisions: StudentDecisionAudit[];
  passportSummary: StudentPassportTeaser;
  pendingSubmissionsCount: number;
}> {
  const me = requireData(await api.getMe());
  const [applications, partSummaries, profileResult] = await Promise.all([
    requireData(await api.getMyApplications()),
    requireData(await api.getMyParticipations()),
    typeof api.getStudentProfile === "function"
      ? api.getStudentProfile().catch(() => ({ data: null, error: null, status: 0 }))
      : Promise.resolve({ data: null, error: null, status: 0 }),
  ]);

  const assessedSkills: AssessedSkill[] = [];
  const projectAssertions: PassportProjectAssertion[] = [];
  const recentDecisions: StudentDecisionAudit[] = [];
  let mentorObservationsCount = 0;
  let pendingSubmissionsCount = 0;

  for (const partItem of partSummaries) {
    const part = requireData(await api.getParticipation(partItem.id));
    const snapshot = termsSnapshot(part.agreed_terms);
    const submissions = requireData(await api.getSubmissions(part.id));
    const sortedSubs = [...submissions].sort((a, b) => b.revision_no - a.revision_no);
    const latestSubmitted = sortedSubs.find((s) => s.status !== "draft") ?? sortedSubs[0];

    let latestMentorReview: PassportProjectAssertion["mentorReview"] = null;
    let latestOrgDecision: PassportProjectAssertion["organizationDecision"] = null;
    let hasMentorReviewed = false;
    let hasDeliverableAccepted = false;

    for (const sub of sortedSubs) {
      const [mentorReviews, orgReviews] = await Promise.all([
        requireData(await api.getMentorReviews(sub.id)),
        requireData(await api.getOrganizationReviews(sub.id)),
      ]);
      if (
        sub.status === "draft" ||
        sub.status === "revision_requested" ||
        (sub.status === "submitted" && (mentorReviews.length === 0 || orgReviews.length === 0))
      ) {
        pendingSubmissionsCount += 1;
      }
      for (const mr of mentorReviews) {
        const obs = mr.observations ?? [];
        mentorObservationsCount += obs.length;
        if (mr.decision === "reviewed") {
          hasMentorReviewed = true;
          for (const item of obs) {
            const legacy = item as typeof item & { criterion?: string; rating?: string };
            const criterionName = item.criterion_text || legacy.criterion || "Competency";
            const level: AssessedSkill["level"] =
              item.score != null
                ? item.score >= 4
                  ? "advanced"
                  : item.score >= 3
                    ? "proficient"
                    : "demonstrated"
                : legacy.rating === "strong"
                  ? "advanced"
                  : legacy.rating === "demonstrated"
                    ? "proficient"
                    : "demonstrated";
            assessedSkills.push({
              id: `${mr.id}-${criterionName}`,
              name: criterionName,
              level,
              assessedByMentor: "Your mentor",
              projectOrigin: snapshot.title,
              assessedAt: mr.created_at.slice(0, 10),
            });
          }
        }
        const mentorFeedback = mr.participant_feedback ?? mr.manager_summary ?? "";
        recentDecisions.push({
          id: mr.id,
          authorType: "mentor",
          authorName: "Your mentor",
          projectTitle: snapshot.title,
          actionText:
            mr.decision === "reviewed"
              ? "Mentor review"
              : `Mentor review: ${mr.decision}`,
          excerpt: mentorFeedback,
          createdAt: mr.created_at.slice(0, 10),
        });
        if (!latestMentorReview) {
          latestMentorReview = {
            reviewerName: "Your mentor",
            reviewerTitle: "Mentor",
            reviewedAt: mr.created_at.slice(0, 10),
            feedbackExcerpt: mentorFeedback,
            rubricCriteriaObserved: obs.map((o) => {
              const legacy = o as typeof o & { criterion?: string; rating?: string };
              const cName = o.criterion_text || legacy.criterion || "Competency";
              const cScore = o.score != null ? `${o.score}/5` : legacy.rating ?? "observed";
              return `${cName} (${cScore})`;
            }),
          };
        }
      }
      for (const or of orgReviews) {
        if (or.decision === "accepted") {
          hasDeliverableAccepted = true;
        }
        recentDecisions.push({
          id: or.id,
          authorType: "organization",
          authorName: "The organisation",
          projectTitle: snapshot.title,
          actionText:
            or.decision === "accepted"
              ? "Deliverable accepted"
              : `Organisation decision: ${or.decision.replaceAll("_", " ")}`,
          excerpt: or.explanation,
          createdAt: or.created_at.slice(0, 10),
        });
        if (!latestOrgDecision) {
          latestOrgDecision = {
            reviewerName: "The organisation",
            decision: or.decision === "accepted" ? "accepted" : "revision_requested",
            decidedAt: or.created_at.slice(0, 10),
            formalStatement: or.explanation,
          };
        }
      }
    }

    if (part.status === "active" && sortedSubs.length === 0) {
      pendingSubmissionsCount += snapshot.scope.milestones.length || 1;
    }

    const evidenceLinks = sortedSubs
      .flatMap((s) => s.artifacts ?? [])
      .filter((a) => Boolean(a.url))
      .map((a) => ({ label: a.label, url: a.url! }));

    projectAssertions.push({
      id: part.id,
      projectId: part.project_id,
      participationId: part.id,
      projectTitle: snapshot.title,
      organizationName: "Organisation",
      // A project can't be published unless its organisation is verified.
      organizationVerified: true,
      timeframe: `${snapshot.scope.start_on} – ${snapshot.scope.due_on}`,
      contributionStatement:
        latestSubmitted?.contribution_statement ?? "No deliverable submission recorded yet.",
      deliverables: snapshot.scope.milestones.map((m) => m.title),
      evidenceLinks,
      evidenceTiers: {
        identityChecked: me.account_status === "active",
        workSubmitted: sortedSubs.some((s) => s.status !== "draft"),
        mentorReviewed: hasMentorReviewed,
        deliverableAccepted: hasDeliverableAccepted,
      },
      mentorReview: latestMentorReview,
      organizationDecision: latestOrgDecision,
      disputeState: "none",
      assertionHash: part.terms_acceptance.terms_hash,
    });
  }

  const seenSkills = new Set<string>();
  const selfReportedSkills: SelfReportedSkill[] = [];

  if (profileResult.data?.self_reported_skills) {
    for (const skill of profileResult.data.self_reported_skills) {
      const normalized = skill.name.trim();
      if (normalized && !seenSkills.has(normalized.toLowerCase())) {
        seenSkills.add(normalized.toLowerCase());
        selfReportedSkills.push({
          id: skill.id || `profile-skill-${normalized}`,
          name: normalized,
          proficiencyLevel: skill.proficiency,
          yearsOfExperience: skill.category || "Profile skill",
          contextOrProject: skill.notes || "Self-reported in student profile",
        });
      }
    }
  }

  for (const app of applications) {
    for (const skill of app.declared_skills ?? []) {
      const normalized = skill.trim();
      if (normalized && !seenSkills.has(normalized.toLowerCase())) {
        seenSkills.add(normalized.toLowerCase());
        selfReportedSkills.push({
          id: `app-skill-${app.id}-${normalized}`,
          name: normalized,
          proficiencyLevel: "intermediate",
          yearsOfExperience: "Declared on application",
          contextOrProject: "Self-reported in project application",
        });
      }
    }
  }

  const nowIso = new Date().toISOString().slice(0, 10);
  const passport: StudentPassportDetails = {
    student: {
      id: me.id,
      displayName: profileResult.data?.display_name ?? me.display_name ?? "Student",
      email: me.email ?? "",
      isSyntheticDemo: false,
    },
    overallAssertionHash:
      projectAssertions[0]?.assertionHash ?? "No cryptographic assertion issued yet",
    issuedAt: partSummaries[0]?.created_at?.slice(0, 10) ?? nowIso,
    lastUpdated: nowIso,
    assessedSkills,
    selfReportedSkills,
    projectAssertions,
    isSyntheticDemo: false,
  };

  const passportSummary: StudentPassportTeaser = {
    verifiedClaimsCount: assessedSkills.length,
    completedProjectsCount: partSummaries.filter((p) => p.status === "completed").length,
    mentorObservationsCount,
  };

  return { passport, recentDecisions, passportSummary, pendingSubmissionsCount };
}
