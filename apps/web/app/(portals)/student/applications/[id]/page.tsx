import { PortalBoundary } from "@/components/layouts/portal-boundary";
import { Suspense } from "react";
import { StudentApplicationDetailView } from "@/features/student/components/student-application-detail-view";

export const metadata = {
  title: "Application Details | ExperienceBridge",
  description: "View application details, terms snapshot, and timeline.",
};

async function ApplicationContent({
  paramsPromise,
}: {
  paramsPromise: Promise<{ id: string }>;
}) {
  const { id } = await paramsPromise;
  return <StudentApplicationDetailView applicationId={id} />;
}

export default function StudentApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <PortalBoundary>{(
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading application details...</div>}>
      <ApplicationContent paramsPromise={params} />
    </Suspense>
  )}</PortalBoundary>;
}
