import type { ReactNode } from "react";
import { ClerkProvider } from "@clerk/nextjs";
import {
  experienceBridgeClerkAppearance,
  getClerkPublishableKey,
} from "@/lib/auth/clerk-config";

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider
      publishableKey={getClerkPublishableKey()}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      afterSignOutUrl="/"
      appearance={experienceBridgeClerkAppearance}
    >
      {children}
    </ClerkProvider>
  );
}
