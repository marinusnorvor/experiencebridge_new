import type { Brief, DemoEvent, DemoProfile, DemoState } from "../types/portal.ts";
import { validateBrief } from "./brief-validation";
import { validateProfile } from "./profile-validation";

export const demoActor = "Demo Organization Manager";
export interface DemoActionContext { actor: string; revision: number; id: string; at: string }
export function guard(state: DemoState, context: DemoActionContext) {
  if (context.actor !== demoActor) throw new Error("This local action requires the demo organization manager.");
  if (context.revision !== state.revision) throw new Error("The workspace changed. Review the latest information and try again.");
  if (state.events.some((event) => event.id === context.id)) throw new Error("This action was already recorded.");
}
export function record(state: DemoState, context: DemoActionContext, event: Pick<DemoEvent, "title" | "href" | "projectId">): DemoState {
  return { ...state, revision: state.revision + 1, events: [{ ...event, id: context.id, actor: context.actor, at: context.at, read: false }, ...state.events] };
}
export function saveProject(state: DemoState, context: DemoActionContext, id: string, brief: Brief, submit: boolean): DemoState {
  guard(state, context);
  const existing = state.projects.find((project) => project.id === id);
  if (existing && existing.status !== "Draft") throw new Error("Submitted terms are locked in this demo.");
  if (!brief.title.trim()) throw new Error("Give your draft a title before saving.");
  if (submit && Object.keys(validateBrief(brief)).length) throw new Error("Complete all five steps before submitting.");
  const next = { ...brief, id, status: submit ? "In review" as const : "Draft" as const, termsVersion: existing?.termsVersion ?? 1, members: existing?.members ?? [], milestones: existing?.milestones ?? [] };
  return record({ ...state, projects: existing ? state.projects.map((project) => project.id === id ? next : project) : [next, ...state.projects] }, context, { title: submit ? "Project submitted for simulated moderation" : "Project draft saved locally", projectId: id, href: `/organization/projects/${encodeURIComponent(id)}` });
}

export function decideApplication(state: DemoState, context: DemoActionContext, id: string, decision: "Shortlisted" | "Offered" | "Declined", reason: string, expiry: string): DemoState {
  guard(state, context);
  const application = state.applications.find((item) => item.id === id);
  const project = state.projects.find((item) => item.id === application?.projectId);
  if (!application || !project || project.status !== "Recruiting") throw new Error("This project is not open for recruitment.");
  if (!["New", "Shortlisted"].includes(application.status) || application.status === decision) throw new Error("That application decision is no longer available.");
  if (reason.trim().length < 10 || reason.length > 2000) throw new Error("Add a useful reason between 10 and 2,000 characters.");
  if (decision === "Offered") {
    if (application.termsVersion !== project.termsVersion) throw new Error("The applicant has not reviewed this terms version.");
    if (!Number.isFinite(Date.parse(expiry)) || expiry <= context.at.slice(0, 10)) throw new Error("Choose an offer expiry after today.");
    const pending = state.applications.filter((item) => item.projectId === project.id && item.status === "Offered" && (item.offerExpiry ?? "") > context.at.slice(0, 10)).length;
    if (project.members.length + pending >= project.seats) throw new Error("All places are assigned or reserved by pending offers.");
  }
  return record({ ...state, applications: state.applications.map((item) => item.id === id ? { ...item, status: decision, ...(decision === "Offered" ? { offerExpiry: expiry } : {}) } : item) }, context, { projectId: project.id, title: `${application.name}: ${decision}. ${reason.trim()}`, href: `/organization/applications?application=${encodeURIComponent(id)}` });
}

export function inviteMentor(state: DemoState, context: DemoActionContext, projectId: string, mentorId: string, commitment: string): DemoState {
  guard(state, context);
  const project = state.projects.find((item) => item.id === projectId);
  const mentor = state.mentors.find((item) => item.id === mentorId);
  if (!project || !["Active", "Recruiting", "Published"].includes(project.status)) throw new Error("Invitations are unavailable for this project state.");
  if (!mentor?.eligible) throw new Error("Choose an eligible, available sample mentor.");
  if (commitment.trim().length < 10 || commitment.length > 2000) throw new Error("Describe the commitment in 10–2,000 characters.");
  if (state.invitations.some((item) => item.projectId === projectId && item.mentorId === mentorId && ["Pending", "Accepted"].includes(item.status))) throw new Error("This mentor already has a pending invitation or accepted assignment.");
  return record({ ...state, invitations: [...state.invitations, { id: `invite-${context.id}`, projectId, mentorId, context: commitment.trim(), status: "Pending" }] }, context, { title: `Sample invitation for ${mentor.name}: ${commitment.trim()}`, projectId, href: `/organization/projects/${encodeURIComponent(projectId)}/team` });
}

