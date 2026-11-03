import type { ApplicationDetail, OfferDetail, ParticipationDetail, ProjectCreate, TermsCreate, TermsRead } from "@experiencebridge/api-client";
import { requireData, type PortalApi } from "../../../lib/api/use-portal-resource";
import type {
  AssessedSkill,
  MilestoneSubmission,
  ParticipationWorkspaceDetails,
  PassportProjectAssertion,
  SelfReportedSkill,
  StudentApplicationDetails,
  StudentDecisionAudit,
  StudentParticipationSummaryItem,
  StudentPassportDetails,
  StudentPassportTeaser,
} from "./types";

export function termsSnapshot(terms: TermsRead) {
  return terms.snapshot as { title: string; description: string; scope: ProjectCreate; terms: TermsCreate };
}

export function mapApplication(record: ApplicationDetail, offer?: OfferDetail | null): StudentApplicationDetails {
  const terms = offer?.terms ?? record.observed_terms;
  const snapshot = termsSnapshot(terms);
  return {
    id: record.id, projectId: record.project_id, projectTitle: snapshot.title,
    organizationName: "Organization details not supplied", organizationVerified: false,
    status: record.latest_offer?.status === "accepted" ? "accepted" : record.status,
    offerStatus: record.latest_offer?.status,
    appliedAt: record.created_at, offerDeadline: record.latest_offer?.expires_at,
    motivationStatement: record.motivation, declaredSkills: record.declared_skills,
    externalLinks: record.links, participationId: record.participation_id ?? undefined,
    observedTermsSnapshot: { termsVersionId: terms.id, weeklyHours: record.weekly_minutes_available / 60,
      durationWeeks: Math.max(0, Math.ceil((Date.parse(snapshot.scope.due_on) - Date.parse(snapshot.scope.start_on)) / 604800000)),
      ipConditions: snapshot.terms.ip_ownership_terms, confidentialitySummary: snapshot.terms.confidentiality_terms,
      snapshotDate: terms.created_at },
    timeline: [{ id: record.id, status: record.status, title: `Application: ${record.status}`, description: record.reason ?? "Recorded by the API.", timestamp: record.created_at }],
    rejectionReason: record.status === "rejected" ? record.reason ?? undefined : undefined,
    withdrawalReason: record.status === "withdrawn" ? record.reason ?? undefined : undefined,
    isSyntheticDemo: record.data_origin === "synthetic",
  };
}

export async function loadApplications(api: PortalApi) {
  const records = requireData(await api.getMyApplications());
  return Promise.all(records.map(async r => mapApplication(requireData(await api.getApplication(r.id)))));
}

export function mapParticipation(part: ParticipationDetail): StudentParticipationSummaryItem {
  const snapshot = termsSnapshot(part.agreed_terms);
  return { participationId: part.id, projectId: part.project_id, projectTitle: snapshot.title,
    organizationName: "Organization details not supplied", organizationVerified: false,
    mentorName: "See assignment details", mentorStatus: "pending", status: part.status,
    currentMilestone: "See workspace", nextMilestoneDue: snapshot.scope.due_on,
    progressPercent: part.status === "completed" ? 100 : 0, completedMilestonesCount: 0,
    totalMilestonesCount: snapshot.scope.milestones.length, weeklyHours: 0,
    compensationSummary: `${snapshot.terms.currency} ${snapshot.terms.fee_amount} — ${snapshot.terms.payment_terms}` };
}

export async function loadParticipations(api: PortalApi) {
  const records = requireData(await api.getMyParticipations());
  return Promise.all(records.map(async r => {
    const part = requireData(await api.getParticipation(r.id));
    const workspace = await loadWorkspace(api, r.id, part);
    const current = workspace.milestones.find(m => m.status !== "completed");
    return { ...mapParticipation(part), mentorName: workspace.mentor.name, mentorStatus: workspace.mentor.status, progressPercent: workspace.progressPercent,
      completedMilestonesCount: workspace.milestones.filter(m => m.status === "completed").length,
      currentMilestone: current?.title ?? "All milestones reviewed", nextMilestoneDue: current?.deadline ?? workspace.targetCompletionDate };
  }));
}

export function emptyWorkspace(id: string): ParticipationWorkspaceDetails {
  return { participationId: id, projectId: "", projectTitle: "Loading workspace", organizationName: "", organizationContact: "",
    organizationVerificationStatus: "Not supplied", mentor: { name: "Not supplied", title: "", status: "pending" },
    status: "active", startedAt: "", targetCompletionDate: "", progressPercent: 0, currentMilestoneId: "",
    milestones: [], submissions: [], agreedTerms: { termsVersionId: "", termsHash: "", weeklyHours: 0, durationWeeks: 0,
      ipConditions: "", confidentialitySummary: "", acceptedAt: "" }, isSyntheticDemo: true };
}

