"use client";

import { DashboardError } from "@/features/organization/components/dashboard/dashboard-states";

export default function OrganizationDashboardError({ reset }: { reset: () => void }) {
  return <DashboardError reset={reset} />;
}
