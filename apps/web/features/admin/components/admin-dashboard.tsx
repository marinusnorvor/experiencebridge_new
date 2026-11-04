"use client";

import { useEffect, useState, useRef } from "react";
import { termsSnapshot } from "../../student/lib/api-records";
import { usePortalApi, type AdminProjectReviewItem } from "@/lib/api/portal-api";
import type { OrganizationRead, MentorProfileRead } from "@experiencebridge/api-client";

export function AdminDashboard() {
  const { getApi, isSignedIn } = usePortalApi();
  const [mentors, setMentors] = useState<MentorProfileRead[]>([]);
  const [busy, setBusy] = useState(false);
  const acting = useRef(false);
  const [pendingOrgs, setPendingOrgs] = useState<OrganizationRead[]>([]);
  const [pendingProjects, setPendingProjects] = useState<AdminProjectReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Mentor eligibility form state
  const [mentorUserId, setMentorUserId] = useState("");
  const [mentorDecision, setMentorDecision] = useState<"approve" | "reject" | "suspend">("approve");
  const [mentorReason, setMentorReason] = useState("");
  const [decisionReasons, setDecisionReasons] = useState<Record<string,string>>({});

  const refreshData = async () => {
    setActionError(null);
    try {
      const api = await getApi();
      const orgsRes = await api.getPendingOrganizations();
      if (orgsRes.error) throw new Error(orgsRes.error);
      if (orgsRes.data) {
        setPendingOrgs(orgsRes.data);
      }
      const mentorRes = await api.getMentorProfilesForAdmin();
      if (mentorRes.error) throw new Error(mentorRes.error);
      setMentors(mentorRes.data ?? []);
      const projectsRes = await api.getPendingProjects();
      if (projectsRes.error) throw new Error(projectsRes.error);
      if (projectsRes.data) {
        setPendingProjects(projectsRes.data);
      }
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Admin records unavailable.");
      setPendingOrgs([]); setPendingProjects([]); setMentors([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    async function init() {
      try {
        const api = await getApi();
        const orgsRes = await api.getPendingOrganizations();
        const mentorRes = await api.getMentorProfilesForAdmin();
      if (mentorRes.error) throw new Error(mentorRes.error);
      if (active) setMentors(mentorRes.data ?? []);
      const projectsRes = await api.getPendingProjects();
        if (orgsRes.error || projectsRes.error) throw new Error(orgsRes.error ?? projectsRes.error ?? "Admin data unavailable.");
        if (active) {
          setActionError(null);
          if (orgsRes.data) setPendingOrgs(orgsRes.data);
          if (projectsRes.data) setPendingProjects(projectsRes.data);
          setLoading(false);
        }
      } catch (e) {
        if (active) { setLoading(false); setPendingOrgs([]); setPendingProjects([]); setMentors([]); setActionError(e instanceof Error ? e.message : "Admin records unavailable."); }
      }
    }
    void init();
    return () => {
      active = false;
    };
  }, [isSignedIn, getApi]);

  const handleOrgDecision = async (org: OrganizationRead, decision: "verify" | "reject") => {
    if (acting.current) return;
    acting.current = true; setBusy(true);
    setActionError(null);
    setActionMessage(null);
    try {
      const api = await getApi();
      const res = await api.decideOrganization(
        org.id,
        org.row_version,
        decision,
        decisionReasons[org.id]?.trim() ?? ""
      );
      if (res.error) {
        setActionError(res.error);
      } else {
        setActionMessage(`Organization ${org.display_name} has been ${decision === "verify" ? "verified" : "rejected"}.`);
        await refreshData();
      }
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Decision failed.");
    } finally { acting.current = false; setBusy(false); }
  };

  const handleProjectDecision = async (item: AdminProjectReviewItem, decision: "approve" | "reject") => {
    if (acting.current) return;
    acting.current = true; setBusy(true);
    setActionError(null);
    setActionMessage(null);
    try {
      const api = await getApi();
      const res = await api.decideProject(
        item.project.id,
        item.project.row_version,
        decision,
        decisionReasons[item.project.id]?.trim() ?? "",
        item.terms?.id,
        item.terms?.content_hash
      );
      if (res.error) {
        setActionError(res.error);
      } else {
        setActionMessage(`Project ${item.project.title} has been ${decision === "approve" ? "approved and published" : "rejected"}.`);
        await refreshData();
      }
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Decision failed.");
    } finally { acting.current = false; setBusy(false); }
  };

  const handleMentorEligibility = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mentorUserId.trim()) return;
    if (acting.current) return;
    acting.current = true; setBusy(true);
    setActionError(null);
    setActionMessage(null);
    try {
      const api = await getApi();
      const candidate = mentors.find(m => m.user_id === mentorUserId.trim());
      if (!candidate) throw new Error("Select a mentor profile from the current queue.");
      const res = await api.decideMentorEligibility(
        candidate.user_id,
        candidate.row_version,
        mentorDecision,
        mentorReason
      );
      if (res.error) {
        setActionError(res.error);
      } else {
        setActionMessage(`Mentor ${mentorUserId} eligibility set to ${mentorDecision}.`);
        await refreshData();
        setMentorUserId(""); setMentorReason("");
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Mentor eligibility update failed.");
    } finally { acting.current = false; setBusy(false); }
  };

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-800">
            Platform Oversight · Admin Workspace
          </p>
          {loading && <span className="text-xs text-slate-500 animate-pulse">Syncing…</span>}
        </div>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Platform Administration
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Independent verification boundary: moderate organization registration, project publication, and mentor directory eligibility.
        </p>
      </header>

      {actionMessage && (
        <div role="status" className="mb-6 rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm font-medium text-emerald-950">
          ✓ {actionMessage}
        </div>
      )}

      {actionError && (
        <div role="alert" className="mb-6 rounded-xl border border-red-300 bg-red-50 p-4 text-sm font-medium text-red-950">
          ⚠ {actionError}
        </div>
      )}

      <button type="button" onClick={() => void refreshData()} disabled={loading || busy} className="mb-4 rounded-lg border border-slate-300 px-4 py-2 text-sm">Refresh moderation queues</button>
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Pending Organizations */}
        <section aria-labelledby="pending-orgs-title" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h2 id="pending-orgs-title" className="text-lg font-bold text-slate-900">
              Pending Organizations
            </h2>
            <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-900 border border-amber-200">
              {pendingOrgs.length} awaiting review
            </span>
          </div>

          <div className="mt-4 space-y-4">
            {pendingOrgs.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">
                {actionError ? "Queue unavailable. Resolve the error and retry." : "No organizations currently awaiting moderation."}
              </p>
            ) : (
              pendingOrgs.map((org) => (
                <div key={org.id} className="rounded-xl border border-slate-200 p-4 bg-slate-50/50">
                  <h3 className="font-semibold text-slate-900">{org.display_name}</h3>
                  <p className="mt-1 text-xs text-slate-600 line-clamp-2">{org.description}</p>
                  <p className="mt-2 text-[11px] text-slate-400 font-mono">ID: {org.id}</p>
                  <label className="mt-3 block text-xs">Decision rationale<textarea minLength={10} maxLength={2000} value={decisionReasons[org.id] ?? ""} onChange={e => setDecisionReasons({...decisionReasons,[org.id]:e.target.value})} className="mt-1 block w-full rounded border p-2" /></label>
                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      disabled={busy || (decisionReasons[org.id]?.trim().length ?? 0) < 10}
                      onClick={() => handleOrgDecision(org, "verify")}
                      className="rounded-lg bg-teal-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700 transition"
                    >
                      Verify Organization
                    </button>
                    <button
                      type="button"
                      disabled={busy || (decisionReasons[org.id]?.trim().length ?? 0) < 10}
                      onClick={() => handleOrgDecision(org, "reject")}
                      className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 transition"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Pending Projects */}
        <section aria-labelledby="pending-projects-title" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h2 id="pending-projects-title" className="text-lg font-bold text-slate-900">
              Projects Awaiting Publication
            </h2>
            <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-900 border border-blue-200">
              {pendingProjects.length} pending
            </span>
          </div>

          <div className="mt-4 space-y-4">
            {pendingProjects.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">
                {actionError ? "Queue unavailable. Resolve the error and retry." : "No projects currently awaiting publication review."}
              </p>
            ) : (
              pendingProjects.map((item) => (
                <div key={item.project.id} className="rounded-xl border border-slate-200 p-4 bg-slate-50/50">
                  <h3 className="font-semibold text-slate-900">{item.project.title}</h3>
                  <p className="mt-1 text-xs text-slate-600 line-clamp-2">{item.project.description}</p>
                  <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
                    <span>Capacity: {item.project.capacity}</span>
                    <span>•</span>
                    <span className="font-mono text-[11px]">Hash: {item.terms ? item.terms.content_hash.slice(0, 8) : "N/A"}...</span>
                  </div>
                  {item.terms && (
                    <details className="mt-3 space-y-2 text-xs"><summary>Review complete scope and terms</summary>
                      <p>Scope: {termsSnapshot(item.terms).scope.scope_in}</p><p>Excluded: {termsSnapshot(item.terms).scope.scope_out}</p>
                      <p>Dates: {termsSnapshot(item.terms).scope.start_on} to {termsSnapshot(item.terms).scope.due_on}</p>
                      <p>Compensation: {termsSnapshot(item.terms).terms.currency} {termsSnapshot(item.terms).terms.fee_amount}. {termsSnapshot(item.terms).terms.payment_terms}</p>
                      <p>IP: {termsSnapshot(item.terms).terms.ip_ownership_terms}</p><p>Confidentiality: {termsSnapshot(item.terms).terms.confidentiality_terms}</p>
                      <p>Mentor plan: {termsSnapshot(item.terms).terms.mentor_plan}</p>
                      {termsSnapshot(item.terms).scope.milestones.map((m,i)=><div key={i}><strong>{m.title} - {m.due_on}</strong><ul>{m.acceptance_criteria.map((c,j)=><li key={j}>{c}</li>)}</ul></div>)}
                    </details>
                  )}
                  <label className="mt-3 block text-xs">Decision rationale<textarea minLength={10} maxLength={2000} value={decisionReasons[item.project.id] ?? ""} onChange={e => setDecisionReasons({...decisionReasons,[item.project.id]:e.target.value})} className="mt-1 block w-full rounded border p-2" /></label>
                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      disabled={busy || (decisionReasons[item.project.id]?.trim().length ?? 0) < 10}
                      onClick={() => handleProjectDecision(item, "approve")}
                      className="rounded-lg bg-emerald-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition"
                    >
                      Approve & Publish
                    </button>
                    <button
                      type="button"
                      disabled={busy || (decisionReasons[item.project.id]?.trim().length ?? 0) < 10}
                      onClick={() => handleProjectDecision(item, "reject")}
                      className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 transition"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {/* Mentor Directory Eligibility Management */}
      <section aria-labelledby="mentor-vetting-title" className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 id="mentor-vetting-title" className="text-lg font-bold text-slate-900">
          Mentor Directory Eligibility Moderation
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Authorize or suspend mentor candidates for project assignment matching.
        </p>

        {mentors.find(m=>m.user_id===mentorUserId) && <div className="mt-4 rounded border p-3"><p>{mentors.find(m=>m.user_id===mentorUserId)?.bio}</p><p>{mentors.find(m=>m.user_id===mentorUserId)?.availability_text}</p></div>}
        <form onSubmit={handleMentorEligibility} className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700">Mentor profile</label>
            <select required value={mentorUserId} onChange={e=>setMentorUserId(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs">
              <option value="">Choose submitted mentor profile</option>{mentors.map(m=><option key={m.id} value={m.user_id}>{m.user_id.slice(0,8)} | {m.skills.join(", ")} | {m.eligibility_status}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">Decision</label>
            <select
              value={mentorDecision}
              onChange={(e) => setMentorDecision(e.target.value as "approve" | "reject" | "suspend")}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs bg-white"
            >
              <option value="approve">Approve Eligibility</option>
              <option value="reject">Reject</option>
              <option value="suspend">Suspend</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">Justification</label>
            <input
              type="text"
              required
              minLength={10} maxLength={2000}
              value={mentorReason}
              onChange={(e) => setMentorReason(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
            />
          </div>

          <div className="sm:col-span-3">
            <button
              type="submit" disabled={busy}
              className="rounded-lg bg-teal-800 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-700 transition"
            >
              Submit Eligibility Decision
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
