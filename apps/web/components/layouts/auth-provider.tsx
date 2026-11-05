"use client";

import { useMemo, type ReactNode } from "react";
import { ClerkProvider, useAuth } from "@clerk/nextjs";
import {
  experienceBridgeClerkAppearance,
  getClerkPublishableKey,
} from "@/lib/auth/clerk-config";
import { PortalAuthContext, type PortalAuthContextValue } from "@/lib/api/portal-api";

function ClerkPortalAuthBridge({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, getToken } = useAuth();

  const value = useMemo<PortalAuthContextValue>(
    () => ({
      isLoaded: Boolean(isLoaded),
      isSignedIn: Boolean(isSignedIn),
      getToken: async () => (isSignedIn ? await getToken() : null),
    }),
    [isLoaded, isSignedIn, getToken]
  );

  return (
    <PortalAuthContext.Provider value={value}>
      {children}
    </PortalAuthContext.Provider>
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider
      publishableKey={getClerkPublishableKey()}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      afterSignOutUrl="/"
      appearance={experienceBridgeClerkAppearance}
    >
      <ClerkPortalAuthBridge>{children}</ClerkPortalAuthBridge>
    </ClerkProvider>
  );
}
