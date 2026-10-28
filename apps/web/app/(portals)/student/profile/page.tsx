import { StudentProfileView } from "@/features/student/components/student-profile-view";

export const metadata = {
  title: "Student Profile & Skills | ExperienceBridge",
  description: "Manage your student profile, academic background, and skill claims.",
};

export default function StudentProfilePage() {
  return <StudentProfileView />;
}
