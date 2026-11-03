"use client";
import { useCallback, useRef, useState } from "react";
import type { SubmissionRead } from "@experiencebridge/api-client";
import { usePortalApi } from "@/lib/api/portal-api";
import { requireData, usePortalResource } from "@/lib/api/use-portal-resource";

export function MentorReviewPanel({ participationId }: { participationId: string }) {
  const live = usePortalResource(useCallback(async api => {
    const submissions = requireData(await api.getSubmissions(participationId));
    return Promise.all(submissions.filter(s => s.status !== "draft" && s.status !== "withdrawn").map(async submission => ({
      submission, reviews: requireData(await api.getMentorReviews(submission.id)),
    })));
  }, [participationId]));
  return <div className="mt-5 space-y-5">
    {live.loading && <p role="status">Loading submitted evidence...</p>}
    {live.error && <p role="alert">{live.error} <button onClick={() => void live.reload().catch(() => {})}>Retry</button></p>}
    {live.data?.length === 0 && <p>No evidence has been submitted for assessment.</p>}
    {live.data?.map(({ submission, reviews }) => <article key={submission.id} className="rounded-lg border border-slate-300 bg-white p-4">
      <h3 className="font-semibold">Milestone {submission.milestone_index + 1} ? Revision {submission.revision_no}</h3>
      <p className="mt-2 whitespace-pre-wrap">{submission.summary}</p>
      <p className="mt-2 whitespace-pre-wrap">{submission.contribution_statement}</p>
      <ul>{submission.artifacts?.map(a => <li key={a.id}>{a.url ? <a className="underline" href={a.url} target="_blank" rel="noopener noreferrer">{a.label}</a> : <p>{a.label}: {a.excerpt}</p>}</li>)}</ul>
      {reviews.map(r => <div key={r.id} className="mt-3 border-t pt-3"><p>Assessment: {r.decision.replaceAll("_", " ")}</p><p className="whitespace-pre-wrap">{r.participant_feedback}</p>{r.manager_summary && <p>Organization summary: {r.manager_summary}</p>}</div>)}
      {!reviews.length && submission.status === "submitted" && <ReviewForm submission={submission} onSaved={live.reload} />}
    </article>)}
  </div>;
}

function ReviewForm({ submission, onSaved }: { submission: SubmissionRead; onSaved: () => Promise<unknown> }) {
  const { getApi } = usePortalApi();
  const [decision, setDecision] = useState<"reviewed" | "revision_requested" | "unable_to_assess">("reviewed");
  const [feedback, setFeedback] = useState("");
  const [summary, setSummary] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  return <form className="mt-4 space-y-3" onSubmit={async e => {
    e.preventDefault(); if (saving.current) return;
    saving.current = true; setBusy(true); setError("");
    try {
      const api = await getApi();
      const saved = requireData(await api.submitMentorReview(submission.id, submission.row_version, decision, feedback, [], summary || undefined));
      const recorded = requireData(await api.getMentorReviews(submission.id));
      if (!recorded.some(r => r.id === saved.id)) throw new Error("The assessment could not be confirmed. Reload before retrying.");
      await onSaved();
    } catch (err) { setError(err instanceof Error ? err.message : "Assessment failed."); }
    finally { saving.current = false; setBusy(false); }
  }}>
    <label className="block">Assessment decision<select className="mt-1 block w-full rounded border p-2" value={decision} onChange={e => setDecision(e.target.value as typeof decision)}><option value="reviewed">Reviewed</option><option value="revision_requested">Revision requested</option><option value="unable_to_assess">Unable to assess</option></select></label>
    <label className="block">Private learner feedback<textarea className="mt-1 block w-full rounded border p-2" required minLength={10} maxLength={5000} value={feedback} onChange={e => setFeedback(e.target.value)} /></label>
    <label className="block">Organization summary (optional, shared with the organization)<textarea className="mt-1 block w-full rounded border p-2" minLength={10} maxLength={2000} value={summary} onChange={e => setSummary(e.target.value)} /></label>
    <p className="text-sm text-slate-600">This records your assessment. Organization acceptance remains a separate decision.</p>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    <button type="submit" disabled={busy} className="rounded border border-teal-800 px-4 py-2 font-medium text-teal-900 disabled:opacity-50">{busy ? "Recording assessment..." : "Record assessment"}</button>
  </form>;
}
