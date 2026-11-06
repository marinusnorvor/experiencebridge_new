"use client";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { ExternalLink, FileText } from "lucide-react";
import type { SubmissionRead } from "@experiencebridge/api-client";
import { usePortalApi } from "@/lib/api/portal-api";
import { requireData, usePortalResource } from "@/lib/api/use-portal-resource";
import { termsSnapshot } from "@/features/student/lib/api-records";
import { Button } from "@/components/ui/button";
import { EmptyState, NextStepHint, Skeleton } from "@/components/ui/primitives";
import { StatusBadge } from "@/components/ui/status-badge";
import { Field, Textarea } from "@/components/ui/field";
import { cn } from "@/lib/utils/cn";

/** Live mentor review: the student's evidence plus a rubric scored against the milestone's acceptance criteria. */
export function MentorReviewPanel({ participationId }: { participationId: string }) {
  const live = usePortalResource(useCallback(async api => {
    const [submissions, participation] = await Promise.all([api.getSubmissions(participationId), api.getParticipation(participationId)]);
    const milestones = participation.data ? termsSnapshot(participation.data.agreed_terms).scope.milestones ?? [] : [];
    return Promise.all(requireData(submissions).filter(s => s.status !== "draft" && s.status !== "withdrawn").sort((a, b) => b.revision_no - a.revision_no).map(async submission => ({
      submission,
      milestone: milestones[submission.milestone_index],
      reviews: requireData(await api.getMentorReviews(submission.id)),
    })));
  }, [participationId]));

  return <div id="review" className="mt-5 space-y-5">
    {live.loading && <Skeleton className="h-40" />}
    {live.error && <p role="alert" className="rounded-xl bg-danger-bg p-3 text-sm text-danger-text">We couldn&rsquo;t load the submissions. <button className="font-medium underline" onClick={() => void live.reload().catch(() => {})}>Try again</button></p>}
    {live.data?.length === 0 && <EmptyState icon={FileText} title="Nothing to review yet" description="When the student submits work for a milestone, it appears here for your review." />}
    {live.data?.map(({ submission, milestone, reviews }) => (
      <article key={submission.id} className="rounded-[var(--radius-card)] border border-line bg-surface p-5 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h3 className="font-semibold text-ink-900">{milestone?.title ?? `Milestone ${submission.milestone_index + 1}`} · Version {submission.revision_no}</h3>
          <StatusBadge status={reviews.length ? reviews[0].decision : submission.status} />
        </div>
        <p className="mt-3 whitespace-pre-wrap text-sm text-ink-700">{submission.summary}</p>
        {submission.contribution_statement && <p className="mt-2 whitespace-pre-wrap text-sm text-ink-500"><span className="font-medium text-ink-700">Their contribution: </span>{submission.contribution_statement}</p>}
        {!!submission.artifacts?.length && (
          <ul className="mt-3 flex flex-wrap gap-2">{submission.artifacts.map(a => <li key={a.id}>{a.url
            ? <a className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-[13px] text-ink-700 hover:border-brand-600" href={a.url} target="_blank" rel="noopener noreferrer"><ExternalLink className="size-3.5" aria-hidden />{a.label}</a>
            : <span className="text-sm text-ink-700">{a.label}: {a.excerpt}</span>}</li>)}</ul>
        )}
        {reviews.map(r => (
          <div key={r.id} className="mt-4 rounded-xl bg-canvas p-4 text-sm">
            <p className="font-medium text-ink-900">Your review · {r.decision.replaceAll("_", " ")}</p>
            <p className="mt-1 whitespace-pre-wrap text-ink-700">{r.participant_feedback}</p>
            {!!r.observations?.length && <ul className="mt-2 space-y-1 text-ink-500">{r.observations.map((o, i) => <li key={i}>{o.criterion_text}{o.score != null && ` — ${o.score}/5`}</li>)}</ul>}
          </div>
        ))}
        {!reviews.length && submission.status === "submitted" && <>
          <div className="mt-4"><NextStepHint waitingOn="You" detail="The student is waiting for your review. The organisation reviews after you." /></div>
          <ReviewForm submission={submission} criteria={milestone?.acceptance_criteria ?? []} onSaved={live.reload} />
        </>}
      </article>
    ))}
  </div>;
}

type Row = { score: number | null; note: string };

