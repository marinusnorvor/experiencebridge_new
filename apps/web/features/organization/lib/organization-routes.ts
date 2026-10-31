import type { OrganizationNavItem } from "../types";

export const ORGANIZATION_NAV_ITEMS: readonly OrganizationNavItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    href: "/organization/dashboard",
    screenId: "ORG-01",
    status: "implemented",
    checkpoint: "O01/O02",
    description: "Command center, metric KPIs, and attention queue",
  },
  {
    id: "projects",
    label: "My Projects",
    href: "/organization/projects",
    screenId: "ORG-02",
    status: "implemented",
    checkpoint: "O03",
    description: "Project pipeline, status filters, and project summaries",
  },
  {
    id: "create-project",
    label: "Create Project",
    href: "/organization/projects/new",
    screenId: "ORG-03",
    status: "implemented",
    checkpoint: "O04",
    description: "Five-step guided project creation wizard",
  },
  {
    id: "applications",
    label: "Applications",
    href: "/organization/applications",
    screenId: "ORG-04",
    status: "implemented",
    checkpoint: "O05",
    description: "Candidate pipeline, candidate review, and offer management",
  },
  {
    id: "reviews",
    label: "Reviews",
    href: "/organization/reviews",
    screenId: "ORG-07",
    status: "implemented",
    checkpoint: "O08",
    description: "Student deliverable review and acceptance decisions",
  },
  {
    id: "messages",
    label: "Messages",
    href: "/organization/messages",
    screenId: "ORG-08",
    status: "implemented",
    checkpoint: "O09",
    description: "Project-scoped team discussions and notifications",
  },
  {
    id: "settings",
    label: "Settings",
    href: "/organization/settings",
    screenId: "ORG-09",
    status: "implemented",
    checkpoint: "O09",
    description: "Organization profile, verification status, and team",
  },
] as const;

export function getNavItemByPath(pathname: string): OrganizationNavItem | undefined {
  const normalized = pathname.endsWith("/") && pathname.length > 1 ? pathname.slice(0, -1) : pathname;
  return ORGANIZATION_NAV_ITEMS.find((item) => item.href === normalized);
}

/** Most specific section wins, so the wizard never highlights My Projects. */
export function getActiveOrganizationNavItem(pathname: string): OrganizationNavItem | undefined {
  if (pathname === "/organization" || pathname === "/organization/") return ORGANIZATION_NAV_ITEMS[0];
  return [...ORGANIZATION_NAV_ITEMS]
    .sort((a, b) => b.href.length - a.href.length)
    .find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
}

