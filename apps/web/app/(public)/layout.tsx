import type { ReactNode } from "react";
import { SiteHeader } from "@/components/layouts/site-header";

/** Public website and auth pages carry the marketing header; signed-in portals use the AppShell. */
export default function PublicLayout({ children }: { children: ReactNode }) {
  return <><SiteHeader />{children}</>;
}
