"use client";
import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { requireData, usePortalResource } from "@/lib/api/use-portal-resource";
import { useOrganizationDemo } from "../hooks/organization-demo-context";
import { OrganizationTeamLive } from "./organization-team-live";
import { ActionLink, Badge, Button, Field, Modal, PortalPage, portalStyles as s } from "../components/ui/portal-ui";

export function OrganizationWorkspaceLive({ id }: { id: string }) {
  const { state, refetch } = useOrganizationDemo();
  const params = useSearchParams();
  const tab = params.get("tab") ?? "overview";
  const tabs = ["overview","team","milestones","updates","deliverables","discussion"];
  const live = usePortalResource(useCallback(async api => ({project:requireData(await api.getProject(id)),parts:requireData(await api.getProjectParticipations(id))}),[id]));
  const [action, setAction] = useState<{kind:"start"|"complete"|"finalize";id?:string}>();
  const [outcome,setOutcome] = useState<"completed" | "partially_completed">("completed");
  const [reason,setReason] = useState(""); const [error,setError] = useState(""); const [message,setMessage] = useState("");
  const [busy,setBusy] = useState(false); const saving = useRef(false);
  const view = state.projects.find(p => p.id === id);
  async function confirm() {
    if (!action || !live.data || saving.current) return;
    saving.current=true;setBusy(true);setError("");setMessage("");
    try {
      const api = await live.getApi();
      const project = live.data.project;
      if (action.kind === "start") requireData(await api.startProject(id,project.row_version));
      else if (action.kind === "complete") requireData(await api.completeProject(id,reason,project.row_version));
      else {
        const part = live.data.parts.find(p => p.id === action.id);
        if (!part) throw new Error("Reload the participation.");
        requireData(await api.finalizeParticipation(part.id,part.row_version,reason,outcome));
      }
      const updated = await live.reload(); await refetch();
      const expected = action.kind === "start" ? "in_progress" : action.kind === "finalize" ? outcome : "completed";
      if ((action.kind === "finalize" ? updated.parts.find(p => p.id === action.id)?.status : updated.project.status) !== expected) throw new Error("The transition could not be confirmed.");
      setAction(undefined);setMessage("Status change saved and confirmed by the API.");
    } catch(err) {setError(err instanceof Error ? err.message : "Transition failed.");}
    finally {saving.current=false;setBusy(false);}
  }
  return <PortalPage title={view?.title ?? "Project workspace"} description="Project progress, people and recorded evidence." action={<ActionLink href={`/organization/projects/${id}`}>Read the brief</ActionLink>}>
    {(live.error || error) && <p role="alert" className={s.feedback}>{live.error || error}</p>}{message && <p role="status" className={s.feedback}>{message}</p>}
    <div className={s.workspaceHeader}><Badge>{live.data?.project.status ?? "Loading"}</Badge><div className={s.actions}><Button disabled={busy} onClick={() => void live.reload().catch(() => {})}>Refresh status</Button>{live.data && ["open","closed_to_applications"].includes(live.data.project.status) && <Button primary onClick={() => setAction({kind:"start"})}>Start project</Button>}{live.data?.project.status === "in_progress" && <Button onClick={() => {setReason("");setAction({kind:"complete"});}}>Complete project</Button>}</div></div>
    <nav className={s.tabs} aria-label="Project workspace sections">{tabs.map(value => <Link key={value} className={s.tab} aria-current={tab===value?"page":undefined} href={`/organization/projects/${id}/workspace?tab=${value}`}>{value}</Link>)}</nav>
    {tab === "team" ? <OrganizationTeamLive projectId={id} /> : tab === "deliverables" ? <div className={s.list}>{state.submissions.filter(s => s.projectId===id).map(sub => <article className={s.card} key={sub.id}><h2>{sub.title}</h2><Badge>{sub.status}</Badge><p>{sub.student}</p><ActionLink href={`/organization/reviews?submission=${sub.id}`}>Review evidence</ActionLink></article>)}{!state.submissions.some(s => s.projectId===id) && <p>No deliverables submitted yet.</p>}</div> : tab === "updates" || tab === "discussion" ? <section className={s.card}><h2>{tab === "updates" ? "Project updates" : "Discussion"}</h2><p>Posting is not available yet. Please arrange updates with your team outside this workspace.</p></section> : <div className={s.stack}>
      <section className={s.card}><h2>Scope and milestones</h2><p>{view?.deliverables}</p><p>{view?.criteria}</p>{view?.milestones.map(m => <p key={m.id}>{m.title} | Due {m.due}</p>)}</section>
      <section className={s.card}><h2>Participant completion</h2><p className={s.help}>Start requires accepted mentor assignments and resolved offers. Students request completion after the latest evidence has both reviews; the manager then finalizes each participation.</p>{live.data?.parts.map(p => <div key={p.id} className={s.cardFooter}><span>Student {p.student_user_id.slice(0,8)} <Badge>{p.status}</Badge></span>{p.status === "under_review" && <Button onClick={() => {setReason("");setAction({kind:"finalize",id:p.id});}}>Finalize participation</Button>}</div>)}{live.data?.parts.length === 0 && <p>No accepted student offers yet.</p>}</section>
    </div>}
    {action && <Modal title={action.kind === "start" ? "Start project?" : "Confirm completion"} onClose={() => {if(!busy)setAction(undefined);}}><form className={s.stack} onSubmit={e => {e.preventDefault();void confirm();}}><p>Confirm this project status change. Completion requires reviewed and accepted evidence for each participant.</p>{action.kind === "finalize" && <Field label="Participation outcome">{props => <select {...props} value={outcome} onChange={e=>setOutcome(e.target.value as typeof outcome)}><option value="completed">Completed: all milestones reviewed and accepted</option><option value="partially_completed">Partially completed: some work remains unfinished</option></select>}</Field>}{action.kind !== "start" && <Field label="Completion explanation">{props => <textarea {...props} required minLength={10} maxLength={2000} value={reason} onChange={e=>setReason(e.target.value)} />}</Field>}{error && <p role="alert">{error}</p>}<Button primary type="submit" disabled={busy}>Confirm {action.kind}</Button></form></Modal>}
  </PortalPage>;
}
