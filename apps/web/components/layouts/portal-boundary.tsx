"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/components/layouts/auth-provider";
import { isPortalPresentationMode } from "@/lib/auth/portal-presentation";
import { portalAccess } from "@/lib/auth/portal-access";
import { AppShell } from "@/components/app/app-shell";
import { NoAccess, ServiceUnavailable } from "@/components/app/no-access";
import { PageSkeleton } from "@/components/ui/primitives";
import { useAdminBadges } from "@/components/app/use-admin-badges";
import { useAdminBase } from "@/components/app/admin-base";
import { ActionCentre } from "@/components/app/action-centre";
import type { Portal } from "@/components/app/portal-nav";
import { OrganizationSwitcher } from "@/features/organization/components/layout/organization-switcher";

function usePortal(): Portal {
  const pathname = usePathname();
  const adminBase = useAdminBase();
  const first = pathname.split("/")[1];
  if (first === "admin" || (adminBase !== "/admin" && pathname.startsWith(adminBase))) return "admin";
  return (["student", "organization", "mentor"].includes(first) ? first : "student") as Portal;
}

function AdminShellWithBadges({ children }: { children: ReactNode }) {
  const badges = useAdminBadges();
  return <AppShell portal="admin" badges={badges} actionCentre={<ActionCentre portal="admin" />}>{children}</AppShell>;
}

/** Page-level gate: the API remains authoritative for every protected record. */
export function PortalBoundary({ children }: { children: ReactNode }) {
  const { state, refresh, user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const portal = usePortal();
  const access = portalAccess(state, user?.effective_contexts ?? [], portal, isPortalPresentationMode());

  useEffect(() => {
    if (access === "unauthenticated" || access === "expired") {
      router.replace(`/sign-in?next=${encodeURIComponent(pathname)}${access === "expired" ? "&expired=1" : ""}`);
    }
  }, [access, pathname, router]);

  if (access === "preview") return <>{children}</>;
  if (access === "loading" || access === "unauthenticated" || access === "expired") {
    return <div className="mx-auto max-w-[1200px] px-4 py-10 sm:px-6"><PageSkeleton /></div>;
  }
  if (access === "unavailable") return <ServiceUnavailable onRetry={() => void refresh()} />;
  if (access === "forbidden") return <AppShell portal="student"><NoAccess portal={portal} /></AppShell>;

  if (portal === "admin") return <AdminShellWithBadges>{children}</AdminShellWithBadges>;
  return (
    <AppShell portal={portal} headerExtra={portal === "organization" ? <OrganizationSwitcher /> : undefined} actionCentre={<ActionCentre portal={portal} />}>
      {children}
    </AppShell>
  );
}
