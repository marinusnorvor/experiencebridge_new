export interface OrganizationNavItem {
  id: string;
  label: string;
  href: string;
  screenId: string;
  status: "implemented" | "planned";
  checkpoint?: string;
  description: string;
}

export interface OrganizationDashboardSummary {
  organizationName: string;
  isSynthetic: boolean;
  verificationStatus: "verified" | "pending" | "changes_requested";
  activeProjectsCount: number;
  newApplicationsCount: number;
  pendingReviewsCount: number;
  upcomingDeadlinesCount: number;
}

