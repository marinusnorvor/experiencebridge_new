import { PortalBoundary } from "@/components/layouts/portal-boundary";
import { AdminApplicationsView } from "@/features/admin";

export const metadata = {
  title: "Applications Oversight | Admin Portal",
  description: "Cross-organization student application and selection oversight.",
};

export default function AdminApplicationsPage() {
  return <PortalBoundary>{<AdminApplicationsView />}</PortalBoundary>;
}
