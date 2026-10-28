import { Suspense } from "react";
import { notFound } from "next/navigation";
import { StudentApplicationsView } from "@/features/student/components/student-applications-view";

export const metadata = {
  title: "My Applications (Dev Preview) | ExperienceBridge",
  description: "Local development preview of the student applications interface.",
};

export default function StudentApplicationsDevPreviewPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading applications...</div>}>
      <StudentApplicationsView />
    </Suspense>
  );
}
