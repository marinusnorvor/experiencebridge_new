import { PortalBoundary } from "@/components/layouts/portal-boundary";
import { MentorDashboardConnected } from "@/features/mentor/components/mentor-dashboard-connected";

export const metadata = {
  title: "Mentor Dashboard | ExperienceBridge",
  description: "Manage mentor assignments, evaluate student deliverables, and submit rubrics.",
};

export default function MentorDashboardPage() {
  return <PortalBoundary>{<MentorDashboardConnected />}</PortalBoundary>;
}
