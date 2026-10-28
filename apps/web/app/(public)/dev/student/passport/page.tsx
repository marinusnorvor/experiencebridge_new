import { Suspense } from "react";
import { notFound } from "next/navigation";
import { StudentPassportView } from "@/features/student/components/student-passport-view";

export const metadata = {
  title: "Experience Passport (Dev Preview) | ExperienceBridge",
  description: "Local development preview of the student experience passport.",
};

export default function StudentPassportDevPreviewPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading experience passport...</div>}>
      <StudentPassportView />
    </Suspense>
  );
}
