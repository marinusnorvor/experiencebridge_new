"use client";
import { useCallback, useRef, useState } from "react";
import { requireData, usePortalResource } from "@/lib/api/use-portal-resource";
import { useOrganizationDemo } from "../hooks/organization-demo-context";
import { loadProjectTeam } from "../lib/team-api";
import { Badge, Button, Field, Modal, portalStyles as s } from "../components/ui/portal-ui";

export function OrganizationTeamLive({ projectId }: { projectId: string }) {
  const { refetch } = useOrganizationDemo();
  const live = usePortalResource(useCallback(api => loadProjectTeam(api, projectId), [projectId]));
  const [participation, setParticipation] = useState("");
  const [mentor, setMentor] = useState("");
  const [context, setContext] = useState("");
  const [expires, setExpires] = useState("");
  const [ending, setEnding] = useState<string>();
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  async function save(end = false) {
    if (saving.current || !live.data) return;
    saving.current = true; setBusy(true); setError(""); setMessage("");
    try {
      const api = await live.getApi();
      if (end) {
        const assignment = live.data.assignments.find(a => a.id === ending);
        if (!assignment) throw new Error("Reload the assignment before ending it.");
        requireData(await api.endMentorAssignment(assignment.id, assignment.row_version, reason));
        if (requireData(await api.getMentorAssignment(assignment.id)).status !== "ended") throw new Error("Assignment end was not confirmed.");
      } else {
        const part = live.data.participations.find(p => p.id === participation);
        if (!part || !mentor) throw new Error("Select a participant and approved mentor.");
        const saved = requireData(await api.inviteMentor(part.id, mentor, context, new Date(`${expires}T23:59:59Z`).toISOString(), part.row_version));
        if (requireData(await api.getMentorAssignment(saved.id)).status !== "proposed") throw new Error("Invitation was not confirmed.");
      }
      await live.reload(); await refetch(); setEnding(undefined); setContext(""); setMessage(end ? "Assignment ended and recorded." : "Invitation recorded. The mentor must accept independently in their portal.");
    } catch (err) { setError(err instanceof Error ? err.message : "Action failed."); }
    finally { saving.current = false; setBusy(false); }
  }
  const data = live.data;
  return <div className={s.stack}>
    {live.loading && !data && <p role="status">Loading project team...</p>}
    {(live.error || error) && <p role="alert" className={s.feedback}>{live.error || error}</p>}
    {message && <p role="status" className={s.feedback}>{message}</p>}
    <Button disabled={busy} onClick={() => void live.reload().catch(() => {})}>Refresh team</Button>
    <section className={s.card}><h2>Confirmed participants</h2>{data?.participations.map(p => <p key={p.id}>Participant {p.student_user_id.slice(0, 6).toUpperCase()} <Badge>{p.status.replaceAll("_", " ")}</Badge></p>)}{data && !data.participations.length && <p>No student has accepted an offer yet. Invite a mentor after a participation exists.</p>}</section>
    <section className={s.card}><h2>Mentor invitations and assignments</h2>{data?.assignments.map(a => <div key={a.id} className={s.cardFooter}><div><strong>Mentor {a.mentor_user_id.slice(0, 6).toUpperCase()}</strong><p>{a.context}</p><small>Invitation expires {new Date(a.expires_at).toLocaleDateString()}</small></div><Badge>{a.status}</Badge>{data.canManage && a.status === "accepted" && <Button disabled={busy} onClick={() => {setEnding(a.id);setReason("");setError("");}}>End assignment</Button>}</div>)}{data && !data.assignments.length && <p>No mentor invitation has been recorded.</p>}</section>
    {data?.canManage && <form className={s.card} onSubmit={e => {e.preventDefault();void save();}}><h2>Invite an approved mentor</h2>
      <Field label="Participant">{props => <select {...props} required value={participation} onChange={e => setParticipation(e.target.value)}><option value="">Choose participant</option>{data.participations.filter(p => ["active","under_review"].includes(p.status) && !data.assignments.some(a => a.participation_id === p.id && ["proposed","accepted"].includes(a.status))).map(p => <option key={p.id} value={p.id}>Student {p.student_user_id.slice(0,8)}</option>)}</select>}</Field>
      <Field label="Approved mentor">{props => <select {...props} required value={mentor} onChange={e => setMentor(e.target.value)}><option value="">Choose mentor</option>{data.mentors.map(m => <option key={m.id} value={m.user_id}>{m.skills.join(", ")} | {m.availability_text} | {m.user_id.slice(0,8)}</option>)}</select>}</Field>
      {!data.mentors.length && <p className={s.help}>No approved mentors have opted into this directory. A mentor must save a profile and receive independent admin approval first.</p>}
      <Field label="Expected commitment and scope">{props => <textarea {...props} required minLength={10} maxLength={2000} value={context} onChange={e => setContext(e.target.value)} />}</Field>
      <Field label="Invitation expiry">{props => <input {...props} required type="date" value={expires} onChange={e => setExpires(e.target.value)} />}</Field>
      <Button primary type="submit" disabled={busy || !data.mentors.length}>Send assignment invitation</Button><p className={s.help}>The invitation is recorded in the mentor portal. No email is sent.</p>
    </form>}
    {ending && <Modal title="End this mentor assignment?" onClose={() => {if (!busy) setEnding(undefined);}}><form className={s.stack} onSubmit={e => {e.preventDefault();void save(true);}}><Field label="Reason">{props => <textarea {...props} required minLength={10} maxLength={2000} value={reason} onChange={e => setReason(e.target.value)} />}</Field>{error && <p role="alert">{error}</p>}<Button primary type="submit" disabled={busy}>Confirm end</Button></form></Modal>}
  </div>;
}
