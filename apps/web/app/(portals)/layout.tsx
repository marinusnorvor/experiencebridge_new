import type { ReactNode } from "react";
import { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";
import { isPortalPresentationMode } from "@/lib/auth/portal-presentation";

import PortalsLoading from "./loading";

async function ProtectedPortalBoundary({ children }: { children: ReactNode }) {
  await auth.protect({
    unauthenticatedUrl: "/sign-in",
  });

  return <>{children}</>;
}

export default function PortalsLayout({ children }: { children: ReactNode }) {
  if (isPortalPresentationMode()) {
    return (
      <>
        <aside className="border-b border-amber-200 bg-amber-50 px-6 py-3 text-sm text-amber-950">
          Local interface development · Sample data only. Changes stay in this
          browser; private records and privileged actions are unavailable.
        </aside>
        {children}
      </>
    );
  }
  return (
    <Suspense fallback={<PortalsLoading />}>
      <ProtectedPortalBoundary>{children}</ProtectedPortalBoundary>
    </Suspense>
  );
}
