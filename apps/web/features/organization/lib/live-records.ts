import type { ProjectRead, ApplicationRead, SubmissionRead } from "@experiencebridge/api-client";
import { requireData, type PortalApi } from "../../../lib/api/use-portal-resource";
import type { DemoApplication, DemoEvent, DemoInvitation, DemoMentor, DemoSubmission } from "../types/portal";
import { termsSnapshot } from "../../student/lib/api-records";

export function mapOrganizationApplication(a: ApplicationRead): DemoApplication {
  return { id: a.id, projectId: a.project_id, name: `Applicant ${a.student_user_id.slice(0, 6).toUpperCase()}`,
    skills: a.declared_skills, note: a.motivation, evidence: a.links.map(l => `${l.label}: ${l.url}`).join("\n"),
    availability: `${a.weekly_minutes_available / 60} hours/week`, termsVersion: 0,
    status: a.latest_offer?.status === "accepted" ? "Accepted" : a.status === "shortlisted" ? "Shortlisted" : a.status === "offered" ? "Offered" : a.status === "rejected" ? "Declined" : a.status === "withdrawn" ? "Withdrawn" : "New",
    offerId: a.latest_offer?.id, offerStatus: a.latest_offer?.status, offerExpiry: a.latest_offer?.expires_at ? a.latest_offer.expires_at.slice(0, 10) : undefined, rowVersion: a.row_version };
}

export async function loadOrganizationRecords(api: PortalApi, projects: ProjectRead[]) {
  const applications: DemoApplication[] = [];
  const submissions: DemoSubmission[] = [];
  const invitations: DemoInvitation[] = [];
  const mentorsMap = new Map<string, DemoMentor>();
  const participants: Record<string, string[]> = {};
  const acceptedMilestones: Record<string, number[]> = {};
  const events: DemoEvent[] = [];

  for (const project of projects) {
    events.push({
      id: `project-${project.id}`,
      projectId: project.id,
      title: `Project "${project.title}" (${project.status.replaceAll("_", " ")})`,
      at: project.created_at,
      actor: "Organization workspace",
      href: `/organization/projects/${project.id}`,
      read: false,
    });
  }

  await Promise.all(projects.map(async project => {
    const appResult = await api.getProjectApplications(project.id);
    if (appResult.status !== 403 && appResult.status !== 404) {
      const mappedApps = await Promise.all(requireData(appResult).map(async record => {
        const detail = requireData(await api.getApplication(record.id));
        events.push({
          id: `app-${record.id}`,
          projectId: project.id,
          title: `Application from applicant ${record.student_user_id.slice(0, 6).toUpperCase()} (${record.status})`,
          at: record.created_at,
          actor: `Applicant ${record.student_user_id.slice(0, 6).toUpperCase()}`,
          href: `/organization/applications?application=${record.id}`,
          read: false,
        });
        return { ...mapOrganizationApplication(record), termsVersion: detail.observed_terms.version_no };
      }));
      applications.push(...mappedApps);
    }
    const partResult = await api.getProjectParticipations(project.id);
    if (partResult.status === 403 || partResult.status === 404) return;
    const parts = requireData(partResult);
    participants[project.id] = parts.map(p => `Applicant ${p.student_user_id.slice(0, 6).toUpperCase()} (${p.status})`);
    acceptedMilestones[project.id] = [];

    await Promise.all(parts.map(async part => {
      if (typeof api.getParticipationAssignments === "function") {
        const assignRes = await api.getParticipationAssignments(part.id);
        if (assignRes.status !== 403 && assignRes.status !== 404 && assignRes.data) {
          for (const a of assignRes.data) {
            const invStatus: DemoInvitation["status"] =
              a.status === "proposed" ? "Pending" : a.status === "accepted" ? "Accepted" : a.status === "declined" ? "Declined" : "Expired";
            invitations.push({
              id: a.id,
              projectId: project.id,
              mentorId: a.mentor_user_id,
              status: invStatus,
              context: a.context,
            });
            if (!mentorsMap.has(a.mentor_user_id)) {
              mentorsMap.set(a.mentor_user_id, {
                id: a.mentor_user_id,
                name: `Mentor ${a.mentor_user_id.slice(0, 6).toUpperCase()}`,
                skills: "Assigned mentor",
                availability: "",
                eligible: true,
              });
            }
            events.push({
              id: `assign-${a.id}`,
              projectId: project.id,
              title: `Mentor invitation (${a.status})`,
              at: a.created_at,
              actor: `Mentor ${a.mentor_user_id.slice(0, 6).toUpperCase()}`,
              href: `/organization/projects/${project.id}/team`,
              read: false,
            });
          }
        }
      }

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
        if (last?.decision === "accepted") {
          acceptedMilestones[project.id].push(sub.milestone_index);
        }
        const subTitle = milestones[sub.milestone_index]?.title ?? "Submission";
        const subDate = (sub.submitted_at ?? sub.created_at).slice(0, 10);
        events.push({
          id: `sub-${sub.id}`,
          projectId: project.id,
          title: `${subTitle} v${sub.revision_no} (${last ? last.decision : "awaiting review"})`,
          at: sub.submitted_at ?? sub.created_at,
          actor: `Applicant ${part.student_user_id.slice(0, 6).toUpperCase()}`,
          href: `/organization/reviews?submission=${sub.id}`,
          read: Boolean(last),
        });
        submissions.push({ id: sub.id, projectId: project.id, title: subTitle,
          student: `Applicant ${part.student_user_id.slice(0, 6).toUpperCase()}`, criteria: milestones[sub.milestone_index]?.acceptance_criteria ?? [],
          versions: [{version: sub.revision_no, date: subDate, note: sub.summary,
            content: `${sub.contribution_statement}\n${(sub.artifacts ?? []).map(a => `${a.label}: ${a.url ?? a.excerpt ?? ""}`).join("\n")}`}],
          status: last?.decision === "accepted" ? "Accepted" : last?.decision === "rejected" ? "Rejected" : last ? "Changes requested" : "Awaiting review",
          reviews: reviews.map(r => ({version:sub.revision_no,decision:r.decision === "accepted" ? "Accepted" : r.decision === "rejected" ? "Rejected" : "Changes requested",rationale:r.explanation,
            criteria:r.criteria_results.map(c => c.met),actor:r.reviewer_user_id,at:r.created_at})),
          sharedMentorNote: mentorReviews.map(r => `${r.decision}: ${r.manager_summary ?? "No manager summary disclosed"}`).join("\n") || "No mentor assessment recorded.", rowVersion: sub.row_version });
      }));
    }));
  }));

  events.sort((a, b) => b.at.localeCompare(a.at));
  return { applications, submissions, participants, invitations, mentors: [...mentorsMap.values()], acceptedMilestones, events };
}
