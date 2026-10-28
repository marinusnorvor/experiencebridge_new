import { notFound, redirect } from "next/navigation";

export default function StudentDevPreviewPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  redirect("/dev/student/dashboard");
}
