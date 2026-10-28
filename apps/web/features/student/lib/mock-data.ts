import type { StudentDashboardData, StudentProfileDetails } from "./types";

/**
 * Synthetic preview fixture for student dashboard (STU-01).
 * Explicitly marked as synthetic demo data pursuant to AGENTS.md Invariant 3.
 */
export const syntheticActiveStudentDashboard: StudentDashboardData = {
  isSyntheticDemo: true,
  student: {
    id: "demo-student-001",
    displayName: "Stella (Demo Student)",
    email: "stella@demo.experiencebridge.internal",
    isSyntheticDemo: true,
  },
  actionItems: [
    {
      id: "action-1",
      type: "offer_pending",
      title: "Offer Received: Terms Review Required",
      description: "SunPower Labs has extended an offer for the Solar Microgrid Telemetry project. Review compensation and IP terms before the offer expires.",
      projectTitle: "Solar Microgrid Telemetry",
      organizationName: "SunPower Labs (Demo)",
      actionLabel: "Review Offer Terms",
      actionHref: "/student/offers/demo-offer-101",
      deadlineText: "Expires in 36 hours",
      urgency: "high",
    },
    {
      id: "action-2",
      type: "revision_requested",
      title: "Mentor Requested Revisions on Milestone 1",
      description: "Dr. K. Mensah reviewed your architecture submission and requested an updated database ERD before milestone approval.",
      projectTitle: "Community Health Tracker",
      organizationName: "HealthNet Africa (Demo)",
      actionLabel: "View Feedback & Revise",
      actionHref: "/student/projects/part-healthnet-01/submit",
      deadlineText: "Due within 4 days",
      urgency: "medium",
    },
  ],
  applications: [
    {
      id: "app-101",
      projectId: "proj-sunpower",
      projectTitle: "Solar Microgrid Telemetry",
      organizationName: "SunPower Labs (Demo)",
      status: "offered",
      appliedAt: "2026-10-22",
      termsVersionViewed: "terms-v1.2",
    },
    {
      id: "app-102",
      projectId: "proj-agroyield",
      projectTitle: "AgriTech Cold Chain Logger",
      organizationName: "AgroYield Africa (Demo)",
      status: "shortlisted",
      appliedAt: "2026-10-24",
      termsVersionViewed: "terms-v1.1",
    },
    {
      id: "app-103",
      projectId: "proj-payflow",
      projectTitle: "Mobile Money Escrow Prototype",
      organizationName: "PayFlow Ghana (Demo)",
      status: "under_review",
      appliedAt: "2026-10-26",
      termsVersionViewed: "terms-v1.0",
    },
  ],
  activeProjects: [
    {
      participationId: "part-healthnet-01",
      projectId: "proj-healthnet",
      projectTitle: "Community Health Tracker",
      organizationName: "HealthNet Africa (Demo)",
      mentorName: "Dr. K. Mensah (Demo Mentor)",
      status: "active",
      currentMilestone: "Milestone 2: Offline-First Sync Layer",
      nextMilestoneDue: "Nov 15, 2026",
      progressPercent: 45,
    },
  ],
  recentDecisions: [
    {
      id: "dec-1",
      authorType: "organization",
      authorName: "HealthNet Africa (Organization)",
      projectTitle: "Community Health Tracker",
      actionText: "Accepted Milestone 1 Scope & Setup",
      excerpt: "The development repository and initial wireframes align with requirements. Approved to proceed to offline sync.",
      createdAt: "Yesterday at 14:30",
    },
    {
      id: "dec-2",
      authorType: "mentor",
      authorName: "Dr. K. Mensah (Assigned Mentor)",
      projectTitle: "Community Health Tracker",
      actionText: "Technical Rubric Review: Milestone 1",
      excerpt: "Clean TypeScript structure and modular components. Please document the cache invalidation strategy.",
      createdAt: "2 days ago",
    },
  ],
  passportSummary: {
    verifiedClaimsCount: 4,
    completedProjectsCount: 1,
    mentorObservationsCount: 3,
  },
};

