"use client";
import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useOrganizationDemo } from "../hooks/organization-demo-context";
import { useDemoAction } from "../hooks/use-demo-action";
import { closeProject, postProjectText, updateMilestone } from "../lib/demo-transitions";
import { OrganizationTeamContent } from "./organization-team-screen";
import { ProjectDiscussion } from "../components/ui/project-discussion";
import { ActionLink, Badge, Button, Empty, Field, Modal, PortalPage, portalStyles as s } from "../components/ui/portal-ui";
const tabs = ["overview", "team", "milestones", "updates", "deliverables", "discussion"];

export function OrganizationWorkspaceScreen({ id }: { id: string }) {
  const { state } = useOrganizationDemo();
  const params = useSearchParams();
  const selectedTab = params.get("tab") ?? "overview";
  const tab = tabs.includes(selectedTab) ? selectedTab : "overview";
  const project = state.projects.find((item) => item.id === id);
  const { run, error, clearError } = useDemoAction();
  const [milestoneId, setMilestoneId] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [blocker, setBlocker] = useState("");
  const [update, setUpdate] = useState("");
  const [closing, setClosing] = useState(false);
  const [closureNote, setClosureNote] = useState("");
  if (!project) return <PortalPage title="Workspace unavailable" description="This project is not in the local sample workspace."><Empty title="Choose an existing project" action={<ActionLink href="/organization/projects">My projects</ActionLink>}>Local projects reset on refresh.</Empty></PortalPage>;
  const milestone = project.milestones.find((item) => item.id === milestoneId);
  const submissions = state.submissions.filter((item) => item.projectId === id);
  const events = state.events.filter((item) => item.projectId === id);
  const completed = project.milestones.filter((item) => item.done).length;
  return <PortalPage title={project.title} description="A shared view of the work, the people, and the evidence." action={<ActionLink href={`/organization/projects/${id}`}>Read the brief</ActionLink>}>
    <div className={s.workspaceHeader}><div className={s.actions}><Badge tone={project.status === "Active" ? "positive" : "muted"}>{project.status}</Badge><span className={s.muted}>{project.start} → {project.due} · Terms v{project.termsVersion}</span></div>{project.status === "Completed" && <Button onClick={() => { clearError(); setClosing(true); }}>Archive completed sample</Button>}</div>
    <nav className={s.tabs} aria-label="Project workspace sections">{tabs.map((value) => <Link key={value} className={s.tab} href={`/organization/projects/${id}/workspace?tab=${value}`} aria-current={tab === value ? "page" : undefined}>{value[0].toUpperCase() + value.slice(1)}</Link>)}</nav>
    {selectedTab !== tab && <p role="status" className={s.feedback}>That workspace section is unavailable. Showing the overview.</p>}
    {tab === "overview" && <div className={s.split}><section className={s.card}><h2>A clear definition of done</h2><p>{project.outcome}</p><dl className={s.facts}><dt>Deliverables</dt><dd>{project.deliverables}</dd><dt>Acceptance criteria</dt><dd>{project.criteria}</dd><dt>Evidence expected</dt><dd>{project.evidence}</dd><dt>Scope exclusions</dt><dd>{project.exclusions}</dd></dl></section><section className={s.card}><h2>Progress, at a glance</h2><p>{completed} of {project.milestones.length} sample milestones complete</p><progress className={s.progress} aria-label="Completed project milestones" value={completed} max={project.milestones.length || 1} /><p className={s.muted}>Progress reports do not accept deliverables or verify skills.</p><div className={s.cardFooter}><ActionLink href={`/organization/projects/${id}/workspace?tab=milestones`}>See milestones</ActionLink></div></section></div>}
    {tab === "team" && <OrganizationTeamContent key={id} projectId={id} />}
    {tab === "milestones" && <section className={s.card}><h2>Milestone timeline</h2><ul className={s.timeline}>{project.milestones.map((item) => <li key={item.id}><div className={s.cardTop}><div><h3>{item.title}</h3><p className={s.muted}>Due {item.due}</p></div><Badge tone={item.done ? "positive" : item.blocker ? "warning" : "muted"}>{item.done ? "Complete · sample progress" : item.blocker ? "Blocked" : "In progress"}</Badge></div>{item.blocker && <p>{item.blocker}</p>}{project.status === "Active" && <Button onClick={() => { clearError(); setMilestoneId(item.id); setDone(item.done); setBlocker(item.blocker); }}>Update progress</Button>}</li>)}</ul>{!project.milestones.length && <Empty title="No milestones recorded">The sample archive has no milestone records. Draft plans remain in the project brief.</Empty>}</section>}
    {tab === "updates" && <div className={s.stack}>{["Active", "Recruiting", "Published"].includes(project.status) && <form className={s.card} onSubmit={(event) => { event.preventDefault(); if (run((state, context) => postProjectText(state, context, id, update, "update"), "Sample project update added to the timeline.")) setUpdate(""); }}><Field label="Share a project update">{(props) => <textarea {...props} required maxLength={2000} value={update} onChange={(event) => setUpdate(event.target.value)} />}</Field><div className={s.cardFooter}><Button primary type="submit" disabled={!update.trim()}>Post sample update</Button></div></form>}<section className={s.card}><h2>Project history</h2><ul className={s.timeline}>{events.map((event) => <li key={event.id}><p className={s.text}>{event.title}</p><small>{event.actor} · {event.at}</small></li>)}</ul>{!events.length && <p className={s.muted}>No recorded changes in this local session.</p>}</section></div>}
    {tab === "deliverables" && <div className={s.list}>{submissions.map((item) => <article key={item.id} className={s.card}><div className={s.cardTop}><h2>{item.title}</h2><Badge>{item.status}</Badge></div><p>{item.student} · Version {item.versions.at(-1)?.version}</p><div className={s.cardFooter}><ActionLink href={`/organization/reviews?submission=${item.id}`}>Review evidence</ActionLink></div></article>)}{!submissions.length && <Empty title="No deliverables submitted">Versioned sample submissions will appear here. Organization managers cannot submit on a student’s behalf.</Empty>}</div>}
    {tab === "discussion" && <ProjectDiscussion key={id} projectId={id} />}
    {error && !milestone && !closing && <p role="alert" className={s.feedback} data-error="true">{error}</p>}
    {milestone && <Modal title={`Update ${milestone.title}`} onClose={() => setMilestoneId(null)}><form className={s.stack} onSubmit={(event) => { event.preventDefault(); if (run((state, context) => updateMilestone(state, context, id, milestone.id, done, blocker), "Milestone progress updated locally. Deliverable acceptance is unchanged.")) setMilestoneId(null); }}><label className={s.check}><input type="checkbox" checked={done} onChange={(event) => setDone(event.target.checked)} />Sample milestone work complete</label><Field label="Blocker or dependency" hint="Clear resolved blockers before marking complete.">{(props) => <textarea {...props} maxLength={2000} value={blocker} onChange={(event) => setBlocker(event.target.value)} />}</Field>{error && <p role="alert" className={s.feedback} data-error="true">{error}</p>}<div className={s.actions}><Button onClick={() => setMilestoneId(null)}>Cancel</Button><Button primary type="submit">Save progress</Button></div></form></Modal>}
    {closing && <Modal title="Archive this completed sample?" onClose={() => setClosing(false)}><form className={s.stack} onSubmit={(event) => { event.preventDefault(); if (run((state, context) => closeProject(state, context, id, closureNote), "Completed sample archived. Existing history remains available.")) setClosing(false); }}><p>Archiving makes the sample workspace read-only. It creates no mentor assessment, passport verification, or payment record.</p><Field label="Closure note">{(props) => <textarea {...props} required minLength={10} maxLength={2000} value={closureNote} onChange={(event) => setClosureNote(event.target.value)} />}</Field>{error && <p role="alert" className={s.feedback} data-error="true">{error}</p>}<div className={s.actions}><Button onClick={() => setClosing(false)}>Cancel</Button><Button primary type="submit">Archive sample</Button></div></form></Modal>}
  </PortalPage>;
}
