import { Suspense } from "react";
import { OrganizationDashboardScreen } from "@/features/organization";
import { DashboardLoading } from "@/features/organization/components/dashboard/dashboard-states";

export const metadata = {
  title: "Organization Dashboard | ExperienceBridge",
  description: "Command center for organization project opportunities, applications, and deliverable reviews.",
};

export default function OrganizationDashboardPage() {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <OrganizationDashboardScreen />
    </Suspense>
  );
}
