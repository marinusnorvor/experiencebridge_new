import type { ReactNode } from "react";
import { AuthProvider } from "./auth-provider";
import { isPortalPresentationMode } from "@/lib/auth/portal-presentation";

// Retain the existing sign-in and API diagnostic screens while the local
// presentation shell runs without a Clerk session or browser SDK.
export default function LocalAuthLayout({ children }: { children: ReactNode }) {
  return isPortalPresentationMode() ? (
    <AuthProvider>{children}</AuthProvider>
  ) : children;
}
