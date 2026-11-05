import { PortalBoundary } from "@/components/layouts/portal-boundary";
import { AdminAuditView } from "@/features/admin";

export const metadata = {
  title: "Audit History | Admin Portal",
  description: "Immutable compliance and operational audit trail with attributed actor records.",
};

export default function AdminAuditPage() {
  return <PortalBoundary>{<AdminAuditView />}</PortalBoundary>;
}
