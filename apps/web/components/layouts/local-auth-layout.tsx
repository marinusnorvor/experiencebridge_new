import type { ReactNode } from "react";
import { AuthProvider } from "./auth-provider";
import { isPortalPresentationMode } from "@/lib/auth/portal-presentation";

// Keep authentication state available in the explicitly enabled local preview shell.
export default function LocalAuthLayout({ children }: { children: ReactNode }) {
  return isPortalPresentationMode() ? (
    <AuthProvider>{children}</AuthProvider>
  ) : children;
}
