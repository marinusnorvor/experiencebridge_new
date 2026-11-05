// This page is intentionally gated while the client loads authenticated organization records.
export const instant = false;

import { PortalBoundary } from "@/components/layouts/portal-boundary";
import { Suspense } from "react";
import { OrganizationDashboardScreen } from "@/features/organization";
import { DashboardLoading } from "@/features/organization/components/dashboard/dashboard-states";

export const metadata = {
  title: "Organization Dashboard | ExperienceBridge",
  description: "Command center for organization project opportunities, applications, and deliverable reviews.",
};

export default function OrganizationDashboardPage() {
  return <PortalBoundary>{(
    <Suspense fallback={<DashboardLoading />}>
      <OrganizationDashboardScreen />
    </Suspense>
  )}</PortalBoundary>;
}
