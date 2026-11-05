import { PortalBoundary } from "@/components/layouts/portal-boundary";
import { AdminParticipationsView } from "@/features/admin";

export const metadata = {
  title: "Workspaces & Participations | Admin Portal",
  description: "Live project workspace progress, milestone reviews, and completion tracking.",
};

export default function AdminParticipationsPage() {
  return <PortalBoundary>{<AdminParticipationsView />}</PortalBoundary>;
}
