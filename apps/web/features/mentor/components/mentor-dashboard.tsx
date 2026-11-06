import Link from "next/link";

import { ProposalDecisionButtons } from "./assignment-proposal-detail";
import type { MentorDashboardData } from "../lib/sample-dashboard-data";

type DashboardState = "loading" | "error" | "ready";

type MentorDashboardProps = {
  data: MentorDashboardData;
  state: DashboardState;
  onChanged?: () => void;
};

function formatDate(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return "Not scheduled";
  return new Intl.DateTimeFormat("en-GH", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00Z`));
}

function EmptyState({ children }: { children: string }) {
  return (
    <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm leading-6 text-slate-600">
      {children}
    </p>
  );
}

function LoadingState() {
  return (
    <main
      aria-busy="true"
      aria-labelledby="mentor-dashboard-title"
      className="mx-auto min-h-screen w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12"
    >
      <p role="status" className="mb-6 text-sm text-slate-600">
        Loading mentor dashboard…
      </p>
      <div aria-hidden="true" className="animate-pulse space-y-5">
        <div className="h-9 max-w-sm rounded bg-slate-200" />
        <div className="h-24 rounded-xl bg-slate-200" />
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="h-64 rounded-xl bg-slate-200" />
          <div className="h-64 rounded-xl bg-slate-200" />
        </div>
      </div>
      <h1 id="mentor-dashboard-title" className="sr-only">
        Mentor dashboard
      </h1>
    </main>
  );
}

function ErrorState() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <div role="alert" className="rounded-xl border border-red-300 bg-red-50 p-5 text-red-950">
        <h1 className="text-xl font-semibold">Mentor dashboard unavailable</h1>
        <p className="mt-2 text-sm leading-6">
          Dashboard information could not be loaded. No assignment or review status has been
          confirmed.
        </p>
      </div>
    </main>
  );
}

function SectionHeading({
  id,
  title,
  count,
}: {
  id: string;
  title: string;
  count: number;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
      <h2 id={id} className="text-xl font-semibold tracking-tight text-slate-900">
        {title}
      </h2>
      <span className="text-sm text-slate-500">
        {count} {count === 1 ? "item" : "items"}
      </span>
    </div>
  );
}

function MentorDashboardContent({ data, onChanged }: { data: MentorDashboardData; onChanged?: () => void }) {
  const isOverCapacity =
    data.reviewCapacity.expectedReviewsThisWeek > data.reviewCapacity.weeklyReviewCapacity;

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-800">
          Mentor workspace · MEN-01
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          Mentor dashboard
        </h1>
        <p className="mt-3 max-w-2xl leading-7 text-slate-600">
          Review assignment requests, track accepted assignments, and see work awaiting your
          assessment.
        </p>
      </header>



      {isOverCapacity && (
        <section
          aria-labelledby="capacity-warning-title"
          className="mb-8 rounded-xl border border-amber-300 bg-amber-50 p-5"
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 id="capacity-warning-title" className="font-semibold text-amber-950">
                Review capacity
              </h2>
              <p className="mt-1 text-sm leading-6 text-amber-900">
                The current workload lists {data.reviewCapacity.expectedReviewsThisWeek} reviews
                pending against a weekly capacity of{" "}
                {data.reviewCapacity.weeklyReviewCapacity}. Review commitments before taking on
                more work.
              </p>
            </div>
            <span className="w-fit rounded-full border border-amber-400 px-3 py-1 text-xs font-semibold text-amber-950">
              Development records
            </span>
          </div>
        </section>
      )}

      <nav aria-label="Dashboard sections" className="mb-8 flex flex-wrap gap-2">
        {[
          ["#assignment-proposals", "Proposals"],
          ["#accepted-assignments", "Accepted assignments"],
          ["#pending-reviews", "Pending reviews"],
          ["#upcoming-deadlines", "Upcoming deadlines"],
        ].map(([href, label]) => (
          <a
            key={href}
            href={href}
            className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:border-teal-700 hover:text-teal-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800"
          >
            {label}
          </a>
        ))}
      </nav>

      <div className="grid gap-6 lg:grid-cols-2">
        <section
          id="assignment-proposals"
          aria-labelledby="assignment-proposals-title"
          className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
        >
          <SectionHeading
            id="assignment-proposals-title"
            title="Assignment proposals"
            count={data.proposals.length}
          />
          {data.proposals.length === 0 ? (
            <EmptyState>No assignment proposals are waiting for your response.</EmptyState>
          ) : (
            <ul className="space-y-4">
              {data.proposals.map((proposal) => (
                <li key={proposal.id}>
                  <article className="rounded-lg border border-slate-200 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-900">
                        Proposed · awaiting your decision
                      </span>
                      <span className="text-sm text-slate-600">
                        Respond by {formatDate(proposal.responseDue)}
                      </span>
                    </div>
                    <h3 className="mt-3 font-semibold text-slate-900">{proposal.projectTitle}</h3>
                    <dl className="mt-3 grid gap-2 text-sm leading-6 text-slate-600">
                      <div>
                        <dt className="inline font-medium text-slate-800">Organization: </dt>
                        <dd className="inline">{proposal.organizationLabel}</dd>
                      </div>
                      <div>
                        <dt className="inline font-medium text-slate-800">Learner: </dt>
                        <dd className="inline">{proposal.learnerLabel}</dd>
                      </div>
                      <div>
                        <dt className="inline font-medium text-slate-800">Expected commitment: </dt>
                        <dd className="inline">{proposal.expectedCommitment}</dd>
                      </div>
                    </dl>
                    <div className="mt-4 flex flex-col gap-4 border-t border-slate-200 pt-4">
                      <Link
                        href={`/mentor/assignments/${proposal.id}`}
                        className="inline-flex min-h-11 w-fit items-center rounded-md font-medium text-teal-900 underline decoration-teal-700 underline-offset-4 hover:text-teal-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-800"
                      >
                        View proposal details
                      </Link>
                      <ProposalDecisionButtons assignmentId={proposal.id} onChanged={onChanged} />
                    </div>
                  </article>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section
          id="accepted-assignments"
          aria-labelledby="accepted-assignments-title"
          className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
        >
          <SectionHeading
            id="accepted-assignments-title"
            title="Accepted assignments"
            count={data.acceptedAssignments.length}
          />
          {data.acceptedAssignments.length === 0 ? (
            <EmptyState>You have no accepted assignments to show.</EmptyState>
          ) : (
            <ul className="space-y-4">
              {data.acceptedAssignments.map((assignment) => (
                <li key={assignment.id}>
                  <article className="rounded-lg border border-slate-200 p-4">
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-900">
                      Accepted assignment
                    </span>
                    <h3 className="mt-3 font-semibold text-slate-900">
                      <Link
                        href={`/mentor/participations/${assignment.participationId}`}
                        className="rounded-sm underline decoration-slate-400 underline-offset-4 hover:text-teal-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-800"
                      >
                        {assignment.projectTitle}
                      </Link>
                    </h3>
                    <dl className="mt-3 grid gap-2 text-sm leading-6 text-slate-600">
                      <div>
                        <dt className="inline font-medium text-slate-800">Organization: </dt>
                        <dd className="inline">{assignment.organizationLabel}</dd>
                      </div>
                      <div>
                        <dt className="inline font-medium text-slate-800">Learner: </dt>
                        <dd className="inline">{assignment.learnerLabel}</dd>
                      </div>
                      <div>
                        <dt className="inline font-medium text-slate-800">Next milestone: </dt>
                        <dd className="inline">{assignment.nextMilestone}</dd>
                      </div>
                      <div>
                        <dt className="inline font-medium text-slate-800">Due: </dt>
                        <dd className="inline">{formatDate(assignment.dueDate)}</dd>
                      </div>
                      <div>
                        <dt className="inline font-medium text-slate-800">Status: </dt>
                        <dd className="inline">{assignment.participationStatus}</dd>
                      </div>
                    </dl>
                    <Link
                      href={`/mentor/participations/${assignment.participationId}`}
                      className="mt-4 inline-flex min-h-11 items-center rounded-md font-medium text-teal-900 underline decoration-teal-700 underline-offset-4 hover:text-teal-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-800"
                    >
                      View project context
                    </Link>
                  </article>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section
          id="pending-reviews"
          aria-labelledby="pending-reviews-title"
          className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
        >
          <SectionHeading
            id="pending-reviews-title"
            title="Pending reviews"
            count={data.pendingReviews.length}
          />
          {data.pendingReviews.length === 0 ? (
            <EmptyState>No submitted work is currently waiting for your review.</EmptyState>
          ) : (
            <ul className="space-y-4">
              {data.pendingReviews.map((review) => (
                <li key={review.id}>
                  <article className="rounded-lg border border-slate-200 p-4">
                    <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-900">
                      Awaiting mentor review
                    </span>
                    <h3 className="mt-3 font-semibold text-slate-900">{review.projectTitle}</h3>
                    <dl className="mt-3 grid gap-2 text-sm leading-6 text-slate-600">
                      <div>
                        <dt className="inline font-medium text-slate-800">Learner: </dt>
                        <dd className="inline">{review.learnerLabel}</dd>
                      </div>
                      <div>
                        <dt className="inline font-medium text-slate-800">Submission: </dt>
                        <dd className="inline">{review.milestone}</dd>
                      </div>
                      <div>
                        <dt className="inline font-medium text-slate-800">Submitted: </dt>
                        <dd className="inline">{formatDate(review.submittedDate)}</dd>
                      </div>
                      <div>
                        <dt className="inline font-medium text-slate-800">Review due: </dt>
                        <dd className="inline">{formatDate(review.reviewDue)}</dd>
                      </div>
                    </dl>
                    <p className="mt-3 text-sm font-medium text-violet-950">
                      Status: Pending. No assessment has been recorded.
                    </p>
                    {review.participationId && <Link className="mt-3 inline-block font-medium text-teal-900 underline" href={`/mentor/participations/${review.participationId}`}>Review submitted evidence</Link>}
                  </article>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section
          id="upcoming-deadlines"
          aria-labelledby="upcoming-deadlines-title"
          className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
        >
          <SectionHeading
            id="upcoming-deadlines-title"
            title="Upcoming deadlines"
            count={data.upcomingDeadlines.length}
          />
          {data.upcomingDeadlines.length === 0 ? (
            <EmptyState>There are no upcoming deadlines in this view.</EmptyState>
          ) : (
            <ul className="divide-y divide-slate-200">
              {data.upcomingDeadlines.map((deadline) => (
                <li key={deadline.id} className="flex flex-col gap-1 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                  <div>
                    <h3 className="font-medium text-slate-900">{deadline.label}</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{deadline.relatedTo}</p>
                  </div>
                  <time
                    dateTime={deadline.dueDate}
                    className="shrink-0 text-sm font-semibold text-slate-800"
                  >
                    {formatDate(deadline.dueDate)}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

    </main>
  );
}

export function MentorDashboard({ data, state, onChanged }: MentorDashboardProps) {
  if (state === "loading") {
    return <LoadingState />;
  }

  if (state === "error") {
    return <ErrorState />;
  }

  return <MentorDashboardContent data={data} onChanged={onChanged} />;
}
