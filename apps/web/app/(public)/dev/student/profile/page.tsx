import { notFound } from "next/navigation";
import { StudentProfileView } from "@/features/student/components/student-profile-view";

export const metadata = {
  title: "Student Profile (Dev Preview) | ExperienceBridge",
  description: "Local development preview of the student profile interface.",
};

export default function StudentProfileDevPreviewPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return <StudentProfileView />;
}
