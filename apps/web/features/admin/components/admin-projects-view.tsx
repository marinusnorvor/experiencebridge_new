"use client";

import { useEffect, useState } from "react";
import { termsSnapshot } from "../../student/lib/api-records";
import { usePortalApi, type AdminProjectItem, type AdminProjectReviewItem } from "@/lib/api/portal-api";
import { toast } from "sonner";
import { StatusBadge } from "@/components/ui/status-badge";
import { PageHeader } from "@/components/ui/primitives";

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
      } catch {
        if (!active) return;
        setNotification({
          type: "error",
          message: "We couldn't load projects. Check your connection and refresh the page.",
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
      setNotification({ type: "error", message: "Write a short reason (at least 10 characters). The organisation sees it." });
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
        toast.success(decision === "approve" ? `${item.project.title} is now live for students` : decision === "request_changes" ? "Changes requested" : "Project rejected");
        setDecisionReasons((prev) => ({ ...prev, [item.project.id]: "" }));
        setRefreshTrigger((prev) => prev + 1);
      }
    } catch {
      setNotification({ type: "error", message: "That decision didn't save. Check your connection and try again." });
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
      <PageHeader eyebrow="Admin" title="Projects" description="Check the scope, pay, ownership terms and milestones before a project goes live to students." />

      {notification && (
        <div
          role="alert" className={`rounded-xl border p-4 text-sm ${
            notification.type === "success"
              ? "border-success/25 bg-success-bg text-success-text"
              : "border-danger/25 bg-danger-bg text-danger-text"
          }`}
        >
          {notification.message}
        </div>
      )}

      {/* Moderation Queue */}
      <section aria-labelledby="project-queue-heading" className="rounded-[var(--radius-card)] border border-line bg-surface p-4 shadow-card sm:p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-line pb-4">
          <div>
            <h3 id="project-queue-heading" className="text-sm font-bold text-ink-900">
              Awaiting review
            </h3>
            <p className="text-xs text-ink-500">
              Approve to publish, ask for changes, or reject. Your reason is shared with the organisation.
            </p>
          </div>
          <span className="shrink-0 whitespace-nowrap rounded-full bg-brand-50 text-brand-600 border border-brand-600/30 px-2.5 py-0.5 text-xs font-bold">
            {pendingProjects.length} waiting
          </span>
        </div>

        {loading ? (
          <p className="py-8 text-center text-xs text-ink-500">Loading…</p>
        ) : pendingProjects.length === 0 ? (
          <p className="py-8 text-center text-xs text-ink-500">
            Nothing waiting. Submitted projects appear here.
          </p>
        ) : (
          <div className="space-y-6">
            {pendingProjects.map((item) => {
              const snapshot = item.terms ? termsSnapshot(item.terms) : null;
              return (
                <div key={item.project.id} className="rounded-xl border border-line bg-canvas p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                    <div>
                      {item.organization_name && (
                        <div className="text-[11px] font-semibold text-brand-600 mb-0.5">
                          {item.organization_name}
                        </div>
                      )}
                      <h4 className="font-semibold text-ink-900 text-base">{item.project.title}</h4>
                      <p className="text-xs text-ink-500 mt-1">{item.project.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-brand-50 text-brand-600 border border-brand-600/30 text-[10px] font-mono px-2 py-0.5">
                        {item.project.capacity} place{item.project.capacity === 1 ? "" : "s"}
                      </span>
                      <span className="rounded bg-canvas text-ink-500 text-[10px] font-mono px-2 py-0.5">
                        {item.terms ? `Terms v${item.terms.version_no}` : "No terms"}
                      </span>
                    </div>
                  </div>

                  {/* Terms Snapshot Inspection Details */}
                  {snapshot ? (
                    <details className="rounded-lg border border-line bg-surface p-3 text-xs text-ink-700">
                      <summary className="cursor-pointer font-semibold text-brand-600 hover:text-brand-600">
                        Read the full brief and terms ({snapshot.scope?.milestones?.length ?? 0} milestone{(snapshot.scope?.milestones?.length ?? 0) === 1 ? "" : "s"})
                      </summary>
                      <div className="mt-3 space-y-3 pt-3 border-t border-line text-xs">
                        <div>
                          <strong className="text-ink-900">In scope:</strong> {snapshot.scope?.scope_in}
                        </div>
                        <div>
                          <strong className="text-ink-900">Out of scope:</strong> {snapshot.scope?.scope_out}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-canvas p-2.5 rounded">
                          <div>
                            <strong className="text-ink-900">Pay:</strong>{" "}
                            {snapshot.terms?.currency} {snapshot.terms?.fee_amount} ({snapshot.terms?.payment_terms})
                          </div>
                          <div>
                            <strong className="text-ink-900">Timeline:</strong> {snapshot.scope?.start_on} to {snapshot.scope?.due_on}
                          </div>
                          <div>
                            <strong className="text-ink-900">Ownership:</strong> {snapshot.terms?.ip_ownership_terms}
                          </div>
                          <div>
                            <strong className="text-ink-900">Confidentiality:</strong> {snapshot.terms?.confidentiality_terms}
                          </div>
                        </div>

                        {snapshot.scope?.milestones && snapshot.scope.milestones.length > 0 && (
                          <div className="space-y-2">
                            <strong className="text-ink-900">Milestones:</strong>
                            {(snapshot.scope.milestones as Array<{ title: string; due_on: string; acceptance_criteria?: string[] }>).map((m, idx: number) => (
                              <div key={idx} className="rounded bg-canvas p-2 text-[11px] border border-line">
                                <div className="font-semibold text-ink-900">
                                  {idx + 1}. {m.title} (Due: {m.due_on})
                                </div>
                                <ul className="mt-1 list-disc list-inside text-ink-500 space-y-0.5">
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
                    <div className="rounded-lg border border-line bg-surface p-3 text-xs text-ink-500 italic">
                      No terms were attached to this submission. Ask the organisation to add them.
                    </div>
                  )}

                  {/* Decision rationale */}
                  <div className="space-y-1.5 pt-2 border-t border-line">
                    <label htmlFor={`project-rationale-${item.project.id}`} className="block text-[11px] font-medium text-ink-700">
                      Reason for your decision
                    </label>
                    <textarea
                      id={`project-rationale-${item.project.id}`}
                      rows={2}
                      value={decisionReasons[item.project.id] ?? ""}
                      onChange={(e) =>
                        setDecisionReasons((prev) => ({ ...prev, [item.project.id]: e.target.value }))
                      }
                      placeholder="What you checked, or what needs to change (shared with the organisation)"
                      className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink-900 placeholder-ink-400 focus:border-brand-600 focus:outline-none"
                    />
                    {(decisionReasons[item.project.id]?.trim().length ?? 0) < 10 && <p className="text-[11px] text-ink-500">At least 10 characters to enable the buttons.</p>}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    <button
                      type="button"
                      disabled={actionBusy || (decisionReasons[item.project.id]?.trim().length ?? 0) < 10}
                      onClick={() => handleDecision(item, "approve")}
                      className="rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-50 px-3 py-1.5 text-xs font-semibold text-white transition"
                    >
                      Approve and publish
                    </button>
                    <button
                      type="button"
                      disabled={actionBusy || (decisionReasons[item.project.id]?.trim().length ?? 0) < 10}
                      onClick={() => handleDecision(item, "request_changes")}
                      className="rounded-lg border border-warning/30 bg-warning-bg text-warning-text hover:bg-warning-bg disabled:opacity-50 px-3 py-1.5 text-xs font-semibold transition"
                    >
                      Request changes
                    </button>
                    <button
                      type="button"
                      disabled={actionBusy || (decisionReasons[item.project.id]?.trim().length ?? 0) < 10}
                      onClick={() => handleDecision(item, "reject")}
                      className="rounded-lg border border-danger/25 bg-danger-bg text-danger-text hover:bg-danger-bg disabled:opacity-50 px-3 py-1.5 text-xs font-semibold transition"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Complete Projects Registry */}
      <section aria-labelledby="all-projects-title" className="rounded-[var(--radius-card)] border border-line bg-surface p-4 shadow-card sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-4">
          <div>
            <h3 id="all-projects-title" className="text-sm font-bold text-ink-900">
              All projects
            </h3>
            <p className="text-xs text-ink-500">Search and filter every project on the platform.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              placeholder="Search by title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="rounded-lg border border-line bg-canvas px-3 py-1.5 text-xs text-ink-900 placeholder-ink-400 focus:border-brand-600/30 focus:outline-none"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-line bg-canvas px-3 py-1.5 text-xs text-ink-900 focus:border-brand-600/30 focus:outline-none"
            >
              <option value="all">All statuses</option>
              <option value="open">Open</option>
              <option value="in_progress">In progress</option>
              <option value="completed">Completed</option>
              <option value="pending_review">Awaiting review</option>
              <option value="changes_requested">Changes requested</option>
              <option value="rejected">Rejected</option>
              <option value="draft">Draft</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead className="border-b border-line text-ink-500">
              <tr>
                <th className="py-2.5 px-3">Title</th>
                <th className="py-2.5 px-3">Organisation</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Capacity</th>
                <th className="py-2.5 px-3">Terms</th>
                <th className="py-2.5 px-3">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line text-ink-700">
              {filteredProjects.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-ink-500">
                    No projects match this search.
                  </td>
                </tr>
              ) : (
                filteredProjects.map((item) => (
                  <tr key={item.project.id} className="hover:bg-canvas">
                    <td className="py-2.5 px-3 font-medium text-ink-900">{item.project.title}</td>
                    <td className="py-2.5 px-3 font-medium text-brand-600">
                      {item.organization_name || "—"}
                    </td>
                    <td className="py-2.5 px-3">
                      <StatusBadge status={item.project.status} />
                    </td>
                    <td className="py-2.5 px-3">{item.project.capacity}</td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-ink-500">
                      v{item.project.published_terms_version ?? item.project.submitted_terms_version ?? (item.terms?.version_no ?? "-")}
                    </td>
                    <td className="py-2.5 px-3 text-ink-500">
                      {new Date(item.project.created_at).toLocaleDateString()}
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
