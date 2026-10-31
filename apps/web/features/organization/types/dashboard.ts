/** Presentation-only records; not backend DTOs or approved lifecycle contracts. */
export type DashboardCategory = "projects" | "applications" | "reviews" | "deadlines" | "invitations";

export interface DashboardRecord {
  id: string;
  category: DashboardCategory;
  title: string;
  projectId: string;
  description: string;
  status: string;
  date: string;
  details: readonly string[];
}

export interface DashboardProject {
  id: string;
  title: string;
  summary: string;
  discipline: string;
  state: "Active" | "Recruiting";
  completedMilestones: number;
  totalMilestones: number;
  nextMilestone: string;
  due: string;
  members: readonly string[];
  mentor: string;
}

export interface DashboardSnapshot {
  asOf: string;
  projects: readonly DashboardProject[];
  records: readonly DashboardRecord[];
  attention: readonly { id: string; recordId: string; priority: "High" | "Normal"; label: string; action: string }[];
  activity: readonly { id: string; recordId: string; title: string; date: string; description: string }[];
}
