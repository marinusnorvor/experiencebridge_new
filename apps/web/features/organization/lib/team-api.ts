import { requireData, type PortalApi } from "../../../lib/api/use-portal-resource";
export async function loadProjectTeam(api: PortalApi, projectId: string) {
  const project = requireData(await api.getProject(projectId));
  const participations = requireData(await api.getProjectParticipations(projectId));
  const directory = await api.getOrganizationMentors(project.organization_id);
  const mentors = directory.status === 403 || directory.status === 404 ? [] : requireData(directory);
  const assignments = (await Promise.all(participations.map(async part => requireData(await api.getParticipationAssignments(part.id))))).flat();
  return { project, participations, mentors, assignments, canManage: directory.status !== 403 && directory.status !== 404 };
}
