import type { AssignmentRead } from "@experiencebridge/api-client";
import { requireData, type PortalApi } from "@/lib/api/use-portal-resource";
import { termsSnapshot } from "@/features/student/lib/api-records";
import type { MentorDashboardData } from "./sample-dashboard-data";

export const emptyMentorDashboard: MentorDashboardData = { proposals: [], acceptedAssignments: [], pendingReviews: [], upcomingDeadlines: [], reviewCapacity: { expectedReviewsThisWeek: 0, weeklyReviewCapacity: 0 } };

export function mapProposal(a: AssignmentRead): MentorDashboardData["proposals"][number] {
  return { id: a.id, projectTitle: `Project ${a.project_id.slice(0,8)}`, organizationLabel: "See proposal context",
    learnerLabel: `Participation ${a.participation_id.slice(0,8)}`, projectSummary: a.context,
    expectedCommitment: a.context, estimatedHours: "Not specified", participantCount: 1,
    reviewExpectations: "Independent assessment of this participation", confidentialitySummary: "Project evidence is private. Acknowledge confidentiality before accepting.", responseDue: a.expires_at.slice(0,10) };
}

export async function loadMentorParticipation(api: PortalApi, id: string): Promise<MentorDashboardData["acceptedAssignments"][number]> {
  const part = requireData(await api.getParticipation(id));
  const snapshot = termsSnapshot(part.agreed_terms);
  return { id: part.id, participationId: part.id, projectTitle: snapshot.title, organizationLabel: "Organization details not supplied",
    learnerLabel: part.student_user_id, projectSummary: snapshot.description, participationStatus: part.status,
    nextMilestone: snapshot.scope.milestones[0]?.title ?? "No milestone", dueDate: snapshot.scope.due_on,
    milestones: snapshot.scope.milestones.map((m,index) => ({ id: String(index), title: m.title,
      description: m.acceptance_criteria.join("; "), dueDate: m.due_on, status: "See submitted evidence and reviews" })) };
}

export async function loadMentorDashboard(api: PortalApi): Promise<MentorDashboardData> {
  const assignments = requireData(await api.getMyMentorAssignments());
  const profile = await api.getMentorProfile();
  if (profile.error && profile.status !== 404) throw new Error(profile.error);
  const acceptedAssignments = await Promise.all(assignments.filter(a => a.status === "accepted").map(a => loadMentorParticipation(api,a.participation_id)));
  const pendingReviews = (await Promise.all(acceptedAssignments.map(async assignment => {
    const submissions = requireData(await api.getSubmissions(assignment.participationId));
    const pending = await Promise.all(submissions.filter(s => s.status === "submitted").map(async submission => {
      const reviews = requireData(await api.getMentorReviews(submission.id));
      if (reviews.length) return null;
      return { id: submission.id, participationId: assignment.participationId, projectTitle: assignment.projectTitle, learnerLabel: assignment.learnerLabel,
        milestone: assignment.milestones[submission.milestone_index]?.title ?? "Milestone", submittedDate: (submission.submitted_at ?? submission.created_at).slice(0,10), reviewDue: "" };
    }));
    return pending.filter((item): item is NonNullable<typeof item> => item !== null);
  }))).flat();
  return { ...emptyMentorDashboard, pendingReviews, proposals: assignments.filter(a => a.status === "proposed").map(mapProposal), acceptedAssignments,
    upcomingDeadlines: acceptedAssignments.map(a => ({id:a.id,label:a.nextMilestone,relatedTo:a.projectTitle,dueDate:a.dueDate})),
    reviewCapacity: { expectedReviewsThisWeek: pendingReviews.length, weeklyReviewCapacity: profile.data?.weekly_review_capacity ?? 0 } };
}
