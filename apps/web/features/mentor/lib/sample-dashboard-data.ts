// TEMPORARY SAMPLE DATA - replace with API

export type MentorDashboardData = {
  proposals: {
    id: string;
    projectTitle: string;
    organizationLabel: string;
    learnerLabel: string;
    expectedCommitment: string;
    responseDue: string;
  }[];
  acceptedAssignments: {
    id: string;
    projectTitle: string;
    organizationLabel: string;
    learnerLabel: string;
    nextMilestone: string;
    dueDate: string;
  }[];
  pendingReviews: {
    id: string;
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
      expectedCommitment: "About 2 check-ins over 3 weeks",
      responseDue: "2026-11-02",
    },
    {
      id: "sample-proposal-2",
      projectTitle: "Sample project: Anonymized data summary",
      organizationLabel: "Synthetic organization Beta",
      learnerLabel: "Synthetic learner B",
      expectedCommitment: "About 1 check-in over 2 weeks",
      responseDue: "2026-11-04",
    },
  ],
  acceptedAssignments: [
    {
      id: "sample-assignment-1",
      projectTitle: "Sample project: Mobile-friendly resource guide",
      organizationLabel: "Synthetic organization Gamma",
      learnerLabel: "Synthetic learner C",
      nextMilestone: "Sample milestone: First page draft",
      dueDate: "2026-11-03",
    },
    {
      id: "sample-assignment-2",
      projectTitle: "Sample project: Public dataset cleanup",
      organizationLabel: "Synthetic organization Delta",
      learnerLabel: "Synthetic learner D",
      nextMilestone: "Sample milestone: Data quality notes",
      dueDate: "2026-11-06",
    },
  ],
  pendingReviews: [
    {
      id: "sample-review-1",
      projectTitle: "Sample project: Mobile-friendly resource guide",
      learnerLabel: "Synthetic learner C",
      milestone: "Sample milestone: First page draft",
      submittedDate: "2026-10-25",
      reviewDue: "2026-10-30",
    },
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
