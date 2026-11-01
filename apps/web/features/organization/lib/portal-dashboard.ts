import type { DemoState } from "../types/portal";
import type { DashboardRecord, DashboardSnapshot } from "../types/dashboard";

/** One local read model keeps dashboard counts consistent with demo decisions. */
export function portalDashboard(state: DemoState): DashboardSnapshot {
  const asOf = "2026-10-31";
  const projects: DashboardSnapshot["projects"] = state.projects.filter((project) => project.status === "Active" || project.status === "Recruiting").map((project) => ({
    id: project.id, title: project.title, summary: project.problem, discipline: project.skills,
    state: project.status as "Active" | "Recruiting", completedMilestones: project.milestones.filter((item) => item.done).length,
    totalMilestones: project.milestones.length, nextMilestone: project.milestones.find((item) => !item.done)?.title ?? "No pending milestone",
    due: project.milestones.find((item) => !item.done)?.due ?? project.due, members: project.members,
    mentor: state.invitations.filter((item) => item.projectId === project.id && item.status === "Accepted").map((invite) => state.mentors.find((mentor) => mentor.id === invite.mentorId)?.name).join(", ") || "Not assigned",
  }));
  const records: DashboardRecord[] = [
    ...state.projects.map((project): DashboardRecord => ({ id: project.id, category: "projects", projectId: project.id, title: project.title, description: project.problem, status: project.status, date: project.due || asOf, details: [project.outcome, project.criteria], href: `/organization/projects/${project.id}` })),
    ...state.applications.map((item): DashboardRecord => ({ id: item.id, category: "applications", projectId: item.projectId, title: item.name, description: `${item.skills.join(", ")} · ${item.note}`, status: item.status, date: asOf, details: [item.evidence, item.availability, `Terms v${item.termsVersion}`], href: `/organization/applications?application=${item.id}` })),
    ...state.submissions.map((item): DashboardRecord => ({ id: item.id, category: "reviews", projectId: item.projectId, title: item.title, description: item.student, status: item.status, date: item.versions.at(-1)?.date ?? asOf, details: [item.versions.at(-1)?.note ?? "", item.sharedMentorNote], href: `/organization/reviews?submission=${item.id}` })),
    ...state.projects.filter((project) => project.status === "Active").flatMap((project) => project.milestones.filter((item) => !item.done).map((item): DashboardRecord => ({ id: item.id, category: "deadlines", projectId: project.id, title: item.title, description: item.blocker || "Sample milestone in progress", status: item.due < asOf ? "Overdue" : "Upcoming", date: item.due, details: [item.blocker || "No blocker recorded", "Progress is separate from organization acceptance."], href: `/organization/projects/${project.id}/workspace?tab=milestones` }))),
    ...state.invitations.filter((item) => item.status === "Pending").map((item): DashboardRecord => ({ id: item.id, category: "invitations", projectId: item.projectId, title: state.mentors.find((mentor) => mentor.id === item.mentorId)?.name ?? "Sample mentor", description: item.context, status: "Pending", date: asOf, details: ["Invitation does not grant assignment or access."], href: `/organization/projects/${item.projectId}/team` })),
  ];
  const attention: DashboardSnapshot["attention"][number][] = records.filter((record) => record.category === "reviews" && record.status === "Awaiting review").map((record) => ({ id: `attention-${record.id}`, recordId: record.id, priority: "High", label: "A deliverable is ready for review", action: "Review evidence" }));
  for (const project of state.projects) {
    const application = records.find((record) => record.category === "applications" && record.status === "New" && record.projectId === project.id);
    if (application) attention.push({ id: `applications-${project.id}`, recordId: application.id, priority: "Normal", label: "New talent is waiting to hear from you", action: "Review applications" });
    for (const milestone of project.milestones.filter((item) => !item.done && !!item.blocker)) if (project.status === "Active") attention.push({ id: `blocked-${milestone.id}`, recordId: milestone.id, priority: "High", label: "A milestone needs a check-in", action: "View milestone" });
  }
  for (const record of records.filter((item) => item.category === "invitations")) attention.push({ id: `attention-${record.id}`, recordId: record.id, priority: "Normal", label: "A mentor invitation is awaiting a response", action: "View invitation" });
  return { asOf, projects, records, attention, activity: state.events.filter((event) => !!event.projectId).slice(0, 5).map((event) => ({ id: event.id, recordId: event.projectId!, title: event.title, description: event.actor, date: event.at.slice(0, 10), href: event.href })) };
}
