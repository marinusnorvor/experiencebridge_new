"use client";
import { useCallback, useRef, useState } from "react";
import type { MentorProfileRead } from "@experiencebridge/api-client";
import { requireData, usePortalResource } from "@/lib/api/use-portal-resource";
import { NextStepHint } from "@/components/ui/primitives";
import { StatusBadge } from "@/components/ui/status-badge";

export function MentorProfileForm() {
  const live = usePortalResource(useCallback(async api => {
    const result = await api.getMentorProfile();
    return result.status === 404 ? null : requireData(result);
  }, []));
  const status = live.data?.eligibility_status;
  return <section className="mb-8 space-y-4">
    <div>
      <p className="text-[13px] font-medium text-brand-600">Mentor</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink-900 sm:text-[28px]">Your mentor home</h1>
    </div>
    {status === "pending" && <NextStepHint waitingOn="ExperienceBridge approval" detail="usually within 48 hours. Once approved, organisations can invite you to guide a student." />}
    {status === "approved" && <NextStepHint tone="gold" waitingOn="An organisation's invitation" detail="You're approved. Invitations to mentor appear below and in your notifications." />}
    {(status === "rejected" || status === "suspended") && <NextStepHint tone="warning" waitingOn="ExperienceBridge" detail="Your mentor profile isn't active right now. Contact the team if you think this is a mistake." />}
    {live.error && <p role="alert" className="rounded-xl bg-danger-bg p-3 text-sm text-danger-text">We couldn&rsquo;t load your mentor profile. <button className="font-medium underline" onClick={() => void live.reload().catch(() => {})}>Try again</button></p>}
    <details className="group rounded-[var(--radius-card)] border border-line bg-surface shadow-card" open={!live.loading && !live.data}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 text-[15px] font-semibold text-ink-900">
        <span>Your mentor profile</span>{status && <StatusBadge status={status} />}
      </summary>
      <div className="border-t border-line px-5 pb-5">
        {live.loading ? <p role="status" className="pt-4 text-sm text-ink-500">Loading your profile…</p> : !live.error && <ProfileEditor key={live.data?.row_version ?? "new"} profile={live.data} onSaved={live.reload} getApi={live.getApi} />}
      </div>
    </details>
  </section>;
}
function ProfileEditor({ profile, onSaved, getApi }: {profile:MentorProfileRead|null;onSaved:()=>Promise<unknown>;getApi:ReturnType<typeof usePortalResource>["getApi"]}) {
  const [bio,setBio] = useState(profile?.bio ?? ""); const [skills,setSkills] = useState(profile?.skills.join(", ") ?? "");
  const [availability,setAvailability] = useState(profile?.availability_text ?? ""); const [capacity,setCapacity] = useState(profile?.weekly_review_capacity ?? 1);
  const [optIn,setOptIn] = useState(profile?.directory_opt_in ?? false); const [error,setError] = useState(""); const [busy,setBusy] = useState(false); const saving=useRef(false);
  const input="mt-1 block w-full rounded-[var(--radius-control)] border border-line-strong px-3 py-2 text-[16px]";
  return <form className="mt-4 space-y-3" onSubmit={async e => {e.preventDefault();if(saving.current)return;saving.current=true;setBusy(true);setError("");try {
    const api=await getApi();requireData(await api.upsertMentorProfile({bio,skills:skills.split(",").map(s=>s.trim()).filter(Boolean),availability_text:availability,weekly_review_capacity:capacity,directory_opt_in:optIn},profile?.row_version));
    requireData(await api.getMentorProfile());await onSaved();
  }catch(err){setError(err instanceof Error?err.message:"Profile save failed.");}finally{saving.current=false;setBusy(false);}}}>
        <label className="block">Bio<textarea className={input} required minLength={10} maxLength={2000} value={bio} onChange={e=>setBio(e.target.value)} /></label>
    <label className="block">Skills (comma separated)<input className={input} required value={skills} onChange={e=>setSkills(e.target.value)} /></label>
    <label className="block">Availability<input className={input} required minLength={2} maxLength={200} value={availability} onChange={e=>setAvailability(e.target.value)} /></label>
    <label className="block">Reviews per week<input className={input} required type="number" min={1} max={50} value={capacity} onChange={e=>setCapacity(Number(e.target.value))} /></label>
    <label className="flex gap-2"><input type="checkbox" checked={optIn} onChange={e=>setOptIn(e.target.checked)} />List me in the mentor directory so verified organisations can invite me.</label>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    <button type="submit" disabled={busy} className="rounded-[var(--radius-control)] bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700 disabled:opacity-50">{busy?"Saving…":"Save profile"}</button>
  </form>;
}
