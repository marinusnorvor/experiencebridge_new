export type DemoPortalKey = "student" | "organization" | "mentor" | "admin";

export type DemoCard = {
  label: string;
  value: string;
  detail: string;
};

export type DemoItem = {
  title: string;
  status: string;
  description: string;
};

export type DemoPortalContent = {
  name: string;
  heading: string;
  description: string;
  overview: string;
  cards: DemoCard[];
  items: DemoItem[];
  explore: string[];
};

export const demoPortals: Record<DemoPortalKey, DemoPortalContent> = {
  student: {
    name: "Student",
    heading: "Build experience through meaningful work",
    description:
      "A sample student workspace for exploring opportunities, tracking progress, and keeping evidence together.",
    overview:
      "This screen shows how a student could review a project and keep track of next steps. All names, statuses, and examples below are invented for this demo.",
    cards: [
      { label: "Sample opportunities", value: "3", detail: "Illustrative only" },
      { label: "Example applications", value: "1", detail: "Not submitted" },
      { label: "Next step", value: "Explore", detail: "No action is recorded" },
    ],
    items: [
      {
        title: "DEMO · Community resource directory",
        status: "Example opportunity",
        description:
          "A fictional project brief about organizing public community resources. No organization is involved.",
      },
      {
        title: "DEMO · Application walkthrough",
        status: "Sample view only",
        description:
          "A preview of where an application summary could appear. Nothing has been sent or saved.",
      },
    ],
    explore: [
      "Review a clearly labeled sample opportunity.",
      "See where applications and next steps could appear.",
      "Understand that evidence and reviews would remain private by default.",
    ],
  },
  organization: {
    name: "Organization",
    heading: "Shape a project with clear expectations",
    description:
      "A sample organization workspace for understanding project summaries and applicant queues.",
    overview:
      "This fictional workspace demonstrates a project overview and a sample applicant list. It does not represent a real employer or real applicants.",
    cards: [
      { label: "Draft examples", value: "2", detail: "Synthetic content" },
      { label: "Sample applicants", value: "4", detail: "Not real people" },
      { label: "Project status", value: "Preview", detail: "No project is published" },
    ],
    items: [
      {
        title: "DEMO · Community resource directory",
        status: "Fictional draft",
        description:
          "An example project summary with a sample scope. No work, compensation, or commitment exists.",
      },
      {
        title: "DEMO · Synthetic applicant list",
        status: "Preview only",
        description:
          "Illustrative applicant cards show where review context could appear. No real applications are available.",
      },
    ],
    explore: [
      "See how a project summary could present scope and expectations.",
      "Preview a synthetic applicant queue without making a selection.",
      "Review where independent acceptance and mentor assessment would be shown separately.",
    ],
  },
  mentor: {
    name: "Mentor",
    heading: "Support progress with independent feedback",
    description:
      "A sample mentor workspace for viewing an illustrative assignment and review context.",
    overview:
      "The sample assignment and review details are entirely fictional. This demo cannot create an assessment or change any project status.",
    cards: [
      { label: "Example assignments", value: "2", detail: "Synthetic only" },
      { label: "Reviews due", value: "1", detail: "Not an actual task" },
      { label: "Recent activity", value: "Preview", detail: "No review recorded" },
    ],
    items: [
      {
        title: "DEMO · Directory prototype review",
        status: "Illustrative assignment",
        description:
          "A fictional example showing where an assigned project and its review context may appear.",
      },
      {
        title: "DEMO · Feedback overview",
        status: "No assessment exists",
        description:
          "This card previews a review area. It contains no judgment about a real student's work.",
      },
    ],
    explore: [
      "Preview the assignment queue layout.",
      "See where evidence-linked feedback could be organized.",
      "Keep mentor assessment distinct from an organization's acceptance decision.",
    ],
  },
  admin: {
    name: "Admin",
    heading: "Understand the moderation workspace",
    description:
      "A read-only sample of how a platform operations overview could be organized.",
    overview:
      "This is a presentation-only mock. There are no real organizations, reports, moderation records, or administrative actions here.",
    cards: [
      { label: "Example queue items", value: "5", detail: "Synthetic only" },
      { label: "Sample reports", value: "2", detail: "No real incidents" },
      { label: "Admin actions", value: "Disabled", detail: "Read-only demo" },
    ],
    items: [
      {
        title: "DEMO · Organization review queue",
        status: "Fictional sample",
        description:
          "A mock queue row to illustrate information hierarchy. No verification decision has been made.",
      },
      {
        title: "DEMO · Safety report summary",
        status: "Not a real report",
        description:
          "A sample summary card only. No user, organization, or incident information is shown.",
      },
    ],
    explore: [
      "Preview a moderation queue layout using fictional records.",
      "Notice that consequential actions are absent from this demo.",
      "See how sample reports can be presented without exposing private information.",
    ],
  },
};
