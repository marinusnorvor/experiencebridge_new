"use client";
import { useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useOrganizationDemo } from "../hooks/organization-demo-context";
import { useDemoAction } from "../hooks/use-demo-action";
import { usePortalApi } from "@/lib/api/portal-api";
import { requireData } from "@/lib/api/use-portal-resource";
import { decideApplication } from "../lib/demo-transitions";
import { ActionLink, Badge, Button, Empty, Field, Modal, PortalPage, portalStyles as s } from "../components/ui/portal-ui";

const stages = ["All", "New", "Shortlisted", "Offered", "Accepted", "Declined / Withdrawn"];
export function OrganizationApplicationsScreen() {
  const { state, preview, refetch, announce } = useOrganizationDemo();
  const { getApi } = usePortalApi();
  const [liveError, setLiveError] = useState("");
  const [busy, setBusy] = useState(false);
  const acting = useRef(false);
  const params = useSearchParams();
  const router = useRouter();
  const [stage, setStage] = useState("All");
  const [query, setQuery] = useState("");
  const [project, setProject] = useState(params.get("project") ?? "All");
  const [decision, setDecision] = useState<"Shortlisted" | "Offered" | "Declined" | "Revoke" | null>(null);
  const [reason, setReason] = useState("");
  const [expiry, setExpiry] = useState("");
  const { run, error: previewError, clearError } = useDemoAction();
  const error = liveError || previewError;
  const selected = state.applications.find((item) => item.id === params.get("application"));
  const candidates = state.applications.filter((item) => (project === "All" || item.projectId === project) && `${item.name} ${item.skills.join(" ")}`.toLowerCase().includes(query.trim().toLowerCase()));
  const matchesStage = (status: string, filter: string) => filter === "All" || filter.split(" / ").includes(status);
  const shown = candidates.filter((item) => matchesStage(item.status, stage));
  async function saveDecision() {
    if (!selected || !decision || acting.current) return;
    if (preview && decision !== "Revoke") {
      if (run((state, context) => decideApplication(state, context, selected.id, decision, reason, expiry), "Preview decision saved locally.")) { setDecision(null); setReason(""); }
      return;
    }
    acting.current = true; setBusy(true); setLiveError("");
    try {
      if (selected.rowVersion === undefined) throw new Error("Reload the current application before deciding.");
      const api = await getApi();
      if (decision === "Shortlisted") requireData(await api.shortlistApplication(selected.id, selected.rowVersion));
      else if (decision === "Declined") requireData(await api.rejectApplication(selected.id, selected.rowVersion, reason));
      else if (decision === "Revoke") {
        if (!selected.offerId) throw new Error("No current offer found.");
        const offer = requireData(await api.getOffer(selected.offerId));
        requireData(await api.revokeOffer(offer.id, offer.row_version, reason));
      } else {
        const project = requireData(await api.getProject(selected.projectId));
        if (!project.published_terms_version_id) throw new Error("Published terms are unavailable.");
        requireData(await api.issueOffer(selected.id, project.published_terms_version_id, new Date(`${expiry}T23:59:59Z`).toISOString(), selected.rowVersion));
      }
      requireData(await api.getApplication(selected.id));
      await refetch(); announce("Application decision confirmed by the API."); setDecision(null); setReason("");
    } catch (e) { setLiveError(e instanceof Error ? e.message : "Decision failed."); }
    finally { acting.current = false; setBusy(false); }
  }
  function close() { setDecision(null); setReason(""); clearError(); router.replace("/organization/applications", { scroll: false }); }
  return <PortalPage title="People with potential" description="Review evidence, understand availability, and offer a clear next step.">
    <div className={s.toolbar}><label className={s.search}><span className={s.label}>Search applicants or skills</span><input className={s.input} type="search" value={query} onChange={(event) => setQuery(event.target.value)} /></label><label><span className={s.label}>Project</span><select className={s.input} value={project} onChange={(event) => setProject(event.target.value)}><option>All</option>{state.projects.filter((item) => state.applications.some((application) => application.projectId === item.id)).map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label></div>
    <div className={s.tabs} role="group" aria-label="Application stage">{stages.map((label) => <button className={s.tab} key={label} aria-pressed={stage === label} onClick={() => setStage(label)}>{label} <span>{candidates.filter((item) => matchesStage(item.status, label)).length}</span></button>)}</div>
    <p className={s.muted}>An offer reserves a place; it never adds a student to the team. Student acceptance belongs to the student.</p>
    <div className={s.list}>{shown.map((item) => <article className={s.card} key={item.id}><div className={s.cardTop}><div><p className={s.eyebrow}>{state.projects.find((project) => project.id === item.projectId)?.title}</p><h2>{item.name}</h2></div><Badge tone={item.status === "Offered" ? "warning" : "muted"}>{item.status}</Badge></div><p>{item.note}</p><div className={s.tags}>{item.skills.map((skill) => <span className={s.tag} key={skill}>{skill}</span>)}</div><div className={s.cardFooter}><span className={s.muted}>{item.availability} · Terms v{item.termsVersion}{item.offerExpiry && ` · Offer expires ${item.offerExpiry}`}</span><ActionLink href={`/organization/applications?application=${item.id}`} scroll={false}>Review application</ActionLink></div></article>)}</div>
    {!shown.length && <Empty title="No applications in this view" action={<Button onClick={() => { setQuery(""); setProject("All"); setStage("All"); }}>Clear filters</Button>}>Try another stage or project.</Empty>}
    {params.has("application") && !selected && <Empty title="Application unavailable" action={<Button onClick={close}>Return to applications</Button>}>This application could not be found.</Empty>}
    {selected && <Modal title={selected.name} onClose={close}><div className={s.stack}><Badge>{selected.status}</Badge><section><h3>Application note</h3><p>{selected.note}</p></section><section><h3>Relevant evidence</h3><p>{selected.evidence}</p><p className={s.muted}>{selected.skills.join(" · ")} · {selected.availability}</p></section><section><h3>Decision history</h3><ul className={s.timeline}>{state.events.filter((event) => event.href.includes(`application=${selected.id}`)).map((event) => <li key={event.id}>{event.title}<small>{event.actor} · {event.at}</small></li>)}</ul>{!state.events.some((event) => event.href.includes(`application=${selected.id}`)) && <p className={s.muted}>Decision history is not supplied by this API. The current status is shown above.</p>}</section>
      {!decision && ["New", "Shortlisted"].includes(selected.status) && <div className={s.actions}>{selected.status === "New" && <Button onClick={() => setDecision("Shortlisted")}>Shortlist</Button>}<Button primary onClick={() => setDecision("Offered")}>Offer place</Button><Button danger onClick={() => setDecision("Declined")}>Decline</Button></div>}
      {!preview && !decision && selected.status === "Offered" && <div className={s.actions}>{selected.offerStatus === "offered" ? <Button danger onClick={() => setDecision("Revoke")}>Revoke offer</Button> : <Button primary onClick={() => setDecision("Offered")}>Send new offer</Button>}</div>}
      {!preview && selected.offerStatus && <p className={s.muted}>Latest offer: {selected.offerStatus}</p>}
      {decision && <form className={s.stack} onSubmit={(event) => { event.preventDefault(); void saveDecision(); }}><h3>Confirm: {decision}</h3>{(preview || decision === "Declined" || decision === "Revoke") && <Field label="Decision reason" hint="10–2,000 characters. Keep feedback relevant to the project.">{(props) => <textarea {...props} required minLength={10} maxLength={2000} value={reason} onChange={(event) => setReason(event.target.value)} />}</Field>}{decision === "Offered" && <><Field label="Offer expiry">{(props) => <input {...props} required type="date" value={expiry} onChange={(event) => setExpiry(event.target.value)} />}</Field><p className={s.muted}>Offer refers to terms v{selected.termsVersion}. The student must accept those terms. Only the student can accept an offer.</p></>}{error && <p role="alert" className={s.feedback} data-error="true">{error}</p>}<div className={s.actions}><Button onClick={() => { setDecision(null); clearError(); }}>Cancel</Button><Button primary type="submit" disabled={busy}>Confirm {decision.toLowerCase()}</Button></div></form>}
    </div></Modal>}
  </PortalPage>;
}