/**
 * Empty state fixture fulfilling UX-STU-01:
 * "You don't have an active project yet. Browse approved opportunities to get started."
 */
export const syntheticEmptyStudentDashboard: StudentDashboardData = {
  isSyntheticDemo: true,
  student: {
    id: "demo-student-new",
    displayName: "Stella (New Student)",
    email: "stella@demo.experiencebridge.internal",
    isSyntheticDemo: true,
  },
  actionItems: [],
  applications: [],
  activeProjects: [],
  recentDecisions: [],
  passportSummary: {
    verifiedClaimsCount: 0,
    completedProjectsCount: 0,
    mentorObservationsCount: 0,
  },
};

/**
 * Synthetic preview fixture for student profile (STU-02).
 * Fulfills docs/04-ui-ux.md §6.2 requirements:
 * - Distinguish self-reported from assessed skills
 * - Read-only institutional verification marker
 * - Private-by-default portfolio & availability
 */
export const syntheticStudentProfile: StudentProfileDetails = {
  isSyntheticDemo: true,
  id: "demo-student-001",
  displayName: "Stella Appiok",
  headline: "Computer Engineering Student · Frontend & Distributed Systems Enthusiast",
  bio: "Passionate about building responsive, accessible, and user-centric web applications. Currently building offline-first web technologies and reliable platforms for emerging markets.",
  institution: "Ashesi University",
  programOfStudy: "B.Sc. Computer Engineering",
  graduationYear: "2027",
  email: "stella@demo.experiencebridge.internal",
  weeklyHoursAvailable: 15,
  preferredDomains: [
    "Frontend Development",
    "Fullstack Web",
    "UI/UX Architecture",
    "Distributed Systems",
  ],
  portfolioUrl: "https://stellaappiok.dev",
  githubUrl: "https://github.com/stellaappiok",
  linkedinUrl: "https://linkedin.com/in/stella-appiok",
  verificationBadge: {
    isVerified: true,
    provider: "Institutional Email Verification (Ashesi University)",
    verifiedAt: "Oct 2026",
  },
  assessedSkills: [
    {
      id: "skill-react",
      name: "React 19 & Next.js App Router",
      level: "proficient",
      assessedByMentor: "Dr. K. Mensah (Assigned Mentor)",
      projectOrigin: "Community Health Tracker (Milestone 1)",
      assessedAt: "Oct 27, 2026",
    },
    {
      id: "skill-ts",
      name: "TypeScript Strict Typing",
      level: "proficient",
      assessedByMentor: "Dr. K. Mensah (Assigned Mentor)",
      projectOrigin: "Community Health Tracker (Milestone 1)",
      assessedAt: "Oct 27, 2026",
    },
    {
      id: "skill-rest",
      name: "REST API Integration & Error Handling",
      level: "demonstrated",
      assessedByMentor: "Dr. K. Mensah (Assigned Mentor)",
      projectOrigin: "Community Health Tracker (Milestone 1)",
      assessedAt: "Oct 26, 2026",
    },
  ],
  selfReportedSkills: [
    {
      id: "self-tailwind",
      name: "Tailwind CSS v4",
      proficiencyLevel: "intermediate",
      yearsOfExperience: "1-2 years",
      contextOrProject: "Built multiple responsive web applications, custom themes, and design tokens.",
    },
    {
      id: "self-git",
      name: "Git Branching Workflows",
      proficiencyLevel: "advanced",
      yearsOfExperience: "2+ years",
      contextOrProject: "Feature branching, PR code reviews, resolving conflicts, and managing staging releases.",
    },
    {
      id: "self-python",
      name: "Python / FastAPI",
      proficiencyLevel: "intermediate",
      yearsOfExperience: "1 year",
      contextOrProject: "Developed REST API endpoints with Pydantic schemas, dependency injection, and JWT auth.",
    },
    {
      id: "self-figma",
      name: "UI Prototyping (Figma)",
      proficiencyLevel: "beginner",
      yearsOfExperience: "< 1 year",
      contextOrProject: "Designed high-fidelity mockups, responsive grid systems, and interactive student flows.",
    },
  ],
};
