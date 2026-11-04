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
  | "accepted"
  | "rejected"
  | "withdrawn";

export type OfferStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "revoked"
  | "expired";

export type ParticipationStatus =
  | "partially_completed"
  | "cancelled"
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

export interface TopProjectItem {
  id: string;
  title: string;
  role: string;
  organization?: string;
  isVerifiedOrgProject?: boolean;
  timeframe: string;
  summary: string;
  technologies: string[];
  projectUrl?: string;
  githubUrl?: string;
  participationId?: string;
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
  topProjects?: TopProjectItem[];
  isSyntheticDemo: boolean;
  profileCompletionPercentage?: number;
  userId?: string;
}

export type StudentProfile = StudentProfileDetails;

export interface StudentActionRequiredItem {
  id: string;
  type: "offer_pending" | "submission_due" | "revision_requested";
  title: string;
  description?: string;
  projectTitle?: string;
  organizationName: string;
  actionLabel?: string;
  actionHref?: string;
  deadlineText?: string;
  urgency?: "high" | "medium";
  deadline?: string;
  ctaLabel?: string;
  ctaHref?: string;
  priority?: "urgent" | "normal";
}

export interface ApplicationTimelineEvent {
  id: string;
  status: ApplicationStatus;
  title: string;
  description: string;
  timestamp: string;
}

export interface StudentApplicationDetails {
  offerStatus?: string;
  id: string;
  projectId: string;
  projectTitle: string;
  organizationName: string;
  organizationVerified: boolean;
  status: ApplicationStatus;
  appliedAt: string;
  offerDeadline?: string;
  motivationStatement: string;
  declaredSkills: string[];
  externalLinks: { label: string; url: string }[];
  observedTermsSnapshot: {
    termsVersionId: string;
    weeklyHours: number;
    durationWeeks: number;
    ipConditions: string;
    confidentialitySummary: string;
    snapshotDate: string;
  };
  timeline: ApplicationTimelineEvent[];
  rejectionReason?: string;
  withdrawalReason?: string;
  participationId?: string;
  isSyntheticDemo: boolean;
}

export interface StudentApplicationSummary {
  id: string;
  projectId: string;
  projectTitle: string;
  organizationName: string;
  status: ApplicationStatus;
  appliedAt: string;
  termsVersionViewed: string;
  offerStatus?: string;
  offerDeadline?: string;
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
  weeklyHours?: number;
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

export interface ProjectMilestone {
  id: string;
  order: number;
  title: string;
  description: string;
  deadline: string;
  status: "completed" | "in_progress" | "upcoming";
  deliverables: string[];
  acceptanceCriteria: string[];
  submissionId?: string;
}

export interface SubmissionReview {
  id: string;
  reviewerType: "mentor" | "organization";
  reviewerName: string;
  status: "approved" | "changes_requested" | "under_review" | "reviewed" | "revision_requested" | "unable_to_assess" | "accepted" | "revisions_requested" | "rejected";
  feedback: string;
  reviewedAt: string;
}

export interface MilestoneSubmission {
  id: string;
  milestoneId: string;
  milestoneTitle: string;
  revisionNumber: number;
  summary: string;
  contributionStatement: string;
  links: { label: string; url: string }[];
  status: "draft" | "submitted" | "revision_requested" | "accepted" | "withdrawn";
  submittedAt?: string;
  mentorReview?: SubmissionReview;
  organizationDecision?: SubmissionReview;
}

export interface AgreedTermsSnapshot {
  termsVersionId: string;
  termsHash: string;
  compensationSummary?: string;
  weeklyHours: number;
  durationWeeks: number;
  ipConditions: string;
  confidentialitySummary: string;
  acceptedAt: string;
}

export interface ParticipationWorkspaceDetails {
  rowVersion?: number;
  canSubmit?: boolean;
  participationId: string;
  projectId: string;
  projectTitle: string;
  organizationName: string;
  organizationContact: string;
  organizationVerificationStatus: string;
  mentor: {
    name: string;
    title: string;
    status: "accepted" | "proposed" | "pending";
    email?: string;
  };
  status: ParticipationStatus;
  startedAt: string;
  targetCompletionDate: string;
  progressPercent: number;
  currentMilestoneId: string;
  repositoryUrl?: string;
  designUrl?: string;
  documentationUrl?: string;
  milestones: ProjectMilestone[];
  submissions: MilestoneSubmission[];
  agreedTerms: AgreedTermsSnapshot;
  isSyntheticDemo: boolean;
}

export interface StudentParticipationSummaryItem {
  participationId: string;
  projectId: string;
  projectTitle: string;
  organizationName: string;
  organizationVerified: boolean;
  mentorName: string;
  mentorStatus: "accepted" | "proposed" | "pending";
  status: ParticipationStatus;
  currentMilestone: string;
  nextMilestoneDue: string;
  progressPercent: number;
  completedMilestonesCount: number;
  totalMilestonesCount: number;
  compensationSummary?: string;
  weeklyHours: number;
}

export type EvidenceTier =
  | "identity_checked"
  | "work_submitted"
  | "mentor_reviewed"
  | "deliverable_accepted";

export interface PassportProjectAssertion {
  id: string;
  projectId: string;
  participationId: string;
  projectTitle: string;
  organizationName: string;
  organizationVerified: boolean;
  timeframe: string;
  contributionStatement: string;
  deliverables: string[];
  evidenceLinks: { label: string; url: string }[];
  evidenceTiers: {
    identityChecked: boolean;
    workSubmitted: boolean;
    mentorReviewed: boolean;
    deliverableAccepted: boolean;
  };
  mentorReview: {
    reviewerName: string;
    reviewerTitle: string;
    reviewedAt: string;
    feedbackExcerpt: string;
    rubricCriteriaObserved: string[];
  } | null;
  organizationDecision: {
    reviewerName: string;
    decision: "accepted" | "provisional" | "revision_requested";
    decidedAt: string;
    formalStatement: string;
  } | null;
  disputeState?: "none" | "under_review" | "resolved";
  assertionHash: string;
}

export interface StudentPassportDetails {
  student: StudentProfileSummary;
  overallAssertionHash: string;
  issuedAt: string;
  lastUpdated: string;
  assessedSkills: AssessedSkill[];
  selfReportedSkills: SelfReportedSkill[];
  projectAssertions: PassportProjectAssertion[];
  isSyntheticDemo: boolean;
}


