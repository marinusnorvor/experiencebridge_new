import { Suspense } from "react";
import { AuthForm } from "@/components/layouts/auth-form";

export const metadata = { title: "Reset your password" };

export default function Page() {
  return <Suspense><AuthForm mode="forgot" /></Suspense>;
}
