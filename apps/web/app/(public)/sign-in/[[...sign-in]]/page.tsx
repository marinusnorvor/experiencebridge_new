import { Suspense } from "react";
import { AuthForm } from "@/components/layouts/auth-form";

export const metadata = { title: "Sign in" };

export default function Page() {
  return <Suspense><AuthForm mode="login" /></Suspense>;
}
