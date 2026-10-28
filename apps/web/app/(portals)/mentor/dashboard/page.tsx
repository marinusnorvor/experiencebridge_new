import { MentorDashboard } from "@/features/mentor/components/mentor-dashboard";
import { sampleMentorDashboard } from "@/features/mentor/lib/sample-dashboard-data";

export default function MentorDashboardPage() {
  return <MentorDashboard data={sampleMentorDashboard} state="ready" />;
}
