"use client";

import { useRef, useState } from "react";
import { requireData, type PortalApi } from "../../../lib/api/use-portal-resource";
import type { ParticipationWorkspaceDetails } from "../lib/types";

export function StudentParticipationActions({ workspace, getApi, reload }: {
  workspace: ParticipationWorkspaceDetails; getApi: () => Promise<PortalApi>; reload: () => Promise<unknown>;
}) {
  const [action, setAction] = useState<"ready" | "partial" | "withdraw" | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const acting = useRef(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!action || acting.current || workspace.rowVersion === undefined) return;
    acting.current = true; setBusy(true); setError("");
    try {
      const api = await getApi();
      requireData(await (action !== "withdraw"
        ? api.markParticipationReady(workspace.participationId, workspace.rowVersion, reason, action === "partial" ? "partially_completed" : "completed")
        : api.withdrawParticipation(workspace.participationId, workspace.rowVersion, reason)));
      const recorded = requireData(await api.getParticipation(workspace.participationId));
      if (recorded.status !== (action !== "withdraw" ? "under_review" : "withdrawn")) throw new Error("We couldn't confirm that change. Refresh the page and try again.");
      await reload(); setAction(null); setReason("");
    } catch (e) { setError(e instanceof Error ? e.message : "Action failed."); }
    finally { acting.current = false; setBusy(false); }
  }
  return <div className="space-y-2 text-xs">
    {!workspace.canSubmit && <p className="text-slate-600">{workspace.status === "active" ? "Waiting for the organisation to start this project." : `Status: ${workspace.status.replaceAll("_", " ")}`}</p>}
    {workspace.status === "active" && workspace.progressPercent === 100 && <button type="button" className="rounded-lg border border-teal-700 px-3 py-2 text-teal-800" onClick={() => setAction("ready")}>I&apos;ve finished: ask for final review</button>}
    {workspace.canSubmit && <button type="button" className="ml-2 rounded-lg border px-3 py-2" onClick={() => setAction("partial")}>Finish early</button>}
    {["active", "under_review"].includes(workspace.status) && <button type="button" className="ml-2 rounded-lg border border-rose-200 px-3 py-2 text-rose-700" onClick={() => setAction("withdraw")}>Leave project</button>}
    {action && <form onSubmit={submit} className="space-y-2 rounded-lg border border-slate-200 p-3">
      <p>{action === "partial" ? "Ask the organisation to record what you completed. You won't be able to submit more work; explain what's unfinished." : action === "ready" ? "Ask the organisation to finalise your project. Once they do, it's added to your Passport." : "Leave this project. You can't undo this."}</p>
      <label className="block">Reason<textarea required minLength={10} maxLength={2000} value={reason} onChange={e => setReason(e.target.value)} className="mt-1 block w-full rounded border p-2" /></label>
      {error && <p role="alert" className="text-red-700">{error}</p>}
      <button type="button" disabled={busy} onClick={() => {setAction(null);setError("");}} className="mr-3 underline">Cancel</button>
      <button type="submit" disabled={busy} className="rounded-lg bg-teal-800 px-3 py-2 text-white">{busy ? "Saving..." : "Confirm"}</button>
    </form>}
  </div>;
}
