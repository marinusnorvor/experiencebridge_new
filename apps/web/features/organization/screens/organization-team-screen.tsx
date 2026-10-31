"use client";
import { useState } from "react";
import { useOrganizationDemo } from "../hooks/organization-demo-context";
import { useDemoAction } from "../hooks/use-demo-action";
import { inviteMentor } from "../lib/demo-transitions";
import { ActionLink, Badge, Button, Empty, Field, Modal, PortalPage, portalStyles as s } from "../components/ui/portal-ui";

export function OrganizationTeamContent({ projectId }: { projectId: string }) {
  const { state } = useOrganizationDemo();
  const project = state.projects.find((item) => item.id === projectId);
  const [query, setQuery] = useState("");
  const [eligibleOnly, setEligibleOnly] = useState(true);
  const [mentorId, setMentorId] = useState<string | null>(null);
  const [commitment, setCommitment] = useState("");
  const { run, error, clearError } = useDemoAction();
  if (!project) return <Empty title="Project unavailable">Choose a project from My Projects.</Empty>;
  const invitations = state.invitations.filter((item) => item.projectId === projectId);
  const offers = state.applications.filter((item) => item.projectId === projectId && item.status === "Offered");
  const mentor = state.mentors.find((item) => item.id === mentorId);
  const open = ["Active", "Recruiting", "Published"].includes(project.status);
  const mentors = state.mentors.filter((item) => (!eligibleOnly || item.eligible) && `${item.name} ${item.skills}`.toLowerCase().includes(query.toLowerCase().trim()));
  return <div className={s.stack}>
    <div className={s.grid}><section className={s.card}><div className={s.cardTop}><h2>Confirmed sample team</h2><Badge>{project.members.length} students</Badge></div>{project.members.length ? <ul>{project.members.map((name) => <li key={name}>{name} · pre-existing synthetic membership</li>)}</ul> : <p className={s.muted}>No students have accepted an offer in this sample project.</p>}<p className={s.muted}>Membership is read-only here. You cannot accept on a student’s behalf.</p></section><section className={s.card}><h2>Offers awaiting a response</h2>{offers.length ? offers.map((item) => <div className={s.cardFooter} key={item.id}><span>{item.name}<small className={s.help}>Terms v{item.termsVersion} · expires {item.offerExpiry}</small></span><Badge tone="warning">Awaiting student</Badge></div>) : <p className={s.muted}>No outstanding offers.</p>}<div className={s.cardFooter}><ActionLink href={`/organization/applications?project=${projectId}`}>Review applications</ActionLink></div></section></div>
    <section className={s.card}><h2>Mentor invitations & assignments</h2><p className={s.muted}>Only accepted sample assignments appear as team members. Pending invitations do not grant access.</p>{invitations.map((item) => <div key={item.id} className={s.cardFooter}><div><strong>{state.mentors.find((mentor) => mentor.id === item.mentorId)?.name}</strong><p className={s.muted}>{item.context}</p></div><Badge tone={item.status === "Accepted" ? "positive" : item.status === "Pending" ? "warning" : "muted"}>{item.status}</Badge></div>)}{!invitations.length && <p>No mentor invitations yet.</p>}</section>
    <section className={s.card}><h2>Find a thoughtful collaborator</h2><p className={s.muted}>Sample expertise and availability. A real invitation requires approved eligibility checks and the mentor’s own acceptance.</p><div className={s.toolbar}><label className={s.search}><span className={s.label}>Search mentor expertise</span><input className={s.input} type="search" value={query} onChange={(event) => setQuery(event.target.value)} /></label><label className={s.check}><input type="checkbox" checked={eligibleOnly} onChange={(event) => setEligibleOnly(event.target.checked)} />Available sample mentors only</label></div><div className={s.list}>{mentors.map((item) => { const existing = invitations.find((invite) => invite.mentorId === item.id && ["Pending", "Accepted"].includes(invite.status)); return <div key={item.id} className={s.cardFooter}><div><h3>{item.name}</h3><p>{item.skills}</p><p className={s.muted}>{item.availability}</p></div>{existing ? <Badge>{existing.status === "Accepted" ? "Assigned" : "Invitation pending"}</Badge> : <Button disabled={!open || !item.eligible} onClick={() => { clearError(); setCommitment(""); setMentorId(item.id); }}>{!item.eligible ? "Unavailable" : !open ? "Project not open" : "Invite mentor"}</Button>}</div>; })}</div>{!mentors.length && <Empty title="No mentors match" action={<Button onClick={() => { setQuery(""); setEligibleOnly(false); }}>Clear filters</Button>}>Try a broader expertise search.</Empty>}</section>
    {mentor && <Modal title={`Invite ${mentor.name}`} onClose={() => setMentorId(null)}><form className={s.stack} onSubmit={(event) => { event.preventDefault(); if (run((state, context) => inviteMentor(state, context, projectId, mentor.id, commitment), "Sample invitation recorded as pending. No email sent and no access granted.")) setMentorId(null); }}><p>{project.title} · {mentor.availability}</p><Field label="Expected commitment and context" hint="Describe meeting frequency, duration, scope, and feedback needs.">{(props) => <textarea {...props} required minLength={10} maxLength={2000} value={commitment} onChange={(event) => setCommitment(event.target.value)} />}</Field><p className={s.muted}>This creates a local pending invitation. The mentor must accept independently.</p>{error && <p role="alert" className={s.feedback} data-error="true">{error}</p>}<div className={s.actions}><Button onClick={() => setMentorId(null)}>Cancel</Button><Button primary type="submit">Confirm sample invitation</Button></div></form></Modal>}
  </div>;
}
export function OrganizationTeamScreen({ id }: { id: string }) {
  const { state } = useOrganizationDemo();
  return <PortalPage title="People behind the project" description={state.projects.find((item) => item.id === id)?.title ?? "Project unavailable"} action={<ActionLink href={`/organization/projects/${id}`}>Project brief</ActionLink>}><OrganizationTeamContent projectId={id} /></PortalPage>;
}
