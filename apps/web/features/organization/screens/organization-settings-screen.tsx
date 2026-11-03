"use client";
import { usePortalApi } from "@/lib/api/portal-api";
import { useState } from "react";
import { useOrganizationDemo } from "../hooks/organization-demo-context";
import { useDemoAction } from "../hooks/use-demo-action";
import { useUnsavedChanges } from "../hooks/use-unsaved-changes";
import { requestVerification, saveProfile } from "../lib/demo-transitions";
import { validateProfile } from "../lib/profile-validation";
import type { DemoProfile } from "../types/portal";
import { Badge, Button, Field, Modal, PortalPage, portalStyles as s } from "../components/ui/portal-ui";

const labels = { name: "Organization name", description: "About the organization", email: "Contact email", website: "Website (optional)", country: "Country", representative: "Sample representative" };
export function OrganizationSettingsScreen() {
  const { preview } = useOrganizationDemo();
  return preview ? <PreviewSettings /> : <LiveSettings />;
}

function PreviewSettings() {
  const { state } = useOrganizationDemo();
  const [profile, setProfile] = useState(state.profile);
  const [dirty, setDirty] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof DemoProfile, string>>>({});
  const [confirm, setConfirm] = useState(false);
  const { run, error } = useDemoAction();
  useUnsavedChanges(dirty);
  return <PortalPage title="An organization people can understand" description="A clear profile, thoughtful preferences, and transparent verification status."><div className={s.split}><form className={s.card} noValidate onSubmit={(event) => { event.preventDefault(); const found = validateProfile(profile); setErrors(found); if (!Object.keys(found).length && run((state, context) => saveProfile(state, context, profile), "Synthetic profile saved for this session. Refresh resets changes; no verification granted.")) setDirty(false); }}><div className={s.cardTop}><h2>Organization profile</h2><Badge>{dirty ? "Unsaved changes" : "Local profile"}</Badge></div><div className={s.formGrid}>{(Object.keys(labels) as (keyof typeof labels)[]).map((key) => <Field key={key} label={labels[key]} error={errors[key]} hint={key === "name" ? "Keep the DEMO prefix. Use fictional information only." : undefined}>{(props) => key === "description" ? <textarea {...props} rows={4} maxLength={1000} value={profile[key]} onChange={(event) => { setProfile({ ...profile, [key]: event.target.value }); setDirty(true); }} /> : <input {...props} type={key === "email" ? "email" : key === "website" ? "url" : "text"} maxLength={key === "website" ? 500 : key === "email" ? 200 : 100} value={profile[key]} onChange={(event) => { setProfile({ ...profile, [key]: event.target.value }); setDirty(true); }} />}</Field>)}</div><label className={s.check}><input type="checkbox" checked={profile.digest} onChange={(event) => { setProfile({ ...profile, digest: event.target.checked }); setDirty(true); }} />Sample weekly activity digest preference</label><p className={s.help}>No emails are sent. Saving profile changes resets its simulated verification request.</p>{Object.keys(errors).length > 0 && <p role="alert" className={s.error}>Correct the highlighted fields before saving.</p>}<div className={s.formFooter}><Button disabled={!dirty} onClick={() => { setProfile(state.profile); setDirty(false); setErrors({}); }}>Discard changes</Button><Button primary type="submit" disabled={!dirty}>Save local profile</Button></div></form><aside className={s.stack}><section className={s.card}><h2>Verification</h2><p><Badge tone="warning">{state.profile.verification}</Badge></p><p className={s.muted}>This organization is fictional and has not been verified. The sample request does not contact an administrator or unlock any privileges.</p><div className={s.cardFooter}><Button disabled={dirty || state.profile.verification !== "Not verified"} onClick={() => setConfirm(true)}>Request demo review</Button></div>{dirty && <p className={s.help}>Save your profile before requesting review.</p>}</section><section className={s.card}><h2>People & permissions</h2><p>Demo Organization Manager · presentation actor</p><p className={s.muted}>Role management requires approved backend permissions. This screen cannot add members, grant roles, or change authentication.</p></section></aside></div>{error && !confirm && <p role="alert" className={s.feedback} data-error="true">{error}</p>}{confirm && <Modal title="Record a sample verification request?" onClose={() => setConfirm(false)}><div className={s.stack}><p>The saved fictional profile will be marked Pending demo review. No real verification is performed.</p>{error && <p role="alert" className={s.feedback} data-error="true">{error}</p>}<div className={s.actions}><Button onClick={() => setConfirm(false)}>Cancel</Button><Button primary onClick={() => { if (run(requestVerification, "Demo review request recorded. The organization remains unverified.")) setConfirm(false); }}>Confirm sample request</Button></div></div></Modal>}</PortalPage>;
}

function LiveSettings() {
  const { organization, refetch, announce } = useOrganizationDemo();
  const { getApi } = usePortalApi();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function save(verification: boolean) {
    if (busy) return;
    setBusy(true); setError("");
    try {
      const api = await getApi();
      const result = verification && organization
        ? await api.submitOrganizationVerification(organization.id, organization.row_version)
        : await api.createOrganization({ display_name: name, description });
      if (!result.data) throw new Error(result.error ?? "Organization operation failed.");
      announce(`${result.data.display_name}: ${result.data.verification_status}. API record ${result.data.id}.`);
      await refetch();
    } catch (e) { setError(e instanceof Error ? e.message : "API request failed."); }
    finally { setBusy(false); }
  }
  return <PortalPage title="Organization profile" description="Development database records. Use fictional information for the supervisor demonstration.">
    {error && <p role="alert" className={s.feedback}>{error}</p>}
    <section className={s.card}>{organization ? <>
      <h2>{organization.display_name}</h2><p>{organization.description}</p>
      <p>API ID: {organization.id}</p><Badge>{organization.verification_status}</Badge>
      <p className={s.muted}>An independent Admin must verify this organization before projects can be submitted for publication review.</p>
      <Button disabled={busy || !["draft", "changes_requested"].includes(organization.verification_status)} onClick={() => void save(true)}>Request organization verification</Button>
      <Button disabled={busy} onClick={() => void refetch().catch(() => {})}>Refresh status</Button>
    </> : <form onSubmit={e => { e.preventDefault(); void save(false); }} className={s.stack}>
      <h2>Create your organization</h2>
      <Field label="Organization name">{props => <input {...props} required minLength={2} maxLength={160} value={name} onChange={e => setName(e.target.value)} />}</Field>
      <Field label="Description">{props => <textarea {...props} required minLength={10} maxLength={5000} value={description} onChange={e => setDescription(e.target.value)} />}</Field>
      <Button primary type="submit" disabled={busy}>{busy ? "Saving..." : "Create organization"}</Button>
    </form>}</section>
  </PortalPage>;
}
