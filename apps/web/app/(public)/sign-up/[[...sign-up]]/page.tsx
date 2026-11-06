import { Suspense } from "react";
import { AuthForm } from "@/components/layouts/auth-form";

export const metadata = { title: "Create your account" };

export default function Page() {
  return <Suspense><AuthForm mode="register" /></Suspense>;
}
