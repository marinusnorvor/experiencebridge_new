import Link from "next/link";

import type { MentorDashboardData } from "../lib/sample-dashboard-data";

type AssignmentProposal = MentorDashboardData["proposals"][number];

export function ProposalDecisionButtons() {
  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          disabled
          className="min-h-11 cursor-not-allowed rounded-lg bg-teal-800 px-5 py-2.5 text-sm font-semibold text-white opacity-70"
        >
          Accept proposal · Coming soon
        </button>
        <button
          type="button"
          disabled
          className="min-h-11 cursor-not-allowed rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 opacity-70"
        >
          Decline proposal · Coming soon
        </button>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-600">
        Display-only controls. No decision can be made or recorded here.
      </p>
    </div>
  );
}

export function AssignmentProposalDetail({
  proposal,
}: {
  proposal: AssignmentProposal;
}) {
  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <Link
        href="/mentor/dashboard#assignment-proposals"
        className="inline-flex min-h-11 items-center rounded-md text-sm font-medium text-teal-900 underline decoration-teal-700 underline-offset-4 hover:text-teal-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-800"
      >
        Back to mentor dashboard
      </Link>

      <header className="mt-6">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-800">
          Mentor workspace · MEN-02
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          Assignment proposal
        </h1>
      </header>

      <aside
        aria-label="Sample data notice"
        className="mt-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-950"
      >
        <p className="font-semibold">Synthetic sample proposal</p>
        <p>
          This example does not represent a real organization, learner, assignment, or outcome.
        </p>
      </aside>

      <article className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="rounded-full bg-sky-50 px-3 py-1 text-sm font-semibold text-sky-900">
            Proposed · awaiting your decision
          </span>
          <p className="text-sm text-slate-600">
            Response requested by{" "}
            <time dateTime={proposal.responseDue}>{formatDate(proposal.responseDue)}</time>
          </p>
        </div>

        <h2 className="mt-5 text-2xl font-semibold tracking-tight text-slate-900">
          {proposal.projectTitle}
        </h2>
        <p className="mt-3 leading-7 text-slate-600">{proposal.projectSummary}</p>

        <dl className="mt-6 grid gap-4 border-t border-slate-200 pt-5 sm:grid-cols-2">
          <DetailItem label="Organization" value={proposal.organizationLabel} />
          <DetailItem label="Learner" value={proposal.learnerLabel} />
          <DetailItem label="Expected commitment" value={proposal.expectedCommitment} />
          <DetailItem label="Estimated project time" value={proposal.estimatedHours} />
          <DetailItem label="Sample participant count" value={String(proposal.participantCount)} />
          <DetailItem label="Review expectations" value={proposal.reviewExpectations} />
          <div className="sm:col-span-2">
            <DetailItem
              label="Confidentiality and sample materials"
              value={proposal.confidentialitySummary}
            />
          </div>
        </dl>

        <section
          aria-labelledby="proposal-decision-title"
          className="mt-7 border-t border-slate-200 pt-5"
        >
          <h3 id="proposal-decision-title" className="mb-4 font-semibold text-slate-900">
            Assignment decision
          </h3>
          <ProposalDecisionButtons />
        </section>
      </article>
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
  return new Intl.DateTimeFormat("en-GH", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00Z`));
}
