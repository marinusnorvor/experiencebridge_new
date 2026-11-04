"use client";

import { useEffect, useState } from "react";
import { termsSnapshot } from "../../student/lib/api-records";
import { usePortalApi, type AdminProjectItem, type AdminProjectReviewItem } from "@/lib/api/portal-api";

export function AdminProjectsView() {
  const { getApi, isSignedIn } = usePortalApi();
  const [pendingProjects, setPendingProjects] = useState<AdminProjectReviewItem[]>([]);
  const [allProjects, setAllProjects] = useState<AdminProjectItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [decisionReasons, setDecisionReasons] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    let active = true;
    async function fetchProjects() {
      try {
        const api = await getApi();
        const [pendingRes, allRes] = await Promise.all([
          api.getPendingProjects(),
          api.getAllProjects(statusFilter === "all" ? undefined : statusFilter),
        ]);
        if (!active) return;
        if (pendingRes.data) setPendingProjects(pendingRes.data);
        if (allRes.data) setAllProjects(allRes.data);
      } catch (e) {
        if (!active) return;
        setNotification({
          type: "error",
          message: e instanceof Error ? e.message : "Failed to load projects.",
        });
      } finally {
        if (active) setLoading(false);
      }
    }
    void fetchProjects();
    return () => {
      active = false;
    };
  }, [getApi, isSignedIn, statusFilter, refreshTrigger]);

  const handleDecision = async (
    item: AdminProjectReviewItem,
    decision: "approve" | "reject" | "request_changes"
  ) => {
    const reason = decisionReasons[item.project.id]?.trim() ?? "";
    if (reason.length < 10) {
      setNotification({ type: "error", message: "A rationale of at least 10 characters is required for project moderation." });
      return;
    }

    setActionBusy(true);
    setNotification(null);
    try {
      const api = await getApi();
      const res = await api.decideProject(
        item.project.id,
        item.project.row_version,
        decision,
        reason,
        item.terms?.id,
        item.terms?.content_hash
      );
      if (res.error) {
        setNotification({ type: "error", message: res.error });
      } else {
        setNotification({
          type: "success",
          message: `Project "${item.project.title}" decision recorded: ${decision}.`,
        });
        setDecisionReasons((prev) => ({ ...prev, [item.project.id]: "" }));
        setRefreshTrigger((prev) => prev + 1);
      }
    } catch (e) {
      setNotification({ type: "error", message: e instanceof Error ? e.message : "Project decision failed." });
    } finally {
      setActionBusy(false);
    }
  };

  const filteredProjects = allProjects.filter((item) => {
    if (searchQuery.trim() && !item.project.title.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-bold text-white tracking-tight">Project Moderation & Oversight</h2>
        <p className="text-xs text-slate-400">
          Review scope, compensation disclosures, IP terms, and milestones before opening opportunities to students.
        </p>
      </div>

      {notification && (
        <div
          className={`rounded-xl border p-4 text-xs ${
            notification.type === "success"
              ? "border-emerald-500/30 bg-emerald-950/20 text-emerald-200"
              : "border-red-500/30 bg-red-950/20 text-red-200"
          }`}
        >
          {notification.message}
        </div>
      )}

      {/* Moderation Queue */}
      <section aria-labelledby="project-queue-heading" className="rounded-2xl border border-slate-800 bg-slate-950 p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-850 pb-4">
          <div>
            <h3 id="project-queue-heading" className="text-sm font-bold text-white">
              Projects Awaiting Publication Review
            </h3>
            <p className="text-xs text-slate-400">
              Submitted project definitions requiring independent terms approval
            </p>
          </div>
          <span className="rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2.5 py-0.5 text-xs font-bold">
            {pendingProjects.length} pending
          </span>
        </div>

        {loading ? (
          <p className="py-8 text-center text-xs text-slate-400">Loading project queue...</p>
        ) : pendingProjects.length === 0 ? (
          <p className="py-8 text-center text-xs text-slate-400">
            No projects currently awaiting publication review.
          </p>
        ) : (
          <div className="space-y-6">
            {pendingProjects.map((item) => {
              const snapshot = item.terms ? termsSnapshot(item.terms) : null;
              return (
                <div key={item.project.id} className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                    <div>
                      {item.organization_name && (
                        <div className="text-[11px] font-semibold text-indigo-400 mb-0.5">
                          {item.organization_name}
                        </div>
                      )}
                      <h4 className="font-semibold text-white text-base">{item.project.title}</h4>
                      <p className="text-xs text-slate-400 mt-1">{item.project.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] font-mono px-2 py-0.5">
                        Capacity: {item.project.capacity}
                      </span>
                      <span className="rounded bg-slate-800 text-slate-400 text-[10px] font-mono px-2 py-0.5">
                        {item.terms ? `v${item.terms.version_no}` : "v-"}
                      </span>
                    </div>
                  </div>

                  {/* Terms Snapshot Inspection Details */}
                  {snapshot ? (
                    <details className="rounded-lg border border-slate-800 bg-slate-950/80 p-3 text-xs text-slate-300">
                      <summary className="cursor-pointer font-semibold text-indigo-400 hover:text-indigo-300">
                        Inspect Complete Terms & Milestones ({snapshot.scope?.milestones?.length ?? 0} milestones)
                      </summary>
                      <div className="mt-3 space-y-3 pt-3 border-t border-slate-800 text-xs">
                        <div>
                          <strong className="text-white">Included Scope:</strong> {snapshot.scope?.scope_in}
                        </div>
                        <div>
                          <strong className="text-white">Excluded Scope:</strong> {snapshot.scope?.scope_out}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-900/40 p-2.5 rounded">
                          <div>
                            <strong className="text-slate-200">Compensation:</strong>{" "}
                            {snapshot.terms?.currency} {snapshot.terms?.fee_amount} ({snapshot.terms?.payment_terms})
                          </div>
                          <div>
                            <strong className="text-slate-200">Timeline:</strong> {snapshot.scope?.start_on} to {snapshot.scope?.due_on}
                          </div>
                          <div>
                            <strong className="text-slate-200">IP Terms:</strong> {snapshot.terms?.ip_ownership_terms}
                          </div>
                          <div>
                            <strong className="text-slate-200">Confidentiality:</strong> {snapshot.terms?.confidentiality_terms}
                          </div>
                        </div>

                        {snapshot.scope?.milestones && snapshot.scope.milestones.length > 0 && (
                          <div className="space-y-2">
                            <strong className="text-white">Milestones:</strong>
                            {(snapshot.scope.milestones as Array<{ title: string; due_on: string; acceptance_criteria?: string[] }>).map((m, idx: number) => (
                              <div key={idx} className="rounded bg-slate-900 p-2 text-[11px] border border-slate-800">
                                <div className="font-semibold text-slate-200">
                                  {idx + 1}. {m.title} (Due: {m.due_on})
                                </div>
                                <ul className="mt-1 list-disc list-inside text-slate-400 space-y-0.5">
                                  {m.acceptance_criteria?.map((crit: string, cIdx: number) => (
                                    <li key={cIdx}>{crit}</li>
                                  ))}
                                </ul>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </details>
                  ) : (
                    <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3 text-xs text-slate-400 italic">
                      No terms snapshot attached to this submission.
                    </div>
                  )}

                  {/* Decision rationale */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-800">
                    <label htmlFor={`project-rationale-${item.project.id}`} className="block text-[11px] font-medium text-slate-300">
                      Moderation Rationale (min 10 characters):
                    </label>
                    <textarea
                      id={`project-rationale-${item.project.id}`}
                      rows={2}
                      value={decisionReasons[item.project.id] ?? ""}
                      onChange={(e) =>
                        setDecisionReasons((prev) => ({ ...prev, [item.project.id]: e.target.value }))
                      }
                      placeholder="Document compensation compliance, student safeguarding, and scope review..."
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-400 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    <button
                      type="button"
                      disabled={actionBusy || (decisionReasons[item.project.id]?.trim().length ?? 0) < 10}
                      onClick={() => handleDecision(item, "approve")}
                      className="rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 px-3 py-1.5 text-xs font-semibold text-white transition"
                    >
                      Approve & Publish to Students
                    </button>
                    <button
                      type="button"
                      disabled={actionBusy || (decisionReasons[item.project.id]?.trim().length ?? 0) < 10}
                      onClick={() => handleDecision(item, "request_changes")}
                      className="rounded-lg border border-amber-600/40 bg-amber-950/30 text-amber-300 hover:bg-amber-900/40 disabled:opacity-50 px-3 py-1.5 text-xs font-semibold transition"
                    >
                      Request Terms Changes
                    </button>
                    <button
                      type="button"
                      disabled={actionBusy || (decisionReasons[item.project.id]?.trim().length ?? 0) < 10}
                      onClick={() => handleDecision(item, "reject")}
                      className="rounded-lg border border-red-600/40 bg-red-950/30 text-red-300 hover:bg-red-900/40 disabled:opacity-50 px-3 py-1.5 text-xs font-semibold transition"
                    >
                      Reject Project
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Complete Projects Registry */}
      <section aria-labelledby="all-projects-title" className="rounded-2xl border border-slate-800 bg-slate-950 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-850 pb-4">
          <div>
            <h3 id="all-projects-title" className="text-sm font-bold text-white">
              All Projects Oversight Registry
            </h3>
            <p className="text-xs text-slate-400">Complete catalogue across all lifecycle statuses</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              placeholder="Search by title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white placeholder-slate-400 focus:border-indigo-500 focus:outline-none"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="open">Open (Published)</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="pending_review">Pending Review</option>
              <option value="changes_requested">Changes Requested</option>
              <option value="rejected">Rejected</option>
              <option value="draft">Draft</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 text-slate-400">
              <tr>
                <th className="py-2.5 px-3">Title</th>
                <th className="py-2.5 px-3">Organization</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Capacity</th>
                <th className="py-2.5 px-3">Terms Version</th>
                <th className="py-2.5 px-3">Created</th>
                <th className="py-2.5 px-3">Project ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850 text-slate-300">
              {filteredProjects.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No projects match the selected criteria.
                  </td>
                </tr>
              ) : (
                filteredProjects.map((item) => (
                  <tr key={item.project.id} className="hover:bg-slate-900/50">
                    <td className="py-2.5 px-3 font-medium text-white">{item.project.title}</td>
                    <td className="py-2.5 px-3 font-medium text-indigo-300">
                      {item.organization_name || item.project.organization_id.slice(0, 8)}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                          item.project.status === "open"
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                            : item.project.status === "in_progress"
                            ? "border-indigo-500/30 bg-indigo-500/10 text-indigo-300"
                            : item.project.status === "completed"
                            ? "border-sky-500/30 bg-sky-500/10 text-sky-300"
                            : item.project.status === "pending_review"
                            ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                            : item.project.status === "changes_requested"
                            ? "border-purple-500/30 bg-purple-500/10 text-purple-300"
                            : item.project.status === "rejected"
                            ? "border-red-500/30 bg-red-500/10 text-red-300"
                            : "border-slate-700 bg-slate-800 text-slate-400"
                        }`}
                      >
                        {item.project.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">{item.project.capacity}</td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400">
                      v{item.project.published_terms_version ?? item.project.submitted_terms_version ?? (item.terms?.version_no ?? "-")}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400">
                      {new Date(item.project.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[10px] text-slate-400">
                      {item.project.id.slice(0, 8)}...
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
