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
        <p className="font-semibold">Development participation</p>
        <p>
          Development records are synthetic and do not certify real-world outcomes.
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
          aria-label="Sample progress summary"
          className="mb-5 rounded-lg border border-slate-200 bg-slate-50 p-4"
        >
          <h3 className="font-semibold text-slate-900">Progress record summary</h3>
          <p className="mt-1 text-sm leading-6 text-slate-700">
            {milestonesWithSubmissions} sample{" "}
            {milestonesWithSubmissions === 1 ? "milestone has" : "milestones have"} a submission
            record; {submissionCount} sample{" "}
            {submissionCount === 1 ? "submission is" : "submissions are"} listed. This is a
            summary of sample records, not a completion score or assessment.
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
                <article className="rounded-lg border border-slate-200 p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <h3 className="font-semibold text-slate-900">{milestone.title}</h3>
                    <time
                      dateTime={milestone.dueDate}
                      className="shrink-0 text-sm font-medium text-slate-700"
                    >
                      Due {formatDate(milestone.dueDate)}
                    </time>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{milestone.description}</p>
                  <p className="mt-3 text-sm text-slate-700">
                    <span className="font-medium text-slate-800">Milestone availability: </span>
                    {formatMilestoneAvailability(milestone.availabilityStatus)}
                  </p>

                  <section
                    aria-labelledby={`${milestone.id}-submissions-title`}
                    className="mt-4 border-t border-slate-200 pt-4"
                  >
                    <h4
                      id={`${milestone.id}-submissions-title`}
                      className="font-medium text-slate-900"
                    >
                      Learner submissions
                    </h4>
                    {milestone.submissions.length === 0 ? (
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        No sample submission record is listed for this milestone.
                      </p>
                    ) : (
                      <ul className="mt-3 space-y-3">
                        {milestone.submissions.map((submission) => {
                          const mentorReview = assignment.mentorReviews.find(
                            (review) => review.submissionId === submission.id,
                          );

                          return (
                            <li key={submission.id}>
                              <article className="rounded-lg bg-slate-50 p-4">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <h5 className="font-medium text-slate-900">
                                    Sample submission · revision {submission.revisionNumber}
                                  </h5>
                                  <span className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-800">
                                    Submission: {formatSubmissionStatus(submission.status)}
                                  </span>
                                </div>
                                {submission.status === "submitted" && !mentorReview && (
                                  <Link
                                    href={`/mentor/submissions/${submission.id}/review`}
                                    className="mt-3 inline-flex min-h-11 items-center rounded-md font-medium text-teal-900 underline decoration-teal-700 underline-offset-4 hover:text-teal-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-800"
                                  >
                                    Review sample submission
                                  </Link>
                                )}
                                <p className="mt-2 text-sm leading-6 text-slate-600">
                                  {submission.summary}
                                </p>
                                <p className="mt-2 text-sm text-slate-700">
                                  <span className="font-medium text-slate-800">Submitted: </span>
                                  {submission.submittedAt ? (
                                    <time dateTime={submission.submittedAt}>
                                      {formatDate(submission.submittedAt)}
                                    </time>
                                  ) : (
                                    "Not submitted"
                                  )}
                                </p>

                                <div className="mt-3">
                                  <h6 className="text-sm font-medium text-slate-800">
                                    Evidence references
                                  </h6>
                                  {submission.evidenceReferences.length === 0 ? (
                                    <p className="mt-1 text-sm text-slate-600">
                                      No sample evidence references are listed.
                                    </p>
                                  ) : (
                                    <ul className="mt-1 list-inside list-disc space-y-1 text-sm leading-6 text-slate-600">
                                      {submission.evidenceReferences.map((evidence) => (
                                        <li key={evidence.id}>
                                          {evidence.name} ({formatEvidenceKind(evidence.kind)})
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                </div>

                                <div className="mt-3 border-t border-slate-200 pt-3">
                                  <h6 className="text-sm font-medium text-slate-800">
                                    Mentor review
                                  </h6>
                                  {mentorReview ? (
                                    <p className="mt-1 text-sm leading-6 text-slate-600">
                                      Sample review record:{" "}
                                      {formatReviewDecision(mentorReview.decision)} · rubric{" "}
                                      {mentorReview.rubricVersion} ·{" "}
                                      {formatDate(mentorReview.createdAt)}
                                    </p>
                                  ) : (
                                    <p className="mt-1 text-sm leading-6 text-slate-600">
                                      No mentor review record is listed for this sample submission.
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
        aria-labelledby="coming-soon-title"
        className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-5 sm:p-7"
      >
        <h2 id="coming-soon-title" className="text-xl font-semibold tracking-tight text-slate-900">
          Review and feedback
        </h2>
        {preview ? <p className="mt-2 text-sm leading-6 text-slate-600">Assessment submission is unavailable in the synthetic presentation preview.</p> : <MentorReviewPanel participationId={assignment.participationId} />}
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
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return date || "Not scheduled";
  return new Intl.DateTimeFormat("en-GH", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00Z`));
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
