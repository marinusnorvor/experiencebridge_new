import { Suspense } from "react";
import { StudentProjectsView } from "@/features/student/components/student-projects-view";

export const metadata = {
  title: "My Projects | ExperienceBridge",
  description: "View and manage active project workspaces, milestones, and submissions.",
};

export default function StudentProjectsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading projects workspace...</div>}>
      <StudentProjectsView />
    </Suspense>
  );
}
