import type {
  ParticipationWorkspaceDetails,
  StudentDashboardData,
  StudentParticipationSummaryItem,
  StudentProfileDetails,
} from "./types";

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
  topProjects: [
    {
      id: "top-proj-1",
      title: "Community Health Tracker",
      role: "Frontend & Offline Sync Systems Lead",
      organization: "HealthNet Africa",
      isVerifiedOrgProject: true,
      timeframe: "Oct 2026 – Present",
      summary: "Architected offline-first SQLite database synchronization for mobile healthcare staff in low-connectivity clinics. Built responsive encounter forms conforming to DHIS2 registry specifications.",
      technologies: ["React 19", "Next.js App Router", "TypeScript", "Tailwind CSS", "SQLite"],
      githubUrl: "https://github.com/experiencebridge-demo/community-health-tracker",
      participationId: "part-healthnet-01",
    },
    {
      id: "top-proj-2",
      title: "AgriTech Cold Chain Logger",
      role: "IoT Telemetry Dashboard Engineer",
      organization: "AgroYield Africa",
      isVerifiedOrgProject: true,
      timeframe: "Aug 2026 – Oct 2026",
      summary: "Engineered real-time temperature and humidity telemetry monitoring dashboards with automated anomaly alert webhooks and exportable PDF audit trails for cold-storage logistics.",
      technologies: ["Next.js", "TypeScript", "FastAPI", "WebSockets", "Recharts"],
      projectUrl: "https://agroyield-demo.experiencebridge.internal",
      participationId: "part-agroyield-02",
    },
    {
      id: "top-proj-3",
      title: "Campus Shuttle Live Tracker",
      role: "Lead Fullstack Developer",
      organization: "Ashesi University Software Project",
      isVerifiedOrgProject: false,
      timeframe: "Jan 2026 – May 2026",
      summary: "Designed and built an interactive Progressive Web Application for campus transit tracking with live GPS vehicle mapping, arrival ETA forecasting, and schedule push alerts.",
      technologies: ["React", "TypeScript", "Leaflet.js", "Python FastAPI", "PWA"],
      githubUrl: "https://github.com/stellaappiok/campus-shuttle-tracker",
    },
  ],
};

/**
 * Synthetic Participations list for STU-06 (/student/projects).
 * Multi-project overview with progress, mentor assignment, and milestone status.
 */
export const syntheticParticipationsList: StudentParticipationSummaryItem[] = [
  {
    participationId: "part-healthnet-01",
    projectId: "proj-healthnet",
    projectTitle: "Community Health Tracker",
    organizationName: "HealthNet Africa",
    organizationVerified: true,
    mentorName: "Dr. K. Mensah (Assigned Mentor)",
    mentorStatus: "accepted",
    status: "active",
    currentMilestone: "Milestone 2: Offline-First Sync Layer",
    nextMilestoneDue: "Nov 15, 2026",
    progressPercent: 45,
    completedMilestonesCount: 1,
    totalMilestonesCount: 3,
    compensationSummary: "GHS 2,400 (Milestone-based)",
    weeklyHours: 15,
  },
  {
    participationId: "part-sunpower-03",
    projectId: "proj-sunpower",
    projectTitle: "Solar Microgrid Telemetry",
    organizationName: "SunPower Labs",
    organizationVerified: true,
    mentorName: "Ing. E. Boateng (Assigned Mentor)",
    mentorStatus: "accepted",
    status: "under_review",
    currentMilestone: "Milestone 3: Cloud Gateway & Ingestion Pipelines",
    nextMilestoneDue: "Under Review by Mentor",
    progressPercent: 80,
    completedMilestonesCount: 2,
    totalMilestonesCount: 3,
    compensationSummary: "GHS 3,000 (Stipend via Milestones)",
    weeklyHours: 18,
  },
  {
    participationId: "part-agroyield-02",
    projectId: "proj-agroyield",
    projectTitle: "AgriTech Cold Chain Logger",
    organizationName: "AgroYield Africa",
    organizationVerified: true,
    mentorName: "Prof. F. Owusu (University Mentor)",
    mentorStatus: "accepted",
    status: "completed",
    currentMilestone: "All milestones verified & passport assertions issued",
    nextMilestoneDue: "Project Completed",
    progressPercent: 100,
    completedMilestonesCount: 3,
    totalMilestonesCount: 3,
    compensationSummary: "GHS 2,800 (Disbursed)",
    weeklyHours: 15,
  },
];

/**
 * Synthetic detailed workspace data for STU-07 (/student/projects/[participationId]).
 * Complete with overview, milestone checklists, submissions with separate mentor/org reviews,
 * and immutable agreed terms hash.
 */
