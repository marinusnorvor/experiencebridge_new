import type { DemoProject, ProjectStatus } from "../types/portal";

export const projectStatuses: readonly ProjectStatus[] = ["Draft", "In review", "Published", "Recruiting", "Active", "Completed", "Closed"];
export function selectProjects(projects: readonly DemoProject[], query: string, status: string, sort: string) {
  const search = query.trim().toLowerCase();
  return projects.filter((project) => (status === "All" || project.status === status) && `${project.title} ${project.problem} ${project.skills}`.toLowerCase().includes(search))
    .sort((a, b) => sort === "name" ? a.title.localeCompare(b.title) : a.due.localeCompare(b.due));
}
export const projectHref = (id: string) => `/organization/projects/${encodeURIComponent(id)}`;