export async function loadWorkspace(api: PortalApi, id: string, suppliedPart?: ParticipationDetail): Promise<ParticipationWorkspaceDetails> {
  const part = suppliedPart ?? requireData(await api.getParticipation(id));
  const snapshot = termsSnapshot(part.agreed_terms);
  const assignments = requireData(await api.getParticipationAssignments(id));
  const assignment = assignments.find(a => a.status === "accepted") ?? assignments.find(a => a.status === "proposed");
  const submissions = requireData(await api.getSubmissions(id));
  const evidence = await Promise.all(submissions.map(async sub => {
    const mentors = requireData(await api.getMentorReviews(sub.id));
    const organizations = requireData(await api.getOrganizationReviews(sub.id));
    return { sub, mentor: mentors[0], organization: organizations[0] };
  }));
  const milestones = snapshot.scope.milestones.map((m, index) => {
    const latest = evidence.filter(e => e.sub.milestone_index === index).sort((a,b) => b.sub.revision_no-a.sub.revision_no)[0];
    const complete = latest?.sub.status === "submitted" && latest?.mentor?.decision === "reviewed" && latest?.organization?.decision === "accepted";
    return { id: String(index), order: index + 1, title: m.title, description: snapshot.scope.scope_in,
      deadline: m.due_on, status: complete ? "completed" as const : "in_progress" as const,
      deliverables: [snapshot.scope.scope_in], acceptanceCriteria: m.acceptance_criteria, submissionId: latest?.sub.id };
  });
  const mapped: MilestoneSubmission[] = evidence.map(({ sub, mentor, organization }) => ({
    id: sub.id, milestoneId: String(sub.milestone_index), milestoneTitle: milestones[sub.milestone_index]?.title ?? "Milestone",
    revisionNumber: sub.revision_no, summary: sub.summary, contributionStatement: sub.contribution_statement,
    links: (sub.artifacts ?? []).filter(a => a.url).map(a => ({ label: a.label, url: a.url! })),
    status: sub.status, submittedAt: sub.submitted_at ?? undefined,
    mentorReview: mentor ? { id: mentor.id, reviewerType: "mentor", reviewerName: mentor.author_user_id,
      status: mentor.decision, feedback: mentor.participant_feedback ?? "Private feedback not disclosed", reviewedAt: mentor.created_at } : undefined,
    organizationDecision: organization ? { id: organization.id, reviewerType: "organization", reviewerName: organization.reviewer_user_id,
      status: organization.decision, feedback: organization.explanation, reviewedAt: organization.created_at } : undefined,
  }));
  return { ...emptyWorkspace(id), rowVersion: part.row_version, canSubmit: part.status === "active" && Boolean(part.started_at),
    mentor: assignment ? {name: `Mentor ${assignment.mentor_user_id.slice(0,8)}`,title: "Assigned mentor",status: assignment.status === "accepted" ? "accepted" : "proposed"} : {name:"No current mentor assignment",title:"",status:"pending"}, projectId: part.project_id, projectTitle: snapshot.title,
    organizationName: "Organization details not supplied", organizationContact: "Not supplied",
    status: part.status, startedAt: part.started_at ?? "Not started", targetCompletionDate: snapshot.scope.due_on,
    milestones, submissions: mapped, currentMilestoneId: milestones.find(m => m.status !== "completed")?.id ?? milestones[0]?.id ?? "",
    progressPercent: milestones.length ? Math.round(milestones.filter(m => m.status === "completed").length / milestones.length * 100) : 0,
    agreedTerms: { termsVersionId: part.agreed_terms.id, termsHash: part.terms_acceptance.terms_hash,
      compensationSummary: `${snapshot.terms.currency} ${snapshot.terms.fee_amount} — ${snapshot.terms.payment_terms}`,
      weeklyHours: 0, durationWeeks: Math.max(0,Math.ceil((Date.parse(snapshot.scope.due_on)-Date.parse(snapshot.scope.start_on))/604800000)),
      ipConditions: snapshot.terms.ip_ownership_terms, confidentialitySummary: snapshot.terms.confidentiality_terms,
      acceptedAt: part.terms_acceptance.accepted_at } };
}

