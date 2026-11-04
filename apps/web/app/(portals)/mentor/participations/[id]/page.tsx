import { Suspense } from "react";
import { MentorParticipationConnected } from "@/features/mentor/components/mentor-record-connected";
type Props = { params: Promise<{ id: string }> };
async function Record({ params }: Props) {
  const { id } = await params;
  return <MentorParticipationConnected id={id} />;
}
export default function Page(props: Props) {
  return <Suspense fallback={<p role="status" className="p-8">Loading records...</p>}><Record {...props} /></Suspense>;
}
