import Link from "next/link";
import { MentorReviewPanel } from "./mentor-review-panel";

import type { MentorDashboardData } from "../lib/sample-dashboard-data";

type AcceptedAssignment = MentorDashboardData["acceptedAssignments"][number];

export function ParticipationContext({
  assignment,
  preview = true,
}: {
  assignment: AcceptedAssignment;
  preview?: boolean;
}) {
  const submissionCount = assignment.milestones.reduce(
    (count, milestone) => count + milestone.submissions.length,
    0,
  );
  const milestonesWithSubmissions = assignment.milestones.filter(
    (milestone) => milestone.submissions.length > 0,
  ).length;

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <Link
        href="/mentor/dashboard#accepted-assignments"
        className="inline-flex min-h-11 items-center rounded-md text-sm font-medium text-teal-900 underline decoration-teal-700 underline-offset-4 hover:text-teal-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-800"
      >
        Back to mentor dashboard
      </Link>

      <header className="mt-6">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-800">
          Mentor workspace · MEN-03
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          Accepted assignment
        </h1>
      </header>

      <aside
        aria-label="Sample data notice"
        className="mt-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-950"
      >
        <p className="font-semibold">{preview ? "Synthetic sample participation" : "Development participation"}</p>
        <p>
          {preview
            ? "All project, organization, learner, milestone, and status information on this page is fictional sample data."
            : "Development records are synthetic and do not certify real-world outcomes."}
        </p>
      </aside>

      <section
        aria-labelledby="project-context-title"
        className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-900">
            Accepted assignment
          </span>
          <span className="rounded-full border border-slate-300 px-3 py-1 text-sm font-medium text-slate-700">
            {assignment.participationStatus}
          </span>
        </div>
        <h2
          id="project-context-title"
          className="mt-5 text-2xl font-semibold tracking-tight text-slate-900"
        >
          {assignment.projectTitle}
        </h2>
        <p className="mt-3 leading-7 text-slate-600">{assignment.projectSummary}</p>

        <dl className="mt-6 grid gap-4 border-t border-slate-200 pt-5 sm:grid-cols-2">
          <DetailItem label="Organization" value={assignment.organizationLabel} />
          <DetailItem label="Learner" value={assignment.learnerLabel} />
          <DetailItem label="Participation" value={assignment.participationStatus} />
          <DetailItem label="Next milestone" value={assignment.nextMilestone} />
          <div className="sm:col-span-2">
            <DetailItem
              label="Next milestone due"
              value={formatDate(assignment.dueDate)}
            />
          </div>
        </dl>
      </section>

      <section
        aria-labelledby="milestones-title"
        className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"
      >
        <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="milestones-title" className="text-xl font-semibold tracking-tight text-slate-900">
            Learner progress and milestones
          </h2>
          <span className="text-sm text-slate-500">
            {assignment.milestones.length}{" "}
            {assignment.milestones.length === 1 ? "milestone" : "milestones"}
          </span>
        </div>

        <div
          aria-label="Progress summary"
          className="mb-5 rounded-lg border border-slate-200 bg-slate-50 p-4"
        >
          <h3 className="font-semibold text-slate-900">Progress record summary</h3>
          <p className="mt-1 text-sm leading-6 text-slate-700">
            {milestonesWithSubmissions}{" "}
            {milestonesWithSubmissions === 1 ? "milestone has" : "milestones have"} a submission
            record; {submissionCount}{" "}
            {submissionCount === 1 ? "submission is" : "submissions are"} listed. This is a
            summary of records, not a completion score or assessment.
          </p>
        </div>

        {assignment.milestones.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm leading-6 text-slate-600">
            No milestones are listed for this participation.
          </p>
        ) : (
          <ol className="space-y-4">
            {assignment.milestones.map((milestone) => (
              <li key={milestone.id}>
                <article className="rounded-lg border border-slate-200 p-4 sm:p-5">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="font-semibold text-slate-900">{milestone.title}</h3>
                      <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Availability: {formatMilestoneAvailability(milestone.availabilityStatus)}
                      </p>
                    </div>
                    <time
                      dateTime={milestone.dueDate}
                      className="shrink-0 text-sm font-medium text-slate-700"
                    >
                      Due {formatDate(milestone.dueDate)}
                    </time>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{milestone.description}</p>
                  {milestone.status && (
                    <p className="mt-2 text-sm font-medium text-slate-700">
                      Status: {milestone.status}
                    </p>
                  )}

                  <section
                    aria-label={`Submissions for ${milestone.title}`}
                    className="mt-5 border-t border-slate-200 pt-4"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-slate-800">Submission records</h4>
                      <span className="text-xs text-slate-500">
                        {milestone.submissions.length}{" "}
                        {milestone.submissions.length === 1 ? "record" : "records"}
                      </span>
                    </div>

                    {milestone.submissions.length === 0 ? (
                      <p className="mt-2 rounded border border-dashed border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-600">
                        No submissions recorded for this milestone.
                      </p>
                    ) : (
                      <ul className="mt-3 space-y-3">
                        {milestone.submissions.map((submission) => {
                          const mentorReview = assignment.mentorReviews.find(
                            (review) => review.submissionId === submission.id,
                          );

                          return (
                            <li key={submission.id}>
                              <article className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <span className="font-medium text-slate-900">
                                    Revision {submission.revisionNumber} ·{" "}
                                    {formatSubmissionStatus(submission.status)}
                                  </span>
                                  {submission.submittedAt && (
                                    <time
                                      dateTime={submission.submittedAt}
                                      className="text-xs text-slate-500"
                                    >
                                      Submitted {formatDate(submission.submittedAt)}
                                    </time>
                                  )}
                                </div>
                                <p className="mt-2 text-slate-700">{submission.summary}</p>

                                <div className="mt-3 border-t border-slate-200 pt-2">
                                  <h5 className="text-xs font-semibold text-slate-700">
                                    Evidence references
                                  </h5>
                                  {submission.evidenceReferences.length === 0 ? (
                                    <p className="mt-1 text-xs text-slate-500">
                                      No evidence references.
                                    </p>
                                  ) : (
                                    <ul className="mt-1 list-disc pl-5 text-xs text-slate-600">
                                      {submission.evidenceReferences.map((evidence) => (
                                        <li key={evidence.id}>
                                          {evidence.name} ({formatEvidenceKind(evidence.kind)})
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                </div>

                                <div className="mt-3 border-t border-slate-200 pt-2">
                                  <h5 className="text-xs font-semibold text-slate-700">
                                    Mentor review
                                  </h5>
                                  {mentorReview ? (
                                    <p className="mt-1 text-xs text-slate-600">
                                      {formatReviewDecision(mentorReview.decision)} · rubric{" "}
                                      {mentorReview.rubricVersion} ·{" "}
                                      {formatDate(mentorReview.createdAt)}
                                    </p>
                                  ) : (
                                    <p className="mt-1 text-xs text-slate-500">
                                      No review recorded yet.
                                    </p>
                                  )}
                                </div>
                              </article>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </section>
                </article>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section
        aria-labelledby="review-section-title"
        className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"
      >
        <h2 id="review-section-title" className="text-xl font-semibold tracking-tight text-slate-900">
          Review and feedback
        </h2>
        {preview ? (
          <div>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Assessment submission is unavailable in the synthetic presentation preview.
            </p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <ComingSoonPlaceholder
                title="Submission review"
                description="Review a learner submission using an approved rubric."
              />
              <ComingSoonPlaceholder
                title="Mentor feedback"
                description="View feedback and review history for this participation."
              />
            </div>
          </div>
        ) : (
          <MentorReviewPanel participationId={assignment.participationId} />
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

function ComingSoonPlaceholder({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      disabled
      className="w-full cursor-not-allowed rounded-lg border border-dashed border-slate-300 bg-white p-4 text-left opacity-80"
    >
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
        Coming soon
      </span>
      <span className="mt-2 block font-semibold text-slate-900">{title}</span>
      <span className="mt-1 block text-sm leading-6 text-slate-600">{description}</span>
    </button>
  );
}

function formatDate(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}/.test(date)) return date || "Not scheduled";
  return new Intl.DateTimeFormat("en-GH", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(date.includes("T") ? date : `${date}T12:00:00Z`));
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

function formatEvidenceKind(kind: "external_url" | "text_excerpt") {
  return kind === "external_url" ? "external URL reference" : "text excerpt reference";
}