/** Resume a partially saved draft; success requires a server read of submitted evidence. */
export async function saveEvidence(api: PortalApi, participationId: string, milestoneIndex: number,
  summary: string, contribution: string, links: { label: string; url: string }[],
  resumeId?: string, remember: (id: string) => void = () => {}) {
  const existing = resumeId ? requireData(await api.getSubmission(resumeId))
    : requireData(await api.getSubmissions(participationId)).find(s => s.milestone_index === milestoneIndex && s.status === "draft");
  if (existing && (existing.participation_id !== participationId || existing.milestone_index !== milestoneIndex)) throw new Error("Submission does not belong to this workspace milestone.");
  if (existing?.status === "submitted") return existing;
  const part = requireData(await api.getParticipation(participationId));
  let draft = existing
    ? requireData(await api.updateSubmission(existing.id, { summary, contribution_statement: contribution }, existing.row_version))
    : requireData(await api.createSubmission(participationId, part.row_version, milestoneIndex, summary, contribution));
  remember(draft.id);
  for (const artifact of draft.artifacts ?? []) {
    if (artifact.kind === "external_url" && !links.some(link => link.url === artifact.url && link.label === artifact.label)) {
      requireData(await api.deleteArtifact(draft.id, artifact.id));
    }
  }
  draft = requireData(await api.getSubmission(draft.id));
  for (const link of links) {
    if (!(draft.artifacts ?? []).some(a => a.url === link.url)) requireData(await api.attachArtifact(draft.id, link.label, link.url));
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
  const opportunities = await Promise.all(projects.map(async project => {
    if (!project.published_terms_version_id) throw new Error("Published project is missing its terms reference.");
    const terms = requireData(await api.getTermsVersion(project.id, project.published_terms_version_id));
    const snapshot = termsSnapshot(terms);
    return { project, terms, title: project.title, org: `Organization ${project.organization_id.slice(0,8)}`,
      termsVersion: terms.id, weeklyHours: 1,
      durationWeeks: Math.max(0,Math.ceil((Date.parse(snapshot.scope.due_on)-Date.parse(snapshot.scope.start_on))/604800000)),
      ipTerms: snapshot.terms.ip_ownership_terms, confidentiality: snapshot.terms.confidentiality_terms };
  }));
  return { me, opportunities: Object.fromEntries(opportunities.map(o => [o.project.id,o])) };
}

export async function loadStudentPassportAndDecisions(api: PortalApi): Promise<{
  passport: StudentPassportDetails;
  recentDecisions: StudentDecisionAudit[];
  passportSummary: StudentPassportTeaser;
}> {
  const me = requireData(await api.getMe());
  const [applications, partSummaries] = await Promise.all([
    requireData(await api.getMyApplications()),
    requireData(await api.getMyParticipations()),
  ]);

  const assessedSkills: AssessedSkill[] = [];
  const projectAssertions: PassportProjectAssertion[] = [];
  const recentDecisions: StudentDecisionAudit[] = [];
  let mentorObservationsCount = 0;

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
              assessedByMentor: `Mentor ${mr.author_user_id.slice(0, 8)}`,
              projectOrigin: snapshot.title,
              assessedAt: mr.created_at.slice(0, 10),
            });
          }
        }
        const mentorFeedback = mr.participant_feedback ?? mr.manager_summary ?? "";
        recentDecisions.push({
          id: mr.id,
          authorType: "mentor",
          authorName: `Mentor ${mr.author_user_id.slice(0, 8)}`,
          projectTitle: snapshot.title,
          actionText: mr.decision === "reviewed" ? "Rubric evaluation recorded" : `Mentor review: ${mr.decision}`,
          excerpt: mentorFeedback,
          createdAt: mr.created_at.slice(0, 10),
        });
        if (!latestMentorReview) {
          latestMentorReview = {
            reviewerName: `Mentor ${mr.author_user_id.slice(0, 8)}`,
            reviewerTitle: "Assigned Mentor",
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
          authorName: `Reviewer ${or.reviewer_user_id.slice(0, 8)}`,
          projectTitle: snapshot.title,
          actionText: or.decision === "accepted" ? "Deliverable accepted" : `Organization decision: ${or.decision}`,
          excerpt: or.explanation,
          createdAt: or.created_at.slice(0, 10),
        });
        if (!latestOrgDecision) {
          latestOrgDecision = {
            reviewerName: `Reviewer ${or.reviewer_user_id.slice(0, 8)}`,
            decision: or.decision === "accepted" ? "accepted" : "revision_requested",
            decidedAt: or.created_at.slice(0, 10),
            formalStatement: or.explanation,
          };
        }
      }
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
      organizationName: "Verified Host Organization",
      organizationVerified: true,
      timeframe: `${snapshot.scope.start_on} – ${snapshot.scope.due_on}`,
      contributionStatement: latestSubmitted?.contribution_statement ?? "No deliverable submission recorded yet.",
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
      displayName: me.display_name ?? "Student",
      email: me.email ?? "",
      isSyntheticDemo: true,
    },
    overallAssertionHash: projectAssertions[0]?.assertionHash ?? "No cryptographic assertion issued yet",
    issuedAt: partSummaries[0]?.created_at?.slice(0, 10) ?? nowIso,
    lastUpdated: nowIso,
    assessedSkills,
    selfReportedSkills,
    projectAssertions,
    isSyntheticDemo: true,
  };

  const passportSummary: StudentPassportTeaser = {
    verifiedClaimsCount: assessedSkills.length,
    completedProjectsCount: partSummaries.filter((p) => p.status === "completed").length,
    mentorObservationsCount,
  };

  return { passport, recentDecisions, passportSummary };
}
