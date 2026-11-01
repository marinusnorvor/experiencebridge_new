"use client";

import { useEffect, useState } from "react";
import { usePortalApi } from "@/lib/api/portal-api";
import type { OrganizationRead, ProjectReviewItem } from "@experiencebridge/api-client";

export function AdminDashboard() {
  const { getApi, isSignedIn } = usePortalApi();
  const [pendingOrgs, setPendingOrgs] = useState<OrganizationRead[]>([]);
  const [pendingProjects, setPendingProjects] = useState<ProjectReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Mentor eligibility form state
  const [mentorUserId, setMentorUserId] = useState("");
  const [mentorDecision, setMentorDecision] = useState<"approve" | "reject" | "suspend">("approve");
  const [mentorReason, setMentorReason] = useState("Meets all technical qualifications and vetting standards.");

  const refreshData = async () => {
    try {
      const api = await getApi();
      const orgsRes = await api.getPendingOrganizations();
      if (orgsRes.data) {
        setPendingOrgs(orgsRes.data);
      }
      const projectsRes = await api.getPendingProjects();
      if (projectsRes.data) {
        setPendingProjects(projectsRes.data);
      }
    } catch (e) {
      console.warn("Admin fetch notice:", e);
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
        const projectsRes = await api.getPendingProjects();
        if (active) {
          if (orgsRes.data) setPendingOrgs(orgsRes.data);
          if (projectsRes.data) setPendingProjects(projectsRes.data);
          setLoading(false);
        }
      } catch {
        if (active) setLoading(false);
      }
    }
    void init();
    return () => {
      active = false;
    };
  }, [isSignedIn, getApi]);

  const handleOrgDecision = async (org: OrganizationRead, decision: "verify" | "reject") => {
    setActionError(null);
    setActionMessage(null);
    try {
      const api = await getApi();
      const res = await api.decideOrganization(
        org.id,
        org.row_version,
        decision,
        decision === "verify" ? "Organization credentials and incorporation documents verified." : "Organization does not meet qualification standards."
      );
      if (res.error) {
        setActionError(res.error);
      } else {
        setActionMessage(`Organization ${org.display_name} has been ${decision === "verify" ? "verified" : "rejected"}.`);
        await refreshData();
      }
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Decision failed.");
    }
  };

  const handleProjectDecision = async (item: ProjectReviewItem, decision: "verify" | "reject") => {
    setActionError(null);
    setActionMessage(null);
    try {
      const api = await getApi();
      const res = await api.decideProject(
        item.project.id,
        item.project.row_version,
        decision,
        decision === "verify" ? "Project challenge, learning outcomes, and terms approved for publication." : "Project brief requires revisions."
      );
      if (res.error) {
        setActionError(res.error);
      } else {
        setActionMessage(`Project ${item.project.title} has been ${decision === "verify" ? "approved and published" : "rejected"}.`);
        await refreshData();
      }
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Decision failed.");
    }
  };

  const handleMentorEligibility = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mentorUserId.trim()) return;
    setActionError(null);
    setActionMessage(null);
    try {
      const api = await getApi();
      const res = await api.decideMentorEligibility(
        mentorUserId.trim(),
        1,
        mentorDecision,
        mentorReason
      );
      if (res.error) {
        setActionError(res.error);
      } else {
        setActionMessage(`Mentor ${mentorUserId} eligibility set to ${mentorDecision}.`);
        setMentorUserId("");
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Mentor eligibility update failed.");
    }
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
                No organizations currently awaiting moderation.
              </p>
            ) : (
              pendingOrgs.map((org) => (
                <div key={org.id} className="rounded-xl border border-slate-200 p-4 bg-slate-50/50">
                  <h3 className="font-semibold text-slate-900">{org.display_name}</h3>
                  <p className="mt-1 text-xs text-slate-600 line-clamp-2">{org.description}</p>
                  <p className="mt-2 text-[11px] text-slate-400 font-mono">ID: {org.id}</p>
                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleOrgDecision(org, "verify")}
                      className="rounded-lg bg-teal-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700 transition"
                    >
                      Verify Organization
                    </button>
                    <button
                      type="button"
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
                No projects currently awaiting publication review.
              </p>
            ) : (
              pendingProjects.map((item) => (
                <div key={item.project.id} className="rounded-xl border border-slate-200 p-4 bg-slate-50/50">
                  <h3 className="font-semibold text-slate-900">{item.project.title}</h3>
                  <p className="mt-1 text-xs text-slate-600 line-clamp-2">{item.project.description}</p>
                  <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
                    <span>Capacity: {item.project.capacity}</span>
                    <span>•</span>
                    <span className="font-mono text-[11px]">Hash: {item.terms.content_hash.slice(0, 8)}...</span>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleProjectDecision(item, "verify")}
                      className="rounded-lg bg-emerald-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition"
                    >
                      Approve & Publish
                    </button>
                    <button
                      type="button"
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

        <form onSubmit={handleMentorEligibility} className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700">Mentor User UUID</label>
            <input
              type="text"
              required
              placeholder="e.g. adf1cf2c-3358-4d1a-ba01-633ced8f1246"
              value={mentorUserId}
              onChange={(e) => setMentorUserId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono"
            />
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
              value={mentorReason}
              onChange={(e) => setMentorReason(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
            />
          </div>

          <div className="sm:col-span-3">
            <button
              type="submit"
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
