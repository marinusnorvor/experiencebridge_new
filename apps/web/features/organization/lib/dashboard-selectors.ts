import type { DashboardCategory, DashboardSnapshot } from "../types/dashboard";

export const dashboardCategories: readonly DashboardCategory[] = ["projects", "applications", "reviews", "deadlines", "invitations"];

export function parseDashboardView(value: string | null): DashboardCategory | null {
  return dashboardCategories.find((category) => category === value) ?? null;
}

function isUpcomingDeadline(record: DashboardSnapshot["records"][number], asOf: string) {
  const days = (Date.parse(`${record.date}T12:00:00Z`) - Date.parse(`${asOf}T12:00:00Z`)) / 86_400_000;
  return record.category === "deadlines" && record.status === "Upcoming" && days >= 0 && days <= 7;
}

export function getDashboardMetrics(snapshot: DashboardSnapshot) {
  return [
    { id: "projects" as const, label: "Active projects", value: snapshot.projects.filter((project) => project.state === "Active").length, caption: "Moving from ideas to outcomes", icon: "projects" },
    { id: "applications" as const, label: "New applications", value: snapshot.records.filter((record) => record.category === "applications").length, caption: "People ready to contribute", icon: "applications" },
    { id: "reviews" as const, label: "Pending reviews", value: snapshot.records.filter((record) => record.category === "reviews").length, caption: "Deliverables awaiting your input", icon: "reviews" },
    { id: "deadlines" as const, label: "Upcoming deadlines", value: snapshot.records.filter((record) => isUpcomingDeadline(record, snapshot.asOf)).length, caption: "Due within the next seven days", icon: "calendar" },
  ];
}

export function selectDashboardRecords(snapshot: DashboardSnapshot, category: DashboardCategory, query = "") {
  const search = query.trim().toLowerCase();
  return snapshot.records.filter((record) => record.category === category && (category !== "deadlines" || isUpcomingDeadline(record, snapshot.asOf)))
    .filter((record) => `${record.title} ${record.description} ${snapshot.projects.find((project) => project.id === record.projectId)?.title ?? ""}`.toLowerCase().includes(search));
}

export function selectAttention(snapshot: DashboardSnapshot, filter: string, projectId: string) {
  return snapshot.attention.filter((item) => {
    const record = snapshot.records.find((entry) => entry.id === item.recordId);
    return record && (filter === "all" || record.category === filter) && (projectId === "all" || record.projectId === projectId);
  }).sort((a, b) => Number(b.priority === "High") - Number(a.priority === "High"));
}

export function dashboardHref(view: DashboardCategory, recordId?: string) {
  const query = new URLSearchParams({ view });
  if (recordId) query.set("record", recordId);
  return `/organization/dashboard?${query.toString()}`;
}

export function formatDashboardDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${value}T12:00:00Z`));
}
