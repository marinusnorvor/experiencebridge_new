import type { ReactNode } from "react";
import { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";

import PortalsLoading from "./loading";

async function ProtectedPortalBoundary({ children }: { children: ReactNode }) {
  await auth.protect({
    unauthenticatedUrl: "/sign-in",
  });

  return <>{children}</>;
}

export default function PortalsLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<PortalsLoading />}>
      <ProtectedPortalBoundary>{children}</ProtectedPortalBoundary>
    </Suspense>
  );
}