export const syntheticParticipationDetails: Record<string, ParticipationWorkspaceDetails> = {
  "part-healthnet-01": {
    participationId: "part-healthnet-01",
    projectId: "proj-healthnet",
    projectTitle: "Community Health Tracker",
    organizationName: "HealthNet Africa",
    organizationContact: "Dr. A. Osei (Technical Director)",
    organizationVerificationStatus: "Verified Non-Profit Healthcare NGO",
    mentor: {
      name: "Dr. K. Mensah",
      title: "Senior Lecturer & Distributed Systems Researcher, Ashesi University",
      status: "accepted",
      email: "k.mensah@ashesi.edu.gh",
    },
    status: "active",
    startedAt: "Oct 18, 2026",
    targetCompletionDate: "Dec 15, 2026",
    progressPercent: 45,
    currentMilestoneId: "m-02",
    repositoryUrl: "https://github.com/experiencebridge-demo/community-health-tracker",
    designUrl: "https://figma.com/file/demo-healthnet-wireframes",
    documentationUrl: "https://docs.healthnet.internal/offline-sync-spec",
    milestones: [
      {
        id: "m-01",
        order: 1,
        title: "Local SQLite DB & Data Schema",
        description: "Initialize client-side relational storage, entity models, and migration scripts conforming to DHIS2 standards.",
        deadline: "Oct 27, 2026",
        status: "completed",
        deliverables: [
          "Database migration files (SQLite / IndexedDB wrapper)",
          "TypeScript type definitions for patient encounters",
          "Unit tests achieving >80% statement coverage",
        ],
        acceptanceCriteria: [
          "Schema matches health registry format without foreign key violations",
          "Data persisted across browser restarts and offline states",
        ],
        submissionId: "sub-101",
      },
      {
        id: "m-02",
        order: 2,
        title: "Offline Sync Engine & Conflict Resolution",
        description: "Build background sync service with exponential backoff and Last-Write-Wins with field-level conflict tracking.",
        deadline: "Nov 15, 2026",
        status: "in_progress",
        deliverables: [
          "Sync service worker handling offline mutation queues",
          "Idempotent API ingestion client",
          "Conflict resolution audit log",
        ],
        acceptanceCriteria: [
          "No data loss under simulated network dropouts",
          "Sync resumes automatically upon network reconnect",
        ],
      },
      {
        id: "m-03",
        order: 3,
        title: "Field Worker UI & Telemetry Analytics",
        description: "Construct responsive tablet/mobile screens for community nurses with sync health status indicators.",
        deadline: "Dec 10, 2026",
        status: "upcoming",
        deliverables: [
          "Accessible encounter recording views (WCAG AA)",
          "Battery-aware sync toggle control",
          "Final delivery documentation and screencast walk-through",
        ],
        acceptanceCriteria: [
          "Forms usable with touch inputs on 7-inch tablets",
          "Passes organization acceptance checklist without severity-1 issues",
        ],
      },
    ],
    submissions: [
      {
        id: "sub-101",
        milestoneId: "m-01",
        milestoneTitle: "Milestone 1: Local SQLite DB & Data Schema",
        revisionNumber: 1,
        summary: "Implemented offline SQLite database layer with full migration support and comprehensive patient encounter TypeScript models.",
        contributionStatement: "I designed the relational schema, authored all SQLite migration scripts, and wrote 14 Jest integration tests validating transaction rollbacks.",
        links: [
          { label: "Pull Request #14: Offline SQLite Engine", url: "https://github.com/experiencebridge-demo/community-health-tracker/pull/14" },
          { label: "Test Coverage Report (87%)", url: "https://coverage.experiencebridge.internal/healthnet/m1-report" },
        ],
        status: "accepted",
        submittedAt: "Oct 26, 2026 at 16:45 GMT",
        mentorReview: {
          id: "rev-m-01",
          reviewerType: "mentor",
          reviewerName: "Dr. K. Mensah (Assigned Mentor)",
          status: "approved",
          feedback: "Exemplary structural design. Schema constraints are properly indexed and error recovery handles SQLite edge cases cleanly.",
          reviewedAt: "Oct 27, 2026 at 11:20 GMT",
        },
        organizationDecision: {
          id: "rev-org-01",
          reviewerType: "organization",
          reviewerName: "HealthNet Africa (Technical Director)",
          status: "approved",
          feedback: "Milestone 1 acceptance criteria fully satisfied. Authorized milestone disbursement of GHS 800.",
          reviewedAt: "Oct 27, 2026 at 14:10 GMT",
        },
      },
    ],
    agreedTerms: {
      termsVersionId: "terms-healthnet-v1.2",
      termsHash: "sha256:4f8a9e120bc71d43a88c2e71d87e0254c2978d338f07a16b32c66d2134599a01",
      compensationSummary: "GHS 2,400 across 3 milestone disbursements (GHS 800 per approved milestone)",
      weeklyHours: 15,
      durationWeeks: 8,
      ipConditions: "Permissive Open Source (MIT License). Student retains moral authorship rights and authorization to showcase verifiable artifacts in the Experience Passport.",
      confidentialitySummary: "Patient records use synthetic de-identified fixtures. No real clinical patient data may be extracted or shared.",
      acceptedAt: "Oct 18, 2026 at 10:15 GMT",
    },
    isSyntheticDemo: true,
  },
};

