import type { ReactNode } from "react";
import { AdminShell } from "@/features/admin";

export const metadata = {
  title: "Admin & Governance Portal | ExperienceBridge",
  description: "ExperienceBridge independent platform governance, moderation, and audit oversight.",
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
