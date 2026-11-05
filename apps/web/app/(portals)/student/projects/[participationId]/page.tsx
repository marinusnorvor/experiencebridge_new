import { PortalBoundary } from "@/components/layouts/portal-boundary";
import { Suspense } from "react";
import { StudentParticipationWorkspaceView } from "@/features/student/components/student-participation-workspace-view";

export const metadata = {
  title: "Project Participation Workspace | ExperienceBridge",
  description: "Milestone deliverables, submissions, and mentor reviews.",
};

async function WorkspaceContent({
  paramsPromise,
}: {
  paramsPromise: Promise<{ participationId: string }>;
}) {
  const { participationId } = await paramsPromise;
  return <StudentParticipationWorkspaceView participationId={participationId} />;
}

export default function StudentProjectWorkspacePage({
  params,
}: {
  params: Promise<{ participationId: string }>;
}) {
  return <PortalBoundary>{(
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading project workspace...</div>}>
      <WorkspaceContent paramsPromise={params} />
    </Suspense>
  )}</PortalBoundary>;
}
