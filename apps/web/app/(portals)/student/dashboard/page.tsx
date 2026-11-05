import { PortalBoundary } from "@/components/layouts/portal-boundary";
import { Suspense } from "react";
import { StudentDashboardView } from "@/features/student/components/student-dashboard-view";

export const metadata = {
  title: "Student Dashboard | ExperienceBridge",
  description: "Track active projects, pending offers, and verified experience claims.",
};

export default function StudentDashboardPage() {
  return <PortalBoundary>{(
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading student dashboard...</div>}>
      <StudentDashboardView />
    </Suspense>
  )}</PortalBoundary>;
}
