import Link from "next/link";

import type { MentorDashboardData } from "../lib/sample-dashboard-data";

type AcceptedAssignment = MentorDashboardData["acceptedAssignments"][number];
type Milestone = AcceptedAssignment["milestones"][number];
type Submission = Milestone["submissions"][number];
type MentorReview = AcceptedAssignment["mentorReviews"][number];

type SubmissionReviewProps = {
  assignment: AcceptedAssignment;
  milestone: Milestone;
  submission: Submission;
  mentorReview?: MentorReview;
};

export function SubmissionReview({
  assignment,
  milestone,
  submission,
  mentorReview,
}: SubmissionReviewProps) {
  const isReviewable = submission.status === "submitted" && !mentorReview;

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <Link
        href={`/mentor/participations/${assignment.participationId}`}
        className="inline-flex min-h-11 items-center rounded-md text-sm font-medium text-teal-900 underline decoration-teal-700 underline-offset-4 hover:text-teal-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-800"
      >
        Back to project context
      </Link>

      <header className="mt-6">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-800">
          Mentor workspace · MEN-04
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          Submission review
        </h1>
      </header>

      <aside
        aria-label="Sample data notice"
        className="mt-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-950"
      >
        <p className="font-semibold">Synthetic sample submission</p>
        <p>
          Project, organization, learner, milestone, submission, and evidence details on this
          page are fictional sample data, not real work or outcomes.
        </p>
      </aside>

      <section
        aria-labelledby="submission-context-title"
        className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-sm font-semibold text-slate-800">
            Submission: {formatSubmissionStatus(submission.status)}
          </span>
          <span className="text-sm text-slate-600">
            Revision {submission.revisionNumber}
          </span>
        </div>
        <h2
          id="submission-context-title"
          className="mt-5 text-2xl font-semibold tracking-tight text-slate-900"
        >
          {assignment.projectTitle}
        </h2>
        <dl className="mt-5 grid gap-4 border-t border-slate-200 pt-5 sm:grid-cols-2">
          <DetailItem label="Organization" value={assignment.organizationLabel} />
          <DetailItem label="Learner" value={assignment.learnerLabel} />
          <DetailItem label="Participation status" value={assignment.participationStatus} />
          <DetailItem label="Milestone" value={milestone.title} />
          <DetailItem
            label="Milestone availability"
            value={formatMilestoneAvailability(milestone.availabilityStatus)}
          />
          <div>
            <dt className="text-sm font-medium text-slate-800">Milestone due date</dt>
            <dd className="mt-1 text-sm leading-6 text-slate-600">
              <time dateTime={milestone.dueDate}>{formatDate(milestone.dueDate)}</time>
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-slate-800">Submitted</dt>
            <dd className="mt-1 text-sm leading-6 text-slate-600">
              {submission.submittedAt ? (
                <time dateTime={submission.submittedAt}>
                  {formatDate(submission.submittedAt)}
                </time>
              ) : (
                "No submission timestamp in this sample"
              )}
            </dd>
          </div>
        </dl>
        <div className="mt-5 border-t border-slate-200 pt-5">
          <h3 className="font-semibold text-slate-900">Submission summary</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">{submission.summary}</p>
        </div>
      </section>

      <section
        aria-labelledby="evidence-title"
        className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"
      >
        <h2 id="evidence-title" className="text-xl font-semibold tracking-tight text-slate-900">
          Evidence references
        </h2>
        {submission.evidenceReferences.length === 0 ? (
          <p className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm leading-6 text-slate-600">
            No evidence references are listed for this sample submission.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {submission.evidenceReferences.map((evidence) => (
              <li key={evidence.id}>
                <article className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <h3 className="font-medium text-slate-900">{evidence.name}</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    Synthetic {formatEvidenceKind(evidence.kind)}. No external resource is
                    opened from this sample view.
                  </p>
                </article>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section
        aria-labelledby="mentor-review-title"
        className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"
      >
        <h2
          id="mentor-review-title"
          className="text-xl font-semibold tracking-tight text-slate-900"
        >
          Mentor assessment
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          A mentor assessment is separate from the submission state and any organization
          decision.
        </p>

        {mentorReview ? (
          <div className="mt-4 rounded-lg border border-violet-200 bg-violet-50 p-4">
            <h3 className="font-semibold text-violet-950">Existing synthetic review record</h3>
            <p className="mt-2 text-sm leading-6 text-violet-950">
              Decision: {formatReviewDecision(mentorReview.decision)} · rubric version{" "}
              {mentorReview.rubricVersion} · recorded {formatDate(mentorReview.createdAt)}.
            </p>
            <p className="mt-2 text-sm leading-6 text-violet-950">
              This record is sample data and is not an organization acceptance.
            </p>
          </div>
        ) : isReviewable ? (
          <div
            role="status"
            className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-950"
          >
            <h3 className="font-semibold">Review entry unavailable</h3>
            <p className="mt-1">
              An approved rubric version and its criteria are not configured in the project
              specifications. In keeping with MEN-04, rubric-dependent observations, scores,
              feedback, and review decisions are not available here.
            </p>
          </div>
        ) : (
          <div
            role="status"
            className="mt-4 rounded-lg border border-slate-300 bg-slate-50 p-4 text-sm leading-6 text-slate-700"
          >
            This sample submission is not in the documented submitted state for mentor review.
            No review controls are available.
          </div>
        )}
      </section>
    </main>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm font-medium text-slate-800">{label}</dt>
      <dd className="mt-1 text-sm leading-6 text-slate-600">{value}</dd>
    </div>
  );
}

function formatDate(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}/.test(date)) return "Not scheduled";
  return new Intl.DateTimeFormat("en-GH", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(date.includes("T") ? date : `${date}T12:00:00Z`));
}

function formatSubmissionStatus(
  status: "draft" | "submitted" | "revision_requested" | "withdrawn",
) {
  switch (status) {
    case "draft":
      return "Draft";
    case "submitted":
      return "Submitted";
    case "revision_requested":
      return "Revision requested";
    case "withdrawn":
      return "Withdrawn";
  }
}

function formatMilestoneAvailability(status: "planned" | "active" | "archived") {
  switch (status) {
    case "planned":
      return "Planned (available template)";
    case "active":
      return "Active (assigned work is open)";
    case "archived":
      return "Archived (no longer active)";
  }
}

function formatEvidenceKind(kind: "external_url" | "text_excerpt") {
  return kind === "external_url" ? "external evidence reference" : "text excerpt reference";
}

function formatReviewDecision(
  decision: "reviewed" | "revision_requested" | "unable_to_assess",
) {
  switch (decision) {
    case "reviewed":
      return "Reviewed";
    case "revision_requested":
      return "Revision requested";
    case "unable_to_assess":
      return "Unable to assess";
  }
}