function ReviewForm({ submission, criteria, onSaved }: { submission: SubmissionRead; criteria: string[]; onSaved: () => Promise<unknown> }) {
  const { getApi } = usePortalApi();
  const [decision, setDecision] = useState<"reviewed" | "revision_requested" | "unable_to_assess">("reviewed");
  const [feedback, setFeedback] = useState("");
  const [summary, setSummary] = useState("");
  const [rows, setRows] = useState<Row[]>(() => criteria.map(() => ({ score: null, note: "" })));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const setRow = (i: number, patch: Partial<Row>) => setRows(r => r.map((row, j) => (j === i ? { ...row, ...patch } : row)));

  return <form className="mt-4 space-y-5" onSubmit={async e => {
    e.preventDefault(); if (saving.current) return;
    if (feedback.trim().length < 10) { setError("Write at least a sentence of feedback for the student (10+ characters)."); return; }
    if (summary.trim() && summary.trim().length < 10) { setError("The note for the organisation needs at least 10 characters, or leave it empty."); return; }
    const scored = rows.map((row, i) => ({ ...row, criterion: criteria[i] })).filter(r => r.score != null);
    if (scored.some(r => r.note.trim().length < 5)) { setError("Add a short note (5+ characters) for each criterion you score."); return; }
    saving.current = true; setBusy(true); setError("");
    try {
      const api = await getApi();
      const observations = scored.map(r => ({ criterion_text: r.criterion, score: r.score, observation: r.note.trim() }));
      const saved = requireData(await api.submitMentorReview(submission.id, submission.row_version, decision, feedback.trim(), observations, summary.trim() || undefined));
      const recorded = requireData(await api.getMentorReviews(submission.id));
      if (!recorded.some(r => r.id === saved.id)) throw new Error("not confirmed");
      toast.success(decision === "revision_requested" ? "Revision requested" : "Review sent");
      await onSaved();
    } catch { setError("We couldn't save your review. Reload the page to check whether it was recorded, then try again."); }
    finally { saving.current = false; setBusy(false); }
  }}>
    {criteria.length > 0 && (
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-ink-900">Score each acceptance criterion <span className="font-normal text-ink-500">(1 = not yet, 5 = excellent)</span></legend>
        {criteria.map((criterion, i) => (
          <div key={criterion} className="rounded-xl border border-line p-3">
            <p className="text-sm text-ink-800">{criterion}</p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label={`Score for ${criterion}`}>
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} type="button" role="radio" aria-checked={rows[i]?.score === n} onClick={() => setRow(i, { score: rows[i]?.score === n ? null : n })}
                  className={cn("size-9 rounded-lg border text-sm font-medium tabular-nums", rows[i]?.score === n ? "border-brand-600 bg-brand-600 text-white" : "border-line-strong text-ink-700 hover:border-brand-600")}>{n}</button>
              ))}
            </div>
            {rows[i]?.score != null && <input aria-label={`Note for ${criterion}`} className="mt-2 h-10 w-full rounded-lg border border-line-strong px-3 text-[16px]" placeholder="What did you see? (e.g. all fields validate with clear messages)" value={rows[i].note} maxLength={2000} onChange={e => setRow(i, { note: e.target.value })} />}
          </div>
        ))}
      </fieldset>
    )}
    <Field label="Your decision">{a => (
      <select {...a} className="h-11 w-full rounded-[var(--radius-control)] border border-line-strong bg-surface px-3 text-[16px]" value={decision} onChange={e => setDecision(e.target.value as typeof decision)}>
        <option value="reviewed">Reviewed — ready for the organisation</option>
        <option value="revision_requested">Ask the student for a revision</option>
        <option value="unable_to_assess">I can&rsquo;t assess this</option>
      </select>)}</Field>
    <Field label="Feedback for the student" hint="What went well and what to improve. The student sees this.">{a => <Textarea {...a} rows={4} maxLength={5000} value={feedback} onChange={e => setFeedback(e.target.value)} />}</Field>
    <Field label="Note for the organisation" optional>{a => <Textarea {...a} rows={2} maxLength={2000} value={summary} onChange={e => setSummary(e.target.value)} />}</Field>
    <p className="text-[13px] text-ink-500">Your review is separate from the organisation&rsquo;s decision to accept the work.</p>
    {error && <p role="alert" className="rounded-xl bg-danger-bg p-3 text-sm text-danger-text">{error}</p>}
    <Button type="submit" loading={busy}>{busy ? "Sending review…" : "Send review"}</Button>
  </form>;
}
