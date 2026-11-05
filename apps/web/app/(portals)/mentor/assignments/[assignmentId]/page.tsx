import { PortalBoundary } from "@/components/layouts/portal-boundary";
import { Suspense } from "react";
import { MentorAssignmentConnected } from "@/features/mentor/components/mentor-record-connected";
type Props = { params: Promise<{ assignmentId: string }> };
async function Record({ params }: Props) {
  const { assignmentId } = await params;
  return <MentorAssignmentConnected id={assignmentId} />;
}
export default function Page(props: Props) {
  return <PortalBoundary>{<Suspense fallback={<p role="status" className="p-8">Loading records...</p>}><Record {...props} /></Suspense>}</PortalBoundary>;
}
