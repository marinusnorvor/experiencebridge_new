import type { ReactNode } from "react";
import { OrganizationPortalShell } from "@/features/organization";

export const metadata = {
  title: "Organization Portal | ExperienceBridge",
  description: "Manage projects, review student applications, and assess deliverables.",
};

export default function OrganizationPortalLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <OrganizationPortalShell>{children}</OrganizationPortalShell>;
}

