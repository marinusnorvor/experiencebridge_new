import type { Brief, DemoProject, DemoState } from "../types/portal";

export const emptyBrief: Brief = {
  title: "", problem: "", audience: "", outcome: "", skills: "", difficulty: "Intermediate", seats: 1, hours: 6,
  eligibility: "", deliverables: "", criteria: "", evidence: "", exclusions: "", start: "", due: "", milestonePlan: "", mentorPlan: "",
  fee: "", paymentTerms: "", ipTerms: "", privacyTerms: "", reviewer: "Demo Organization Manager",
};

function project(id: string, title: string, status: DemoProject["status"], skills: string, members: string[] = []): DemoProject {
  return { ...emptyBrief, id, title, status, skills, members, termsVersion: 1,
    problem: "A fictional community team needs a clearer way to understand and use its sample information.",
    audience: "Fictional community coordinators", outcome: "Demonstrate three accessible user journeys using synthetic records.",
    eligibility: "Students with foundational research or interface skills; no sensitive data access.",
    deliverables: "Interactive prototype\nConcise handover report", criteria: "Three primary journeys are navigable\nEvery form field has an accessible label",
    evidence: "Prototype walkthrough and written rationale using synthetic data only.", exclusions: "No production deployment, payments, or personal datasets.",
    start: "2026-11-01", due: "2026-11-21", milestonePlan: "Research plan\nPrototype\nHandover", mentorPlan: "Weekly feedback on scope and methods; assignment requires mentor acceptance.",
    fee: "1200.00", paymentTerms: "Synthetic fixed-fee example: organization pays externally after agreed handover. No platform-held funds.",
    ipTerms: "Sample terms for review only. Rights require a separate agreement before real participation.", privacyTerms: "Private by default. Synthetic information only; no portfolio disclosure without item-level approval.",
    seats: 3, milestones: [
      { id: `${id}-research`, title: "Research plan", due: "2026-11-04", done: status === "Active", blocker: "" },
      { id: `${id}-prototype`, title: "Interactive prototype", due: "2026-11-11", done: false, blocker: id === "demo-market" ? "Waiting for a sample research outline." : "" },
      { id: `${id}-handover`, title: "Handover", due: "2026-11-21", done: false, blocker: "" },
    ],
  };
}

/** Never populate this fixture with real participant records or evidence. */
export function createDemoState(): DemoState {
  return {
    revision: 0,
    projects: [
      project("demo-health", "Community health dashboard", "Active", "Product design, React, Accessibility", ["Demo Student A", "Demo Student B"]),
      project("demo-market", "Local market insights", "Active", "Research, Data analysis", ["Demo Student C"]),
      project("demo-library", "A more accessible library", "Recruiting", "UX research, Interaction design"),
      project("demo-draft", "Community welcome toolkit", "Draft", "Content design, Research"),
      project("demo-review", "Accessible event guide", "In review", "Accessibility, Content design"),
      project("demo-published", "Neighbourhood resource map", "Published", "Mapping, UX research"),
      { ...project("demo-completed", "Volunteer handbook", "Completed", "Content design"), milestones: [], members: ["Demo Student D"] },
      { ...project("demo-closed", "Sample service directory", "Closed", "Research"), milestones: [] },
    ],
    applications: ["A", "B", "C", "D", "E"].map((letter, index) => ({ id: `application-${letter.toLowerCase()}`, projectId: "demo-library", name: `Demo Applicant ${letter}`, skills: ["UX research", index % 2 ? "Accessibility" : "Interaction design"], availability: "6 hours per week", note: "I would like to contribute to a bounded research project and learn through thoughtful feedback.", evidence: "Synthetic portfolio excerpt: a three-screen library discovery exercise. No private files or external links.", status: "New", termsVersion: 1 })),
    mentors: [
      { id: "mentor-a", name: "Demo Mentor A", skills: "Product design · Accessibility", availability: "One weekly feedback session", eligible: true },
      { id: "mentor-b", name: "Demo Mentor B", skills: "Research · Data analysis", availability: "Two hours per week", eligible: true },
      { id: "mentor-c", name: "Demo Mentor C", skills: "UX research · Service design", availability: "One hour per week", eligible: true },
      { id: "mentor-d", name: "Demo Mentor D", skills: "Engineering", availability: "Unavailable this month", eligible: false },
    ],
    invitations: [
      { id: "invite-assigned", projectId: "demo-health", mentorId: "mentor-a", status: "Accepted", context: "Pre-existing synthetic assignment; not created by an organization acceptance action." },
      { id: "invite-mentor", projectId: "demo-market", mentorId: "mentor-b", status: "Pending", context: "Weekly research critique for three weeks." },
    ],
    submissions: [{ id: "review-wireframes", projectId: "demo-health", title: "Wireframes & information architecture", student: "Demo Student A", criteria: ["Three primary journeys are navigable", "Every form field has an accessible label"],
      versions: [
        { version: 1, date: "2026-10-27", note: "Initial sample navigation structure.", content: "SYNTHETIC EVIDENCE v1\nJourney 1: discover a report. Journey 2: read sample service data. Journey 3: request a follow-up. Form labels were not documented." },
        { version: 2, date: "2026-10-29", note: "Revised navigation and accessible form labels.", content: "SYNTHETIC EVIDENCE v2\nAll three sample journeys have a defined start and end. Search, date range and follow-up fields have visible labels and error text. This is a written fixture, not a genuine submitted artifact." },
      ], status: "Awaiting review", reviews: [], sharedMentorNote: "No shareable mentor assessment is recorded. Organization acceptance does not create one." }],
    messages: [
      { id: "message-health", projectId: "demo-health", author: "Demo Student A", body: "The second wireframe version is ready for your review. All content is synthetic.", at: "2026-10-29T10:00:00Z", read: false },
      { id: "message-market", projectId: "demo-market", author: "Demo Student C", body: "Could we clarify the sample research outline before the next milestone?", at: "2026-10-30T09:00:00Z", read: false },
    ],
    events: [
      { id: "event-review", projectId: "demo-health", title: "Sample submission ready for organization review", at: "2026-10-29T10:00:00Z", actor: "Demo Student A", href: "/organization/reviews?submission=review-wireframes", read: false },
      { id: "event-app", projectId: "demo-library", title: "Five sample applications arrived", at: "2026-10-31T09:00:00Z", actor: "Synthetic fixture", href: "/organization/applications?project=demo-library", read: false },
    ],
    profile: { name: "DEMO Acme Technologies", description: "A fictional organization exploring scoped, evidence-led learning projects.", email: "demo@example.invalid", website: "", country: "Ghana", representative: "Demo Organization Manager", digest: true, verification: "Not verified" },
  };
}
