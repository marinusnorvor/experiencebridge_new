import { Suspense } from "react";
import { StudentApplicationsView } from "@/features/student/components/student-applications-view";

export const metadata = {
  title: "My Applications | ExperienceBridge",
  description: "Track project applications, review offers, and monitor screening status.",
};

export default function StudentApplicationsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading applications...</div>}>
      <StudentApplicationsView />
    </Suspense>
  );
}
