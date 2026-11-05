// TEMPORARY SAMPLE DATA - replace with API

export type MentorDashboardData = {
  proposals: {
    id: string;
    projectTitle: string;
    organizationLabel: string;
    learnerLabel: string;
    projectSummary: string;
    expectedCommitment: string;
    estimatedHours: string;
    participantCount: number;
    reviewExpectations: string;
    confidentialitySummary: string;
    responseDue: string;
  }[];
  acceptedAssignments: {
    id: string;
    participationId: string;
    projectTitle: string;
    organizationLabel: string;
    learnerLabel: string;
    projectSummary: string;
    participationStatus: string;
    nextMilestone: string;
    dueDate: string;
    milestones: {
      id: string;
      title: string;
      description: string;
      dueDate: string;
      availabilityStatus: "planned" | "active" | "archived";
      submissions: {
        id: string;
        revisionNumber: number;
        summary: string;
        status: "draft" | "submitted" | "revision_requested" | "withdrawn";
        submittedAt: string | null;
        evidenceReferences: {
          id: string;
          name: string;
          kind: "external_url" | "text_excerpt";
        }[];
      }[];
    }[];
    mentorReviews: {
      id: string;
      submissionId: string;
      decision: "reviewed" | "revision_requested" | "unable_to_assess";
      rubricVersion: string;
      createdAt: string;
    }[];
  }[];
  pendingReviews: {
    id: string;
    participationId?: string;
    projectTitle: string;
    learnerLabel: string;
    milestone: string;
    submittedDate: string;
    reviewDue: string;
  }[];
  upcomingDeadlines: {
    id: string;
    label: string;
    relatedTo: string;
    dueDate: string;
  }[];
  reviewCapacity: {
    expectedReviewsThisWeek: number;
    weeklyReviewCapacity: number;
  };
};

