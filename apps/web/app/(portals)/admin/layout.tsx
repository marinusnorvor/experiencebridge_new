import type { ReactNode } from "react";
import { headers } from "next/headers";
import { AdminBaseProvider } from "@/components/app/admin-base";

export const metadata = { title: "Admin", robots: { index: false, follow: false } };

/** The proxy tells us the unlisted base path so in-app links keep using it. */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const base = (await headers()).get("x-eb-admin-base") ?? "/admin";
  return <AdminBaseProvider base={/^\/[A-Za-z0-9_-]+$/.test(base) ? base : "/admin"}>{children}</AdminBaseProvider>;
}