export function updateMilestone(state: DemoState, context: DemoActionContext, projectId: string, milestoneId: string, done: boolean, blocker: string): DemoState {
  guard(state, context);
  const project = state.projects.find((item) => item.id === projectId);
  const milestone = project?.milestones.find((item) => item.id === milestoneId);
  if (!project || project.status !== "Active" || !milestone) throw new Error("Choose a milestone in an active sample project.");
  if (done && blocker.trim()) throw new Error("Resolve the blocker before marking this milestone complete.");
  if (blocker.length > 2000) throw new Error("Keep the blocker under 2,000 characters.");
  if (milestone.done === done && milestone.blocker === blocker.trim()) throw new Error("There are no milestone changes to save.");
  return record({ ...state, projects: state.projects.map((item) => item.id !== projectId ? item : { ...item, milestones: item.milestones.map((entry) => entry.id !== milestoneId ? entry : { ...entry, done, blocker: blocker.trim() }) }) }, context, { title: `${milestone.title}: ${done ? "sample progress complete" : blocker.trim() || "in progress"}. This is not deliverable acceptance.`, projectId, href: `/organization/projects/${projectId}/workspace?tab=milestones` });
}
export function postProjectText(state: DemoState, context: DemoActionContext, projectId: string, body: string, kind: "message" | "update"): DemoState {
  guard(state, context);
  const project = state.projects.find((item) => item.id === projectId);
  if (!project || !["Active", "Recruiting", "Published"].includes(project.status)) throw new Error("This project is read-only or unavailable.");
  if (!body.trim() || body.length > 2000) throw new Error("Write between 1 and 2,000 characters.");
  const next = kind === "message" ? { ...state, messages: [...state.messages, { id: `message-${context.id}`, projectId, author: context.actor, body: body.trim(), at: context.at, read: true }] } : state;
  return record(next, context, { projectId, title: kind === "message" ? "Organization added a sample discussion reply" : `Project update: ${body.trim()}`, href: kind === "message" ? `/organization/messages?project=${projectId}` : `/organization/projects/${projectId}/workspace?tab=updates` });
}
export function closeProject(state: DemoState, context: DemoActionContext, projectId: string, reason: string): DemoState {
  guard(state, context);
  const project = state.projects.find((item) => item.id === projectId);
  if (!project || project.status !== "Completed") throw new Error("Only an already-completed sample project can be archived.");
  if (project.milestones.some((item) => !item.done) || state.submissions.some((item) => item.projectId === projectId && item.status !== "Accepted")) throw new Error("Resolve outstanding milestones and deliverable decisions first.");
  if (reason.trim().length < 10 || reason.length > 2000) throw new Error("Add a closure note between 10 and 2,000 characters.");
  return record({ ...state, projects: state.projects.map((item) => item.id === projectId ? { ...item, status: "Closed" } : item) }, context, { projectId, title: `Sample archive: ${reason.trim()}`, href: `/organization/projects/${projectId}/workspace?tab=updates` });
}

export function reviewSubmission(state: DemoState, context: DemoActionContext, submissionId: string, version: number, decision: "Accepted" | "Changes requested", criteria: boolean[], rationale: string): DemoState {
  guard(state, context);
  const submission = state.submissions.find((item) => item.id === submissionId);
  const project = state.projects.find((item) => item.id === submission?.projectId);
  if (!submission || project?.status !== "Active") throw new Error("This submission is not available for review in an active project.");
  if (submission.status !== "Awaiting review" || submission.reviews.some((item) => item.version === version)) throw new Error("A decision is already recorded. A new student submission version is required.");
  if (submission.versions.at(-1)?.version !== version) throw new Error("Review the latest submission version before deciding.");
  if (rationale.trim().length < 10 || rationale.length > 2000) throw new Error("Explain your decision in 10–2,000 characters.");
  if (criteria.length !== submission.criteria.length || criteria.some((value) => typeof value !== "boolean")) throw new Error("Review every original acceptance criterion.");
  if (decision === "Accepted" && !criteria.every(Boolean)) throw new Error("Acceptance requires every criterion to be met.");
  const review = { version, decision, criteria: [...criteria], rationale: rationale.trim(), actor: context.actor, at: context.at };
  return record({ ...state, submissions: state.submissions.map((item) => item.id === submissionId ? { ...item, status: decision, reviews: [...item.reviews, review] } : item) }, context, { projectId: project.id, title: `${submission.title} v${version}: ${decision}. ${rationale.trim()}`, href: `/organization/reviews?submission=${encodeURIComponent(submissionId)}` });
}

export function saveProfile(state: DemoState, context: DemoActionContext, profile: DemoProfile): DemoState {
  guard(state, context);
  if (Object.keys(validateProfile(profile)).length) throw new Error("Correct the highlighted profile fields.");
  return record({ ...state, profile: { ...profile, verification: "Not verified" } }, context, { title: "Synthetic organization profile updated; verification is not granted", href: "/organization/settings" });
}
export function requestVerification(state: DemoState, context: DemoActionContext): DemoState {
  guard(state, context);
  if (state.profile.verification !== "Not verified") throw new Error("A sample request is already pending.");
  if (Object.keys(validateProfile(state.profile)).length) throw new Error("Complete and save the sample profile first.");
  return record({ ...state, profile: { ...state.profile, verification: "Pending demo review" } }, context, { title: "Synthetic verification request recorded locally; no administrator contacted", href: "/organization/settings" });
}
export function markRead(state: DemoState, context: DemoActionContext, kind: "notifications" | "messages", id: string): DemoState {
  guard(state, context);
  if (kind === "messages") {
    if (!state.projects.some((project) => project.id === id)) throw new Error("Project unavailable.");
    if (!state.messages.some((item) => item.projectId === id && !item.read)) return state;
    return { ...state, revision: state.revision + 1, messages: state.messages.map((item) => item.projectId === id ? { ...item, read: true } : item) };
  }
  if (id !== "all" && !state.events.some((event) => event.id === id)) throw new Error("Notification unavailable.");
  if (!state.events.some((item) => !item.read && (id === "all" || item.id === id))) return state;
  return { ...state, revision: state.revision + 1, events: state.events.map((item) => id === "all" || item.id === id ? { ...item, read: true } : item) };
}
