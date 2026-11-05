import { PortalBoundary } from "@/components/layouts/portal-boundary";
import { Suspense } from "react";
import { StudentPassportView } from "@/features/student/components/student-passport-view";

export const metadata = {
  title: "Experience Passport | ExperienceBridge",
  description: "Verifiable record of demonstrated skills, mentor rubric assessments, and accepted deliverables.",
};

export default function StudentPassportPage() {
  return <PortalBoundary>{(
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading experience passport...</div>}>
      <StudentPassportView />
    </Suspense>
  )}</PortalBoundary>;
}
