import { StudentDashboardView } from "@/features/student/components/student-dashboard-view";

export const metadata = {
  title: "Student Dashboard | ExperienceBridge",
  description: "View active projects, applications, and verified experience passport.",
};

export default function StudentDashboardPage() {
  return <StudentDashboardView />;
}
