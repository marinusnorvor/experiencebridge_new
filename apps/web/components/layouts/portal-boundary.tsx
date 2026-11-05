"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useAuth } from "@/components/layouts/auth-provider";
import { isPortalPresentationMode } from "@/lib/auth/portal-presentation";
import { portalAccess } from "@/lib/auth/portal-access";
import { AdminShell } from "@/features/admin";
import { OrganizationPortalShell } from "@/features/organization";

function portalContent(portal: string, children: ReactNode) {
  if (portal === "admin") return <AdminShell>{children}</AdminShell>;
  if (portal === "organization") return <OrganizationPortalShell>{children}</OrganizationPortalShell>;
  return children;
}

/** Page-level gate: the API remains authoritative for every protected record. */
export function PortalBoundary({ children }: { children: ReactNode }) {
  const { state, refresh, user } = useAuth();
  const pathname = usePathname();
  const portal = pathname.split("/")[1];
  const access = portalAccess(state, user?.effective_contexts ?? [], portal, isPortalPresentationMode());
  if (access === "preview") return <><aside>Local interface development · Sample data only.</aside>{portalContent(portal, children)}</>;
  if (access === "loading") return <main role="status">Checking your session…</main>;
  if (access === "unauthenticated" || access === "expired") return <main><p>Sign in to continue.</p><Link href="/sign-in">Sign in</Link></main>;
  if (access === "forbidden") return <main role="alert">{state === "authenticated" ? "Your account does not have access to this portal." : "Access is denied for this account."}</main>;
  if (access === "unavailable") return <main role="alert">Authentication is unavailable. <button onClick={() => void refresh()}>Try again</button></main>;
  return <>{portalContent(portal, children)}</>;
}
