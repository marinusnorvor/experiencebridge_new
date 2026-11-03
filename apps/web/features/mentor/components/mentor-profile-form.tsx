"use client";
import { useCallback, useRef, useState } from "react";
import type { MentorProfileRead } from "@experiencebridge/api-client";
import { requireData, usePortalResource } from "@/lib/api/use-portal-resource";

export function MentorProfileForm() {
  const live = usePortalResource(useCallback(async api => {
    const result = await api.getMentorProfile();
    return result.status === 404 ? null : requireData(result);
  }, []));
  return <section className="mx-auto mt-6 max-w-6xl rounded-xl border border-slate-200 bg-white p-6">
    <h2 className="text-xl font-semibold">Mentor profile and eligibility</h2>
    {live.error && <p role="alert">{live.error} <button onClick={() => void live.reload().catch(() => {})}>Retry</button></p>}
    {live.loading ? <p role="status">Loading mentor profile...</p> : !live.error && <ProfileEditor key={live.data?.row_version ?? "new"} profile={live.data} onSaved={live.reload} getApi={live.getApi} />}
  </section>;
}
function ProfileEditor({ profile, onSaved, getApi }: {profile:MentorProfileRead|null;onSaved:()=>Promise<unknown>;getApi:ReturnType<typeof usePortalResource>["getApi"]}) {
  const [bio,setBio] = useState(profile?.bio ?? ""); const [skills,setSkills] = useState(profile?.skills.join(", ") ?? "");
  const [availability,setAvailability] = useState(profile?.availability_text ?? ""); const [capacity,setCapacity] = useState(profile?.weekly_review_capacity ?? 1);
  const [optIn,setOptIn] = useState(profile?.directory_opt_in ?? false); const [error,setError] = useState(""); const [busy,setBusy] = useState(false); const saving=useRef(false);
  const input="mt-1 block w-full rounded border border-slate-300 p-2";
  return <form className="mt-4 space-y-3" onSubmit={async e => {e.preventDefault();if(saving.current)return;saving.current=true;setBusy(true);setError("");try {
    const api=await getApi();requireData(await api.upsertMentorProfile({bio,skills:skills.split(",").map(s=>s.trim()).filter(Boolean),availability_text:availability,weekly_review_capacity:capacity,directory_opt_in:optIn},profile?.row_version));
    requireData(await api.getMentorProfile());await onSaved();
  }catch(err){setError(err instanceof Error?err.message:"Profile save failed.");}finally{saving.current=false;setBusy(false);}}}>
    <p>Eligibility: <strong>{profile?.eligibility_status ?? "Profile not created"}</strong>. Eligibility requires a separate administrator decision.</p>
    <label className="block">Bio<textarea className={input} required minLength={10} maxLength={2000} value={bio} onChange={e=>setBio(e.target.value)} /></label>
    <label className="block">Skills (comma separated)<input className={input} required value={skills} onChange={e=>setSkills(e.target.value)} /></label>
    <label className="block">Availability<input className={input} required minLength={2} maxLength={200} value={availability} onChange={e=>setAvailability(e.target.value)} /></label>
    <label className="block">Reviews per week<input className={input} required type="number" min={1} max={50} value={capacity} onChange={e=>setCapacity(Number(e.target.value))} /></label>
    <label className="flex gap-2"><input type="checkbox" checked={optIn} onChange={e=>setOptIn(e.target.checked)} />Show this profile to organization managers in the approved mentor directory.</label>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    <button type="submit" disabled={busy} className="rounded bg-teal-800 px-4 py-2 text-white disabled:opacity-50">{busy?"Saving...":"Save mentor profile"}</button>
  </form>;
}
