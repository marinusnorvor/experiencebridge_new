import { Suspense } from "react";
import { notFound } from "next/navigation";
import { StudentApplicationDetailView } from "@/features/student/components/student-application-detail-view";

export const metadata = {
  title: "Application Details (Dev Preview) | ExperienceBridge",
  description: "Local development preview of application details, terms snapshot, and timeline.",
};

async function ApplicationContent({
  paramsPromise,
}: {
  paramsPromise: Promise<{ id: string }>;
}) {
  const { id } = await paramsPromise;
  return <StudentApplicationDetailView applicationId={id} />;
}

export default function StudentApplicationDetailDevPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading application details...</div>}>
      <ApplicationContent paramsPromise={params} />
    </Suspense>
  );
}
