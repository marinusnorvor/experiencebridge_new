import type { ProjectRead, ApplicationRead, SubmissionRead } from "@experiencebridge/api-client";
import { requireData, type PortalApi } from "../../../lib/api/use-portal-resource";
import type { DemoApplication, DemoSubmission } from "../types/portal";
import { termsSnapshot } from "../../student/lib/api-records";

export function mapOrganizationApplication(a: ApplicationRead): DemoApplication {
  return { id: a.id, projectId: a.project_id, name: `Student ${a.student_user_id.slice(0,8)}`,
    skills: a.declared_skills, note: a.motivation, evidence: a.links.map(l => `${l.label}: ${l.url}`).join("\n"),
    availability: `${a.weekly_minutes_available / 60} hours/week`, termsVersion: 0,
    status: a.latest_offer?.status === "accepted" ? "Accepted" : a.status === "shortlisted" ? "Shortlisted" : a.status === "offered" ? "Offered" : a.status === "rejected" ? "Declined" : a.status === "withdrawn" ? "Withdrawn" : "New",
    offerId: a.latest_offer?.id, offerStatus: a.latest_offer?.status, offerExpiry: a.latest_offer?.expires_at, rowVersion: a.row_version };
}

export async function loadOrganizationRecords(api: PortalApi, projects: ProjectRead[]) {
  const applications: DemoApplication[] = [];
  const submissions: DemoSubmission[] = [];
  const participants: Record<string, string[]> = {};
  await Promise.all(projects.map(async project => {
    const appResult = await api.getProjectApplications(project.id);
    if (appResult.status !== 403 && appResult.status !== 404) applications.push(...await Promise.all(requireData(appResult).map(async record => {
      const detail = requireData(await api.getApplication(record.id));
      return { ...mapOrganizationApplication(record), termsVersion: detail.observed_terms.version_no };
    })));
    const partResult = await api.getProjectParticipations(project.id);
    if (partResult.status === 403 || partResult.status === 404) return;
    const parts = requireData(partResult);
    participants[project.id] = parts.map(p => `Student ${p.student_user_id.slice(0,8)} (${p.status})`);
    await Promise.all(parts.map(async part => {
      const detail = requireData(await api.getParticipation(part.id));
      const milestones = termsSnapshot(detail.agreed_terms).scope.milestones;
      const all = requireData(await api.getSubmissions(part.id));
      const latest = new Map<number, SubmissionRead>();
      for (const sub of all.filter(s => s.status !== "draft" && s.status !== "withdrawn")) {
        if ((latest.get(sub.milestone_index)?.revision_no ?? 0) < sub.revision_no) latest.set(sub.milestone_index,sub);
      }
      await Promise.all([...latest.values()].map(async sub => {
        const reviews = requireData(await api.getOrganizationReviews(sub.id));
        const mentorReviews = requireData(await api.getMentorReviews(sub.id));
        const last = reviews[0];
        submissions.push({ id: sub.id, projectId: project.id, title: milestones[sub.milestone_index]?.title ?? "Submission",
          student: `Student ${part.student_user_id.slice(0,8)}`, criteria: milestones[sub.milestone_index]?.acceptance_criteria ?? [],
          versions: [{version: sub.revision_no,date: sub.submitted_at ?? sub.created_at,note: sub.summary,
            content: `${sub.contribution_statement}\n${(sub.artifacts ?? []).map(a => `${a.label}: ${a.url ?? a.excerpt ?? ""}`).join("\n")}`}],
          status: last?.decision === "accepted" ? "Accepted" : last?.decision === "rejected" ? "Rejected" : last ? "Changes requested" : "Awaiting review",
          reviews: reviews.map(r => ({version:sub.revision_no,decision:r.decision === "accepted" ? "Accepted" : r.decision === "rejected" ? "Rejected" : "Changes requested",rationale:r.explanation,
            criteria:r.criteria_results.map(c => c.met),actor:r.reviewer_user_id,at:r.created_at})),
          sharedMentorNote: mentorReviews.map(r => `${r.decision}: ${r.manager_summary ?? "No manager summary disclosed"}`).join("\n") || "No mentor assessment recorded.", rowVersion: sub.row_version });
      }));
    }));
  }));
  return { applications, submissions, participants };
}
