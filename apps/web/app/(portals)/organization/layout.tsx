import type { ReactNode } from "react";
import { OrganizationDemoProvider } from "@/features/organization/hooks/organization-demo-context";

export const metadata = {
  title: "Organization Portal | ExperienceBridge",
  description: "Manage projects, review student applications, and assess deliverables.",
};

export default function OrganizationPortalLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <OrganizationDemoProvider>{children}</OrganizationDemoProvider>;
}

