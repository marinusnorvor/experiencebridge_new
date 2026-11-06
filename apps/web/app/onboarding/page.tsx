import { Suspense } from "react";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";

export const metadata = { title: "Get set up" };

export default function OnboardingPage() {
  return <Suspense><OnboardingWizard /></Suspense>;
}
