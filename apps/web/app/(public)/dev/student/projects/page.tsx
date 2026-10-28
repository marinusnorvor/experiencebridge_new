import { Suspense } from "react";
import { notFound } from "next/navigation";
import { StudentProjectsView } from "@/features/student/components/student-projects-view";

export const metadata = {
  title: "My Projects (Dev Preview) | ExperienceBridge",
  description: "Local development preview of the student projects interface.",
};

export default function StudentProjectsDevPreviewPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading projects workspace...</div>}>
      <StudentProjectsView />
    </Suspense>
  );
}
