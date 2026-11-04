/** Local presentation model only. Not API DTOs, identity, or an authorization contract. */
export type ProjectStatus = "Draft" | "Needs revision" | "In review" | "Published" | "Recruiting" | "Active" | "Completed" | "Closed";
export interface Brief {
  title: string; problem: string; audience: string; outcome: string;
  skills: string; difficulty: string; seats: number; hours: number; eligibility: string;
  deliverables: string; criteria: string; evidence: string; exclusions: string;
  start: string; due: string; milestonePlan: string; mentorPlan: string;
  fee: string; paymentTerms: string; ipTerms: string; privacyTerms: string; reviewer: string;
}
export interface DemoProject extends Brief {
  id: string; status: ProjectStatus; backendStatus?: string; termsVersion: number; members: string[];
  milestones: { id: string; title: string; due: string; done: boolean; blocker: string }[];
}
export type ApplicationStatus = "New" | "Shortlisted" | "Offered" | "Accepted" | "Declined" | "Withdrawn";
export interface DemoApplication {
  rowVersion?: number;
  offerId?: string; offerStatus?: string;
  id: string; projectId: string; name: string; skills: string[]; note: string; evidence: string;
  availability: string; status: ApplicationStatus; termsVersion: number; offerExpiry?: string;
}
export interface DemoMentor { id: string; name: string; skills: string; availability: string; eligible: boolean }
export interface DemoInvitation { id: string; projectId: string; mentorId: string; status: "Pending" | "Accepted" | "Declined" | "Expired"; context: string }
export interface DemoSubmission {
  rowVersion?: number;
  id: string; projectId: string; title: string; student: string; criteria: string[];
  versions: { version: number; date: string; note: string; content: string }[];
  status: "Awaiting review" | "Accepted" | "Changes requested" | "Rejected";
  reviews: { version: number; decision: "Accepted" | "Changes requested" | "Rejected"; rationale: string; criteria: boolean[]; actor: string; at: string }[];
  sharedMentorNote: string;
}
export interface DemoMessage { id: string; projectId: string; author: string; body: string; at: string; read: boolean }
export interface DemoEvent { id: string; projectId?: string; title: string; at: string; actor: string; href: string; read: boolean }
export interface DemoProfile { name: string; description: string; email: string; website: string; country: string; representative: string; digest: boolean; verification: "Not verified" | "Pending demo review" }
export interface DemoState {
  revision: number; projects: DemoProject[]; applications: DemoApplication[]; mentors: DemoMentor[];
  invitations: DemoInvitation[]; submissions: DemoSubmission[]; messages: DemoMessage[]; events: DemoEvent[]; profile: DemoProfile;
}
