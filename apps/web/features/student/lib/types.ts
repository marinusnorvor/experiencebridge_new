/**
 * Student Portal Domain Types (STU-01 .. STU-12)
 * Aligned with docs/03-database-api.md and docs/04-ui-ux.md
 */

export type ApplicationStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "shortlisted"
  | "offered"
  | "rejected"
  | "withdrawn";

export type OfferStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "revoked"
  | "expired";

export type ParticipationStatus =
  | "active"
  | "submitted"
  | "under_review"
  | "completed"
  | "withdrawn";

export interface StudentProfileSummary {
  id: string;
  displayName: string;
  email: string;
  isSyntheticDemo: boolean;
}

export interface AssessedSkill {
  id: string;
  name: string;
  level: "demonstrated" | "proficient" | "advanced";
  assessedByMentor: string;
  projectOrigin: string;
  assessedAt: string;
}

export interface SelfReportedSkill {
  id: string;
  name: string;
  proficiencyLevel: "beginner" | "intermediate" | "advanced";
  yearsOfExperience?: string;
  contextOrProject?: string;
}

export interface StudentProfileDetails {
  id: string;
  displayName: string;
  headline: string;
  bio: string;
  institution: string;
  programOfStudy: string;
  graduationYear: string;
  email: string;
  avatarUrl?: string;
  coverUrl?: string;
  weeklyHoursAvailable: number;
  preferredDomains: string[];
  portfolioUrl: string;
  githubUrl: string;
  linkedinUrl: string;
  verificationBadge: {
    isVerified: boolean;
    provider: string;
    verifiedAt: string;
  };
  assessedSkills: AssessedSkill[];
  selfReportedSkills: SelfReportedSkill[];
  isSyntheticDemo: boolean;
}

export interface StudentActionRequiredItem {
  id: string;
  type: "offer_pending" | "submission_due" | "revision_requested";
  title: string;
  description: string;
  projectTitle: string;
  organizationName: string;
  actionLabel: string;
  actionHref: string;
  deadlineText?: string;
  urgency: "high" | "medium";
}

export interface StudentApplicationSummary {
  id: string;
  projectId: string;
  projectTitle: string;
  organizationName: string;
  status: ApplicationStatus;
  appliedAt: string;
  termsVersionViewed: string;
}

export interface StudentActiveProject {
  participationId: string;
  projectId: string;
  projectTitle: string;
  organizationName: string;
  mentorName: string;
  status: ParticipationStatus;
  currentMilestone: string;
  nextMilestoneDue: string;
  progressPercent: number;
}

export interface StudentDecisionAudit {
  id: string;
  authorType: "mentor" | "organization";
  authorName: string;
  projectTitle: string;
  actionText: string;
  excerpt: string;
  createdAt: string;
}

export interface StudentPassportTeaser {
  verifiedClaimsCount: number;
  completedProjectsCount: number;
  mentorObservationsCount: number;
}

export interface StudentDashboardData {
  student: StudentProfileSummary;
  actionItems: StudentActionRequiredItem[];
  applications: StudentApplicationSummary[];
  activeProjects: StudentActiveProject[];
  recentDecisions: StudentDecisionAudit[];
  passportSummary: StudentPassportTeaser;
  isSyntheticDemo: true;
}
