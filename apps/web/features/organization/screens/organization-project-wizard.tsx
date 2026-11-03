"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { emptyBrief } from "../data/portal-fixtures";
import { useOrganizationDemo } from "../hooks/organization-demo-context";
import { useUnsavedChanges } from "../hooks/use-unsaved-changes";
import { briefSteps, parseSavedBrief, validateBrief, validateLiveBrief } from "../lib/brief-validation";
import { demoActor, saveProject } from "../lib/demo-transitions";
import { syncProjectToBackend } from "../lib/organization-api-sync";
import { usePortalApi } from "@/lib/api/portal-api";
import type { Brief } from "../types/portal";
import { ActionLink, Badge, Button, Empty, Field, Modal, PortalPage, portalStyles as s } from "../components/ui/portal-ui";

const labels: Record<keyof Brief, string> = { title: "Project title", problem: "Problem to solve", audience: "Who benefits?", outcome: "What does success look like?", skills: "Skills (comma separated)", difficulty: "Difficulty", seats: "Available places", hours: "Hours per week", eligibility: "Eligibility and support", deliverables: "Deliverables", criteria: "Acceptance criteria", evidence: "Required evidence", exclusions: "Out of scope", start: "Start date", due: "End date", milestonePlan: "Milestone plan", mentorPlan: "Mentor support plan", fee: "Sample fixed fee (GHS)", paymentTerms: "Payment terms", ipTerms: "Intellectual property terms", privacyTerms: "Privacy and access terms", reviewer: "Organization reviewer" };
const steps = ["The challenge", "People & skills", "Scope & evidence", "Timeline & support", "Terms & preview"];
const shortFields: (keyof Brief)[] = ["title", "skills", "start", "due", "fee", "reviewer"];

