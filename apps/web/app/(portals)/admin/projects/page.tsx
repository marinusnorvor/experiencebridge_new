import { PortalBoundary } from "@/components/layouts/portal-boundary";
import { AdminProjectsView } from "@/features/admin";

export const metadata = {
  title: "Project Moderation | Admin Portal",
  description: "Independent project terms approval, compensation compliance, and scope inspection.",
};

export default function AdminProjectsPage() {
  return <PortalBoundary>{<AdminProjectsView />}</PortalBoundary>;
}
