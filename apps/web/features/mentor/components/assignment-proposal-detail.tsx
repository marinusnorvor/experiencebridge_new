"use client";

import { useRef, useState } from "react";
import { requireData } from "@/lib/api/use-portal-resource";
import Link from "next/link";
import { usePortalApi } from "@/lib/api/portal-api";
import type { MentorDashboardData } from "../lib/sample-dashboard-data";

type AssignmentProposal = MentorDashboardData["proposals"][number];

export function ProposalDecisionButtons({ assignmentId, onChanged }: { assignmentId?: string; onChanged?: () => void }) {
  const { getApi, isSignedIn } = usePortalApi();
  const [loading, setLoading] = useState(false);
  const acting = useRef(false);
  const [declaration, setDeclaration] = useState(false);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isRealUuid = Boolean(
    assignmentId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(assignmentId)
  );

  const handleDecision = async (decision: "accept" | "decline") => {
    if (acting.current) return;
    acting.current = true; setLoading(true); setError(null); setMessage(null);
    try {
      if (!assignmentId || !isRealUuid || !isSignedIn) throw new Error("This is a preview or you are signed out. No assignment was changed.");
      const api = await getApi();
      const current = requireData(await api.getMentorAssignment(assignmentId));
      if (current.status !== "proposed") throw new Error(`This assignment is already ${current.status}. Refresh the dashboard.`);
      if (decision === "accept") {
        if (!declaration) throw new Error("Confirm independence and confidentiality before accepting.");
        requireData(await api.acceptMentorAssignment(assignmentId, current.row_version, { conflict_declared: false, confidentiality_acknowledged: true }));
      } else {
        if (reason.trim().length < 10) throw new Error("Enter a decline reason of at least 10 characters.");
        requireData(await api.declineMentorAssignment(assignmentId, current.row_version, reason.trim()));
      }
      const recorded = requireData(await api.getMentorAssignment(assignmentId));
      if (recorded.status !== (decision === "accept" ? "accepted" : "declined")) throw new Error("The server did not confirm this decision.");
      setMessage(`Assignment ${recorded.status}, confirmed by the API.`); onChanged?.();
    } catch (e) { setError(e instanceof Error ? e.message : "Decision could not be confirmed."); }
    finally { acting.current = false; setLoading(false); }
  };

  return (
    <div>
      <label className="mb-3 flex gap-2 text-sm"><input type="checkbox" checked={declaration} onChange={e => setDeclaration(e.target.checked)} />I confirm I have no conflict of interest and acknowledge the confidentiality requirements.</label>
      <label className="mb-3 block text-sm">Reason if declining<textarea value={reason} onChange={e => setReason(e.target.value)} minLength={10} maxLength={2000} className="mt-1 block w-full rounded border border-slate-300 p-2" /></label>
      {message && (
        <div role="status" className="mb-4 rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm font-medium text-emerald-950">
          ✓ {message}
        </div>
      )}

      {error && (
        <div role="alert" className="mb-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm font-medium text-red-950">
          ⚠ {error}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          disabled={loading}
          onClick={() => handleDecision("accept")}
          className="min-h-11 rounded-lg bg-teal-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 transition disabled:opacity-50"
        >
          {loading ? "Processing…" : "Accept proposal"}
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => handleDecision("decline")}
          className="min-h-11 rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
        >
          {loading ? "Processing…" : "Decline proposal"}
        </button>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-600">
        Accepting acknowledges confidentiality terms and confirms no conflict of interest exists.
      </p>
    </div>
  );
}

export function AssignmentProposalDetail({
  proposal,
  onChanged,
}: {
  proposal: AssignmentProposal;
  onChanged?: () => void;
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
        <p className="font-semibold">Mentorship Assignment Context</p>
        <p>
          Review the project summary, participant commitment expectations, and confidentiality terms before deciding.
        </p>
      </aside>

      <article className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="rounded-full bg-sky-50 px-3 py-1 text-sm font-semibold text-sky-900">
            Proposed · awaiting your decision
          </span>
          <span className="text-xs text-slate-500 font-mono">ID: {proposal.id}</span>
        </div>

        <h2 className="mt-5 text-2xl font-semibold tracking-tight text-slate-900">
          {proposal.projectTitle}
        </h2>

        <dl className="mt-6 grid gap-5 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Organization</dt>
            <dd className="mt-1 text-sm font-medium text-slate-900">{proposal.organizationLabel}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Learner</dt>
            <dd className="mt-1 text-sm font-medium text-slate-900">{proposal.learnerLabel}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Estimated Commitment</dt>
            <dd className="mt-1 text-sm font-medium text-slate-900">{proposal.estimatedHours}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Response Due</dt>
            <dd className="mt-1 text-sm font-medium text-slate-900">{proposal.responseDue}</dd>
          </div>
        </dl>

        <section className="mt-6 border-t border-slate-100 pt-6">
          <h3 className="text-sm font-semibold text-slate-900">Project Summary & Context</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">{proposal.projectSummary}</p>
        </section>

        <section className="mt-6 border-t border-slate-100 pt-6">
          <h3 className="text-sm font-semibold text-slate-900">Review Expectations</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">{proposal.reviewExpectations}</p>
        </section>

        <section className="mt-8 border-t border-slate-100 pt-6">
          <ProposalDecisionButtons assignmentId={proposal.id} onChanged={onChanged} />
        </section>
      </article>
    </main>
  );
}
