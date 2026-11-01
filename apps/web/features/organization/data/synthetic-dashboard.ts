import type { DashboardSnapshot } from "../types/dashboard";

/** Every person, event, project and outcome below is fictional. Fixed snapshot, not live activity. */
export const syntheticDashboard: DashboardSnapshot = {
  asOf: "2026-10-31",
  projects: [
    { id: "demo-health", title: "Community health dashboard", summary: "Help community teams understand service demand through clearer, accessible reporting.", discipline: "Product design & engineering", state: "Active", completedMilestones: 2, totalMilestones: 4, nextMilestone: "Interactive prototype", due: "2026-11-04", members: ["Demo Student A", "Demo Student B"], mentor: "Demo Mentor A · assigned in fixture" },
    { id: "demo-market", title: "Local market insights", summary: "Turn a synthetic research dataset into practical insights for small retailers.", discipline: "Research & data", state: "Active", completedMilestones: 1, totalMilestones: 3, nextMilestone: "Research synthesis", due: "2026-11-06", members: ["Demo Student C"], mentor: "Invitation pending · no access granted" },
    { id: "demo-library", title: "A more accessible library", summary: "Explore a simpler discovery experience for a fictional community library.", discipline: "UX research", state: "Recruiting", completedMilestones: 0, totalMilestones: 3, nextMilestone: "Application window closes", due: "2026-11-07", members: [], mentor: "Not assigned" },
  ],
  records: [
    { id: "review-wireframes", category: "reviews", title: "Wireframes & information architecture", projectId: "demo-health", status: "Awaiting organization review", date: "2026-10-29", description: "Demo Student A submitted version 2 with revised navigation and accessible form patterns.", details: ["Acceptance criteria: primary journeys cover discovery, reporting and follow-up; all form fields have labels.", "Version 2 · synthetic submission summary only. No private files are attached.", "Organization decision: not recorded. Mentor assessment: not recorded. These are independent decisions."] },
    { id: "deadline-research", category: "deadlines", title: "Research plan", projectId: "demo-market", status: "Overdue", date: "2026-10-30", description: "The sample research plan is one day overdue at the snapshot date.", details: ["Expected output: a bounded research plan using synthetic data only.", "Next step: discuss the blocker with the project team. This preview does not send a message or amend a deadline."] },
    { id: "deadline-prototype", category: "deadlines", title: "Interactive prototype", projectId: "demo-health", status: "Upcoming", date: "2026-11-04", description: "The next milestone connects the agreed reporting journeys into a navigable prototype.", details: ["Acceptance criteria: every primary journey has a usable start and end state.", "No submission or organization acceptance has been recorded for this milestone."] },
    { id: "deadline-synthesis", category: "deadlines", title: "Research synthesis", projectId: "demo-market", status: "Upcoming", date: "2026-11-06", description: "Summarize findings from the sample retailer dataset.", details: ["Expected output: a concise findings report with evidence references and limitations."] },
    { id: "deadline-library", category: "deadlines", title: "Application window closes", projectId: "demo-library", status: "Upcoming", date: "2026-11-07", description: "The fictional library project is gathering expressions of interest.", details: ["Applications are not memberships. Students join only after accepting an authorized offer."] },
    { id: "invite-mentor", category: "invitations", title: "Research mentor invitation", projectId: "demo-market", status: "Awaiting response", date: "2026-10-28", description: "Demo Mentor B has not responded to the sample invitation.", details: ["Requested support: one weekly research critique for three weeks.", "An invitation does not grant project access or create a mentor assessment."] },
    ...[
      ["application-a", "Demo Applicant A", "UX research", "2026-10-31"],
      ["application-b", "Demo Applicant B", "Accessible interface design", "2026-10-31"],
      ["application-c", "Demo Applicant C", "Interview synthesis", "2026-10-30"],
      ["application-d", "Demo Applicant D", "Information architecture", "2026-10-29"],
      ["application-e", "Demo Applicant E", "Interaction design", "2026-10-28"],
    ].map(([id, title, skill, date]) => ({ id, category: "applications" as const, title, projectId: "demo-library", status: "New application", date, description: `${skill} · sample availability: 6 hours per week.`, details: [`Application note: I would like to contribute my ${skill.toLowerCase()} skills to a scoped learning project.`, "Synthetic applicant. No offer, accepted membership, or verified experience is implied."] })),
  ],
  attention: [
    { id: "attention-overdue", recordId: "deadline-research", priority: "High", label: "A milestone needs a check-in", action: "View deadline" },
    { id: "attention-review", recordId: "review-wireframes", priority: "High", label: "A deliverable is ready for review", action: "View submission" },
    { id: "attention-applications", recordId: "application-a", priority: "Normal", label: "New talent is waiting to hear from you", action: "View applications" },
    { id: "attention-mentor", recordId: "invite-mentor", priority: "Normal", label: "A mentor invitation is unanswered", action: "View invitation" },
  ],
  activity: [
    { id: "event-a", recordId: "application-a", title: "A new application arrived", date: "2026-10-31", description: "Demo Applicant A · A more accessible library" },
    { id: "event-b", recordId: "review-wireframes", title: "Wireframes were resubmitted", date: "2026-10-29", description: "Version 2 · Community health dashboard" },
    { id: "event-c", recordId: "invite-mentor", title: "A mentor invitation was sent", date: "2026-10-28", description: "Demo Mentor B · Local market insights" },
  ],
};
