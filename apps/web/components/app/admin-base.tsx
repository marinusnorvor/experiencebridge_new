"use client";

import { createContext, useContext, type ReactNode } from "react";

/**
 * The unlisted admin base path (e.g. "/k3f9…"). Provided by the admin layout from a header the
 * proxy sets on rewritten requests. Hiding the path is NOT the security boundary: every admin API
 * endpoint keeps its server-side platform_admin check.
 */
const AdminBaseContext = createContext<string>("/admin");

export function AdminBaseProvider({ base, children }: { base: string; children: ReactNode }) {
  return <AdminBaseContext.Provider value={base}>{children}</AdminBaseContext.Provider>;
}

export const useAdminBase = () => useContext(AdminBaseContext);

/** Map an internal "/admin/..." href onto the unlisted base. */
export function adminHref(base: string, href: string): string {
  return href.startsWith("/admin") ? base + href.slice("/admin".length) : href;
}
