import type { AssignmentRead } from "@experiencebridge/api-client";
import { requireData, type PortalApi } from "@/lib/api/use-portal-resource";
import { termsSnapshot } from "@/features/student/lib/api-records";
import type { MentorDashboardData } from "./sample-dashboard-data";

export const emptyMentorDashboard: MentorDashboardData = {
  proposals: [],
  acceptedAssignments: [],
  pendingReviews: [],
  upcomingDeadlines: [],
  reviewCapacity: { expectedReviewsThisWeek: 0, weeklyReviewCapacity: 0 },
};

export function mapProposal(a: AssignmentRead): MentorDashboardData["proposals"][number] {
  return {
    id: a.id,
    projectTitle: `Project ${a.project_id.slice(0, 8)}`,
    organizationLabel: "See proposal context",
    learnerLabel: `Participation ${a.participation_id.slice(0, 8)}`,
    projectSummary: a.context,
    expectedCommitment: a.context,
    estimatedHours: "Not specified",
    participantCount: 1,
    reviewExpectations: "Independent assessment of this participation",
    confidentialitySummary:
      "Project evidence is private. Acknowledge confidentiality before accepting.",
    responseDue: a.expires_at.slice(0, 10),
  };
}

export async function loadMentorParticipation(
  api: PortalApi,
  id: string
): Promise<MentorDashboardData["acceptedAssignments"][number]> {
  const part = requireData(await api.getParticipation(id));
  const snapshot = termsSnapshot(part.agreed_terms);

  const submissionsRes = await api.getSubmissions(id);
  const submissionsList = submissionsRes.data ?? [];

  const reviewsBySub = await Promise.all(
    submissionsList.map(async (sub) => {
      const res = await api.getMentorReviews(sub.id);
      return res.data ?? [];
    })
  );
  const allMentorReviews = reviewsBySub.flat();

  const activeMilestoneIndex = snapshot.scope.milestones.findIndex(
    (m, idx) => !submissionsList.some((s) => s.milestone_index === idx && s.status === "submitted")
  );
  const effectiveActiveIndex = activeMilestoneIndex >= 0 ? activeMilestoneIndex : 0;

  const milestones = snapshot.scope.milestones.map((m, index) => {
    const milestoneSubmissions = submissionsList.filter((s) => s.milestone_index === index);
    const hasSubmissions = milestoneSubmissions.length > 0;

    const isConcluded =
      part.status === "completed" ||
      part.status === "partially_completed" ||
      part.status === "withdrawn" ||
      part.status === "cancelled";

    let availabilityStatus: "planned" | "active" | "archived" = "planned";
    if (isConcluded) {
      availabilityStatus = "archived";
    } else if (hasSubmissions || index === effectiveActiveIndex) {
      availabilityStatus = "active";
    } else if (index < effectiveActiveIndex) {
      availabilityStatus = "archived";
    } else {
      availabilityStatus = "planned";
    }

    const mappedSubmissions = milestoneSubmissions.map((s) => ({
      id: s.id,
      revisionNumber: s.revision_no,
      summary: s.summary,
      status: s.status,
      submittedAt: s.submitted_at ?? null,
      evidenceReferences: (s.artifacts || []).map((a) => ({
        id: a.id,
        name: a.label,
        kind: a.kind,
      })),
    }));

    return {
      id: String(index),
      title: m.title,
      description: m.acceptance_criteria.join("; "),
      dueDate: m.due_on,
      availabilityStatus,
      status:
        availabilityStatus === "active"
          ? "In progress"
          : availabilityStatus === "archived"
          ? "Completed"
          : "Planned",
      submissions: mappedSubmissions,
    };
  });

  const mentorReviews = allMentorReviews.map((r) => ({
    id: r.id,
    submissionId: r.submission_id,
    decision: r.decision,
    rubricVersion: "standard-rubric-v1",
    createdAt: r.created_at,
  }));

  return {
    id: part.id,
    participationId: part.id,
    projectTitle: snapshot.title,
    organizationLabel: "Organization details not supplied",
    learnerLabel: part.student_user_id,
    projectSummary: snapshot.description,
    participationStatus: part.status,
    nextMilestone: snapshot.scope.milestones[0]?.title ?? "No milestone",
    dueDate: snapshot.scope.due_on,
    milestones,
    mentorReviews,
  };
}

export async function loadMentorDashboard(api: PortalApi): Promise<MentorDashboardData> {
  const assignments = requireData(await api.getMyMentorAssignments());
  const profile = await api.getMentorProfile();
  if (profile.error && profile.status !== 404) throw new Error(profile.error);

  const acceptedAssignments = await Promise.all(
    assignments
      .filter((a) => a.status === "accepted")
      .map((a) => loadMentorParticipation(api, a.participation_id))
  );

  const pendingReviews = acceptedAssignments.flatMap((assignment) =>
    assignment.milestones.flatMap((milestone) =>
      milestone.submissions
        .filter(
          (s) =>
            s.status === "submitted" &&
            !assignment.mentorReviews.some((r) => r.submissionId === s.id)
        )
        .map((s) => ({
          id: s.id,
          participationId: assignment.participationId,
          projectTitle: assignment.projectTitle,
          learnerLabel: assignment.learnerLabel,
          milestone: milestone.title,
          submittedDate: (s.submittedAt ?? "").slice(0, 10),
          reviewDue: "",
        }))
    )
  );

  return {
    ...emptyMentorDashboard,
    pendingReviews,
    proposals: assignments.filter((a) => a.status === "proposed").map(mapProposal),
    acceptedAssignments,
    upcomingDeadlines: acceptedAssignments.map((a) => ({
      id: a.id,
      label: a.nextMilestone,
      relatedTo: a.projectTitle,
      dueDate: a.dueDate,
    })),
    reviewCapacity: {
      expectedReviewsThisWeek: pendingReviews.length,
      weeklyReviewCapacity: profile.data?.weekly_review_capacity ?? 0,
    },
  };
}
