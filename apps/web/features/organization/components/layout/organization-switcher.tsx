"use client";

import { usePathname, useRouter } from "next/navigation";
import { isPortalPresentationMode } from "@/lib/auth/portal-presentation";
import { useOrganizationDemo } from "../../hooks/organization-demo-context";

/** Organisation picker for members of more than one organisation (moved from the old shell header). */
export function OrganizationSwitcher() {
  const { organizations, orgId, selectOrganization } = useOrganizationDemo();
  const router = useRouter();
  const pathname = usePathname();
  if (isPortalPresentationMode() || organizations.length < 2) return null;
  return (
    <label className="hidden items-center gap-2 text-[13px] text-ink-500 md:flex">
      <span className="sr-only sm:not-sr-only">Organisation</span>
      <select aria-label="Current organisation" className="h-9 max-w-[200px] rounded-lg border border-line bg-surface px-2 text-sm text-ink-900"
        value={orgId ?? ""} disabled={pathname.endsWith("/new") || pathname.endsWith("/edit")}
        onChange={(e) => { router.push("/organization/dashboard"); selectOrganization(e.target.value); }}>
        {organizations.map((org) => <option key={org.id} value={org.id}>{org.display_name}</option>)}
      </select>
    </label>
  );
}
