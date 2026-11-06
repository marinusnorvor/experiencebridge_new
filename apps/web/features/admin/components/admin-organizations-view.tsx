"use client";

import { useEffect, useState } from "react";
import { usePortalApi } from "@/lib/api/portal-api";
import type { OrganizationRead } from "@experiencebridge/api-client";
import { toast } from "sonner";
import { StatusBadge } from "@/components/ui/status-badge";
import { PageHeader } from "@/components/ui/primitives";

export function AdminOrganizationsView() {
  const { getApi, isSignedIn } = usePortalApi();
  const [pendingOrgs, setPendingOrgs] = useState<OrganizationRead[]>([]);
  const [allOrgs, setAllOrgs] = useState<OrganizationRead[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [decisionReasons, setDecisionReasons] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    let active = true;
    async function fetchOrganizations() {
      try {
        const api = await getApi();
        const [pendingRes, allRes] = await Promise.all([
          api.getPendingOrganizations(),
          api.getAllOrganizations(statusFilter === "all" ? undefined : statusFilter),
        ]);
        if (!active) return;
        if (pendingRes.data) setPendingOrgs(pendingRes.data);
        if (allRes.data) setAllOrgs(allRes.data);
      } catch {
        if (!active) return;
        setNotification({
          type: "error",
          message: "We couldn't load organisations. Check your connection and refresh the page.",
        });
      } finally {
        if (active) setLoading(false);
      }
    }
    void fetchOrganizations();
    return () => {
      active = false;
    };
  }, [getApi, isSignedIn, statusFilter, refreshTrigger]);

  const handleDecision = async (
    org: OrganizationRead,
    decision: "verify" | "reject" | "request_changes"
  ) => {
    const reason = decisionReasons[org.id]?.trim() ?? "";
    if (reason.length < 10) {
      setNotification({ type: "error", message: "Write a short reason (at least 10 characters). The organisation sees it." });
      return;
    }

    setActionBusy(true);
    setNotification(null);
    try {
      const api = await getApi();
      const res = await api.decideOrganization(org.id, org.row_version, decision, reason);
      if (res.error) {
        setNotification({ type: "error", message: res.error });
      } else {
        toast.success(decision === "verify" ? `${org.display_name} verified` : decision === "request_changes" ? `Changes requested from ${org.display_name}` : `${org.display_name} rejected`);
        setDecisionReasons((prev) => ({ ...prev, [org.id]: "" }));
        setRefreshTrigger((prev) => prev + 1);
      }
    } catch {
      setNotification({ type: "error", message: "That decision didn't save. Check your connection and try again." });
    } finally {
      setActionBusy(false);
    }
  };

  const filteredOrgs = allOrgs.filter((org) => {
    if (searchQuery.trim() && !org.display_name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Admin" title="Organisations" description="Verify organisations before they can publish projects to students." />

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

      {/* Moderation Queue Section */}
      <section aria-labelledby="verification-queue-title" className="rounded-[var(--radius-card)] border border-line bg-surface p-4 shadow-card sm:p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-line pb-4">
          <div>
            <h3 id="verification-queue-title" className="text-sm font-bold text-ink-900">
              Awaiting verification
            </h3>
            <p className="text-xs text-ink-500">Check each organisation, then verify, ask for changes or reject.</p>
          </div>
          <span className="shrink-0 whitespace-nowrap rounded-full bg-warning-bg text-warning-text border border-warning/30 px-2.5 py-0.5 text-xs font-semibold">
            {pendingOrgs.length} waiting
          </span>
        </div>

        {loading ? (
          <p className="py-8 text-center text-xs text-ink-500">Loading…</p>
        ) : pendingOrgs.length === 0 ? (
          <p className="py-8 text-center text-xs text-ink-500">
            Nothing waiting. New submissions appear here.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingOrgs.map((org) => (
              <div key={org.id} className="rounded-xl border border-line bg-canvas p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-ink-900 text-sm">{org.display_name}</h4>
                    <p className="text-xs text-ink-500 mt-1 line-clamp-2">{org.description}</p>
                  </div>
                  <StatusBadge status="submitted" />
                </div>

                <div className="text-[11px] text-ink-500">
                  Registered {new Date(org.created_at).toLocaleDateString()}
                </div>

                <div className="space-y-1.5 pt-2 border-t border-line">
                  <label htmlFor={`rationale-${org.id}`} className="block text-[11px] font-medium text-ink-700">
                    Reason for your decision
                  </label>
                  <textarea
                    id={`rationale-${org.id}`}
                    rows={2}
                    value={decisionReasons[org.id] ?? ""}
                    onChange={(e) =>
                      setDecisionReasons((prev) => ({ ...prev, [org.id]: e.target.value }))
                    }
                    placeholder="What you checked, or what needs to change (shared with the organisation)"
                    className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink-900 placeholder-ink-400 focus:border-brand-600 focus:outline-none"
                  />
                  {(decisionReasons[org.id]?.trim().length ?? 0) < 10 && <p className="text-[11px] text-ink-500">At least 10 characters to enable the buttons.</p>}
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <button
                    type="button"
                    disabled={actionBusy || (decisionReasons[org.id]?.trim().length ?? 0) < 10}
                    onClick={() => handleDecision(org, "verify")}
                    className="rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-50 px-3 py-1.5 text-xs font-semibold text-white transition"
                  >
                    Verify
                  </button>
                  <button
                    type="button"
                    disabled={actionBusy || (decisionReasons[org.id]?.trim().length ?? 0) < 10}
                    onClick={() => handleDecision(org, "request_changes")}
                    className="rounded-lg border border-warning/30 bg-warning-bg text-warning-text hover:bg-warning-bg disabled:opacity-50 px-3 py-1.5 text-xs font-semibold transition"
                  >
                    Request changes
                  </button>
                  <button
                    type="button"
                    disabled={actionBusy || (decisionReasons[org.id]?.trim().length ?? 0) < 10}
                    onClick={() => handleDecision(org, "reject")}
                    className="rounded-lg border border-danger/25 bg-danger-bg text-danger-text hover:bg-danger-bg disabled:opacity-50 px-3 py-1.5 text-xs font-semibold transition"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Full Organizations Directory */}
      <section aria-labelledby="org-directory-title" className="rounded-[var(--radius-card)] border border-line bg-surface p-4 shadow-card sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-4">
          <div>
            <h3 id="org-directory-title" className="text-sm font-bold text-ink-900">
              All organisations
            </h3>
            <p className="text-xs text-ink-500">Search and filter every organisation on the platform.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              placeholder="Search by name..."
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
              <option value="submitted">Submitted</option>
              <option value="verified">Verified</option>
              <option value="changes_requested">Changes requested</option>
              <option value="rejected">Rejected</option>
              <option value="draft">Draft</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-xs">
            <thead className="border-b border-line text-ink-500">
              <tr>
                <th className="py-2.5 px-3">Name</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Registered</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line text-ink-700">
              {filteredOrgs.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-ink-500">
                    No organisations match this search.
                  </td>
                </tr>
              ) : (
                filteredOrgs.map((org) => (
                  <tr key={org.id} className="hover:bg-canvas">
                    <td className="py-2.5 px-3 font-medium text-ink-900">{org.display_name}</td>
                    <td className="py-2.5 px-3">
                      <StatusBadge status={org.verification_status} />
                    </td>
                    <td className="py-2.5 px-3 text-ink-500">
                      {new Date(org.created_at).toLocaleDateString()}
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