export const sampleMentorDashboard: MentorDashboardData = {
  proposals: [
    {
      id: "sample-proposal-1",
      projectTitle: "Sample project: Community information site",
      organizationLabel: "Synthetic organization Alpha",
      learnerLabel: "Synthetic learner A",
      projectSummary:
        "Create a small responsive information site using synthetic content and assets.",
      expectedCommitment: "About 2 check-ins over 3 weeks",
      estimatedHours: "About 8 hours total",
      participantCount: 1,
      reviewExpectations: "Two mentor check-ins and a final evidence review.",
      confidentialitySummary:
        "Sample brief uses synthetic information; no confidential materials are included.",
      responseDue: "2026-11-02",
    },
    {
      id: "sample-proposal-2",
      projectTitle: "Sample project: Anonymized data summary",
      organizationLabel: "Synthetic organization Beta",
      learnerLabel: "Synthetic learner B",
      projectSummary:
        "Prepare a short summary from a fictional, non-sensitive sample dataset.",
      expectedCommitment: "About 1 check-in over 2 weeks",
      estimatedHours: "About 5 hours total",
      participantCount: 1,
      reviewExpectations: "One mentor check-in and a final evidence review.",
      confidentialitySummary:
        "Sample brief uses a fictional dataset; no confidential materials are included.",
      responseDue: "2026-11-04",
    },
  ],
  acceptedAssignments: [
    {
      id: "sample-assignment-1",
      participationId: "sample-participation-1",
      projectTitle: "Sample project: Mobile-friendly resource guide",
      organizationLabel: "Synthetic organization Gamma",
      learnerLabel: "Synthetic learner C",
      projectSummary:
        "Draft a mobile-friendly guide using fictional content for this sample project.",
      participationStatus: "Active · sample participation",
      nextMilestone: "Sample milestone: First page draft",
      dueDate: "2026-11-03",
      milestones: [
        {
          id: "sample-milestone-1a",
          title: "Sample milestone: Outline",
          description: "Prepare a proposed page outline using sample content.",
          dueDate: "2026-10-30",
          availabilityStatus: "active",
          submissions: [
            {
              id: "sample-submission-1a-r1",
              revisionNumber: 1,
              summary: "A sample outline using fictional page titles and content.",
              status: "submitted",
              submittedAt: "2026-10-27",
              evidenceReferences: [
                {
                  id: "sample-artifact-1a",
                  name: "Synthetic text excerpt: sample page outline",
                  kind: "text_excerpt",
                },
              ],
            },
          ],
        },
        {
          id: "sample-milestone-1b",
          title: "Sample milestone: First page draft",
          description: "Create a first responsive page draft for mentor discussion.",
          dueDate: "2026-11-03",
          availabilityStatus: "active",
          submissions: [
            {
              id: "sample-submission-1b-r1",
              revisionNumber: 1,
              summary: "A fictional first-page draft for sample review.",
              status: "revision_requested",
              submittedAt: "2026-10-26",
              evidenceReferences: [
                {
                  id: "sample-artifact-1b",
                  name: "Synthetic external evidence reference: sample page preview",
                  kind: "external_url",
                },
              ],
            },
          ],
        },
        {
          id: "sample-milestone-1c",
          title: "Sample milestone: Final guide handoff",
          description: "Prepare a final sample guide and handoff notes.",
          dueDate: "2026-11-07",
          availabilityStatus: "planned",
          submissions: [],
        },
      ],
      mentorReviews: [
        {
          id: "sample-mentor-review-1",
          submissionId: "sample-submission-1b-r1",
          decision: "revision_requested",
          rubricVersion: "synthetic-sample-rubric-v1",
          createdAt: "2026-10-27",
        },
      ],
    },
    {
      id: "sample-assignment-2",
      participationId: "sample-participation-2",
      projectTitle: "Sample project: Public dataset cleanup",
      organizationLabel: "Synthetic organization Delta",
      learnerLabel: "Synthetic learner D",
      projectSummary:
        "Document cleanup steps for a fictional, non-sensitive public dataset.",
      participationStatus: "Active · sample participation",
      nextMilestone: "Sample milestone: Data quality notes",
      dueDate: "2026-11-06",
      milestones: [
        {
          id: "sample-milestone-2a",
          title: "Sample milestone: Dataset review",
          description: "Inspect the fictional dataset and record possible quality issues.",
          dueDate: "2026-11-02",
          availabilityStatus: "archived",
          submissions: [],
        },
        {
          id: "sample-milestone-2b",
          title: "Sample milestone: Data quality notes",
          description: "Summarize sample cleanup steps and remaining limitations.",
          dueDate: "2026-11-06",
          availabilityStatus: "active",
          submissions: [
            {
              id: "sample-submission-2b-r1",
              revisionNumber: 1,
              summary: "A sample summary of fictional dataset cleanup notes.",
              status: "submitted",
              submittedAt: "2026-10-26",
              evidenceReferences: [
                {
                  id: "sample-artifact-2b",
                  name: "Synthetic text excerpt: data quality notes",
                  kind: "text_excerpt",
                },
              ],
            },
          ],
        },
      ],
      mentorReviews: [],
    },
  ],
  pendingReviews: [
    {
      id: "sample-review-2",
      projectTitle: "Sample project: Public dataset cleanup",
      learnerLabel: "Synthetic learner D",
      milestone: "Sample milestone: Data quality notes",
      submittedDate: "2026-10-26",
      reviewDue: "2026-11-01",
    },
  ],
  upcomingDeadlines: [
    {
      id: "sample-deadline-1",
      label: "Sample review due",
      relatedTo: "Synthetic learner C · resource guide draft",
      dueDate: "2026-10-30",
    },
    {
      id: "sample-deadline-2",
      label: "Sample review due",
      relatedTo: "Synthetic learner D · data quality notes",
      dueDate: "2026-11-01",
    },
    {
      id: "sample-deadline-3",
      label: "Sample milestone due",
      relatedTo: "Synthetic learner C · resource guide",
      dueDate: "2026-11-03",
    },
  ],
  reviewCapacity: {
    expectedReviewsThisWeek: 4,
    weeklyReviewCapacity: 3,
  },
};
