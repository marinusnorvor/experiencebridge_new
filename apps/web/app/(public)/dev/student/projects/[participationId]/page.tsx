import { Suspense } from "react";
import { notFound } from "next/navigation";
import { StudentParticipationWorkspaceView } from "@/features/student/components/student-participation-workspace-view";

export const metadata = {
  title: "Project Workspace (Dev Preview) | ExperienceBridge",
  description: "Local development preview of the project participation workspace.",
};

async function WorkspaceContent({
  paramsPromise,
}: {
  paramsPromise: Promise<{ participationId: string }>;
}) {
  const { participationId } = await paramsPromise;
  return <StudentParticipationWorkspaceView participationId={participationId} />;
}

export default function StudentProjectWorkspaceDevPreviewPage({
  params,
}: {
  params: Promise<{ participationId: string }>;
}) {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading project workspace...</div>}>
      <WorkspaceContent paramsPromise={params} />
    </Suspense>
  );
}
