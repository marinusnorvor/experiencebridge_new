import { PortalBoundary } from "@/components/layouts/portal-boundary";
import { AdminOrganizationsView } from "@/features/admin";

export const metadata = {
  title: "Organization Verification | Admin Portal",
  description: "Independent platform verification and partner organization directory.",
};

export default function AdminOrganizationsPage() {
  return <PortalBoundary>{<AdminOrganizationsView />}</PortalBoundary>;
}
