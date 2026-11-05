import { PortalBoundary } from "@/components/layouts/portal-boundary";
import { AdminDashboardView } from "@/features/admin";

export const metadata = {
  title: "Admin Dashboard | ExperienceBridge",
  description: "Platform moderation, KPI metrics, and oversight for organizations, projects, and mentors.",
};

export default function AdminDashboardPage() {
  return <PortalBoundary>{<AdminDashboardView />}</PortalBoundary>;
}