export function OrganizationProjectWizard({ id }: { id?: string }) {
  const { state, update, announce, orgId, refetch, preview, loading } = useOrganizationDemo();
  const { getApi } = usePortalApi();
  const existing = state.projects.find((project) => project.id === id);
  const [brief, setBrief] = useState<Brief>(existing ?? emptyBrief);
  const [step, setStep] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof Brief, string>>>({});
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const savedId = useRef(id);
  const router = useRouter();
  useUnsavedChanges(dirty);
  useEffect(() => {
    if (existing && !dirty) {
      setBrief(existing);
    }
  }, [existing, dirty]);
  const storageKey = `experiencebridge:synthetic-brief:${id ?? "new"}`;
  if (id && !preview && loading && !existing) return <PortalPage title="Loading project brief..." description="Retrieving draft from the API."><p role="status" className={s.muted}>Loading project brief...</p></PortalPage>;
  if (id && (!existing || (existing.status !== "Draft" && existing.status !== "Needs revision"))) return <PortalPage title="Draft unavailable" description="Only draft or revision-requested projects can be edited."><Empty title="This draft cannot be edited" action={<ActionLink href="/organization/projects">My projects</ActionLink>}>Submitted project terms are locked. A missing local project may have reset on refresh.</Empty></PortalPage>;
  function change(key: keyof Brief, value: string | number) { setBrief((current) => ({ ...current, [key]: value })); setDirty(true); setErrors((current) => ({ ...current, [key]: undefined })); setError(""); }
  function restore() {
    try {
      const raw = sessionStorage.getItem(storageKey);
      const restored = raw ? parseSavedBrief(raw, emptyBrief) : null;
      if (!restored) throw new Error("No valid saved draft was found in this browser tab.");
      setBrief(restored); setDirty(true); setErrors({}); setError(""); announce("Saved synthetic draft restored. Review it before submitting.");
    } catch (error) { setError(error instanceof Error ? error.message : "Browser storage is unavailable."); }
  }
  async function save(submit: boolean) {
    if (savingRef.current) return;
    savingRef.current = true; setSaving(true); setError("");
    try {
      if (!preview) {
        if (!orgId) throw new Error("Create your organization in Settings before saving a project.");
        const api = await getApi();
        const result = await syncProjectToBackend(api, orgId, brief, submit, savedId.current);
        if (result.projectId) savedId.current = result.projectId;
        if (result.fieldErrors) {
          setErrors(result.fieldErrors);
          const firstStep = briefSteps.findIndex(keys => keys.some(key => result.fieldErrors?.[key]));
          if (firstStep >= 0) setStep(firstStep);
        }
        if (result.error) throw new Error(result.error);
        await refetch();
        setDirty(false); setConfirm(false);
        announce(submit ? `Project ${result.projectId} retrieved from the API with pending_review status.` : `Draft ${result.projectId} saved and retrieved from the API. Terms are saved on submission; additional planning fields are not stored by this API.`);
        router.push(`/organization/projects/${result.projectId}`);
        return;
      }
      const projectId = savedId.current ?? `demo-${crypto.randomUUID()}`;
      update(current => saveProject(current, { actor: demoActor, revision: state.revision, id: crypto.randomUUID(), at: new Date().toISOString() }, projectId, brief, submit));
      savedId.current = projectId;
      try { sessionStorage.setItem(storageKey, JSON.stringify({ brief })); } catch { /* Optional preview backup only. */ }
      setDirty(false); setConfirm(false);
      announce(submit ? "Preview submission recorded in this session only. No API write." : "Preview draft saved in this session only. No API write.");
      if (submit) router.push(`/organization/projects/${projectId}`);
    } catch (error) { setError(error instanceof Error ? error.message : "Unable to save. Try again."); setConfirm(false); }
    finally { savingRef.current = false; setSaving(false); }
  }

  function next() {
    const found = preview ? validateBrief(brief, step) : validateLiveBrief(brief, step); setErrors(found);
    if (Object.keys(found).length) { setError("Review the highlighted fields before continuing."); return; }
    setError(""); setStep(step + 1);
  }
  return <PortalPage title={id ? "Refine your project" : "A good brief starts here"} description="Turn a clear challenge into a thoughtful learning opportunity." action={<ActionLink href="/organization/projects">Exit wizard</ActionLink>}>
    {!preview && <p className={s.feedback}>Live API: saves title, problem, capacity, scope, hours, dates and milestone criteria. Terms save on submission. Audience, outcome, skills, difficulty, eligibility and evidence notes remain planning inputs only. The current account is explicitly assigned as reviewer for new projects.</p>}
    <ol className={s.steps}>{steps.map((label, index) => <li className={s.step} aria-current={index === step ? "step" : undefined} key={label}><span className={s.stepNumber}>{index + 1}</span><span>{label}</span></li>)}</ol>
    {error && <p role="alert" className={s.feedback} data-error="true">{error}</p>}
    <form className={s.card} onSubmit={(event) => { event.preventDefault(); if (step < 4) next(); else { const found = preview ? validateBrief(brief) : validateLiveBrief(brief); setErrors(found); if (Object.keys(found).length) { setStep(briefSteps.findIndex((keys) => keys.some((key) => found[key]))); setError("Review the highlighted fields."); } else setConfirm(true); } }} noValidate>
      <div className={s.cardTop}><div><p className={s.eyebrow}>Step {step + 1} of 5</p><h2>{steps[step]}</h2></div><Badge>{dirty ? "Unsaved changes" : "Draft"}</Badge></div>
      <div className={s.formGrid}>{briefSteps[step].map((key) => <Field key={key} label={labels[key]} error={errors[key]} hint={key === "fee" ? "Illustrative paid project only. No money moves through this demo." : undefined}>{(props) => key === "difficulty" ? <select {...props} value={brief[key]} onChange={(event) => change(key, event.target.value)}><option>Foundation</option><option>Intermediate</option><option>Advanced</option></select> : key === "seats" || key === "hours" ? <input {...props} type="number" min="1" max={key === "seats" ? 10 : 20} value={brief[key]} onChange={(event) => change(key, Number(event.target.value))} /> : shortFields.includes(key) ? <input {...props} type={key === "start" || key === "due" ? "date" : "text"} inputMode={key === "fee" ? "decimal" : undefined} maxLength={key === "title" ? 100 : 4000} value={brief[key]} onChange={(event) => change(key, event.target.value)} /> : <textarea {...props} rows={4} maxLength={4000} value={brief[key]} onChange={(event) => change(key, event.target.value)} />}</Field>)}</div>
      {step === 4 && <section className={s.stack} aria-label="Project preview"><h3>Preview your brief</h3><dl className={s.facts}>{briefSteps.slice(0, 4).flat().map((key) => <div key={key}><dt>{labels[key]}</dt><dd className={s.text}>{String(brief[key]) || "Not yet provided"}</dd></div>)}</dl><p className={s.muted}>Terms version 1 · Private by default · {preview ? "Preview actions never write to the database." : "Submission saves a terms snapshot and requests Admin moderation. Organization verification is required first."}</p></section>}
      <div className={s.formFooter}><div className={s.actions}><Button disabled={saving} onClick={() => save(false)}>Save draft</Button>{preview && <Button onClick={restore}>Restore saved draft</Button>}</div><div className={s.actions}>{step > 0 && <Button onClick={() => { setStep(step - 1); setError(""); }}>Back</Button>}<Button primary type="submit">{step === 4 ? "Review submission" : "Continue"}</Button></div></div>
    </form>
    {confirm && <Modal title="Submit this sample brief?" onClose={() => setConfirm(false)}><p>{preview ? "This only changes the synthetic preview." : "The API scope and terms snapshot will be locked for moderation. Additional planning fields are not part of the current API contract. An independent administrator must approve publication."}</p><div className={s.actions}><Button onClick={() => setConfirm(false)}>Keep editing</Button><Button primary disabled={saving} onClick={() => save(true)}>{saving ? "Saving..." : preview ? "Submit preview" : "Submit for moderation"}</Button></div></Modal>}
  </PortalPage>;
}
