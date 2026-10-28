import { notFound } from "next/navigation";
import { StudentDashboardView } from "@/features/student/components/student-dashboard-view";

export const metadata = {
  title: "Student Dashboard (Dev Preview) | ExperienceBridge",
  description: "Local development preview of the student dashboard.",
};

export default function StudentDashboardDevPreviewPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return <StudentDashboardView />;
}
