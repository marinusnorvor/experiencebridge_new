import { PortalBoundary } from "@/components/layouts/portal-boundary";
import { Suspense } from "react";
import { StudentPassportView } from "@/features/student/components/student-passport-view";
import { ExperiencePassport } from "@/components/passport/experience-passport";
import { PageSkeleton } from "@/components/ui/primitives";
import { isPortalPresentationMode } from "@/lib/auth/portal-presentation";

export const metadata = {
  title: "Experience Passport",
  description: "Your verified record of real projects, mentor reviews and accepted work.",
};

export default function StudentPassportPage() {
  return <PortalBoundary>{(
    <Suspense fallback={<PageSkeleton />}>
      {isPortalPresentationMode() ? <StudentPassportView /> : <ExperiencePassport />}
    </Suspense>
  )}</PortalBoundary>;
}
