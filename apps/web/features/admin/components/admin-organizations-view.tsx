"use client";

import { useEffect, useState } from "react";
import { usePortalApi } from "@/lib/api/portal-api";
import type { OrganizationRead } from "@experiencebridge/api-client";

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
      } catch (e) {
        if (!active) return;
        setNotification({
          type: "error",
          message: e instanceof Error ? e.message : "Failed to load organizations.",
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
      setNotification({ type: "error", message: "A rationale of at least 10 characters is required for moderation." });
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
        setNotification({
          type: "success",
          message: `Organization "${org.display_name}" decision recorded: ${decision}.`,
        });
        setDecisionReasons((prev) => ({ ...prev, [org.id]: "" }));
        setRefreshTrigger((prev) => prev + 1);
      }
    } catch (e) {
      setNotification({ type: "error", message: e instanceof Error ? e.message : "Decision operation failed." });
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
      <div>
        <h2 className="text-lg font-bold text-white tracking-tight">Organization Governance & Vetting</h2>
        <p className="text-xs text-slate-400">
          Verify partner organizations before they can publish projects or engage student participants.
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

      {/* Moderation Queue Section */}
      <section aria-labelledby="verification-queue-title" className="rounded-2xl border border-slate-800 bg-slate-950 p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-850 pb-4">
          <div>
            <h3 id="verification-queue-title" className="text-sm font-bold text-white">
              Organizations Awaiting Verification
            </h3>
            <p className="text-xs text-slate-400">Action items submitted for independent platform verification</p>
          </div>
          <span className="rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2.5 py-0.5 text-xs font-bold">
            {pendingOrgs.length} pending
          </span>
        </div>

        {loading ? (
          <p className="py-8 text-center text-xs text-slate-400">Loading moderation queue...</p>
        ) : pendingOrgs.length === 0 ? (
          <p className="py-8 text-center text-xs text-slate-400">
            No organizations currently awaiting verification.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingOrgs.map((org) => (
              <div key={org.id} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-white text-sm">{org.display_name}</h4>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">{org.description}</p>
                  </div>
                  <span className="rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-mono px-2 py-0.5">
                    submitted
                  </span>
                </div>

                <div className="text-[11px] font-mono text-slate-400">
                  Owner: {org.created_by_user_id}
                </div>

                <div className="space-y-1.5 pt-2 border-t border-slate-800">
                  <label htmlFor={`rationale-${org.id}`} className="block text-[11px] font-medium text-slate-300">
                    Decision Rationale (min 10 characters):
                  </label>
                  <textarea
                    id={`rationale-${org.id}`}
                    rows={2}
                    value={decisionReasons[org.id] ?? ""}
                    onChange={(e) =>
                      setDecisionReasons((prev) => ({ ...prev, [org.id]: e.target.value }))
                    }
                    placeholder="Document independent verification checks and rationale..."
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-400 focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <button
                    type="button"
                    disabled={actionBusy || (decisionReasons[org.id]?.trim().length ?? 0) < 10}
                    onClick={() => handleDecision(org, "verify")}
                    className="rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 px-3 py-1.5 text-xs font-semibold text-white transition"
                  >
                    Verify Organization
                  </button>
                  <button
                    type="button"
                    disabled={actionBusy || (decisionReasons[org.id]?.trim().length ?? 0) < 10}
                    onClick={() => handleDecision(org, "request_changes")}
                    className="rounded-lg border border-amber-600/40 bg-amber-950/30 text-amber-300 hover:bg-amber-900/40 disabled:opacity-50 px-3 py-1.5 text-xs font-semibold transition"
                  >
                    Request Changes
                  </button>
                  <button
                    type="button"
                    disabled={actionBusy || (decisionReasons[org.id]?.trim().length ?? 0) < 10}
                    onClick={() => handleDecision(org, "reject")}
                    className="rounded-lg border border-red-600/40 bg-red-950/30 text-red-300 hover:bg-red-900/40 disabled:opacity-50 px-3 py-1.5 text-xs font-semibold transition"
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
      <section aria-labelledby="org-directory-title" className="rounded-2xl border border-slate-800 bg-slate-950 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-850 pb-4">
          <div>
            <h3 id="org-directory-title" className="text-sm font-bold text-white">
              All Partner Organizations Directory
            </h3>
            <p className="text-xs text-slate-400">Complete registry across all verification lifecycles</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              placeholder="Search by name..."
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
              <option value="submitted">Submitted</option>
              <option value="verified">Verified</option>
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
                <th className="py-2.5 px-3">Organization Name</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Registered Date</th>
                <th className="py-2.5 px-3">Origin</th>
                <th className="py-2.5 px-3">Entity ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850 text-slate-300">
              {filteredOrgs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    No organizations match the selected criteria.
                  </td>
                </tr>
              ) : (
                filteredOrgs.map((org) => (
                  <tr key={org.id} className="hover:bg-slate-900/50">
                    <td className="py-2.5 px-3 font-medium text-white">{org.display_name}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                          org.verification_status === "verified"
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                            : org.verification_status === "submitted"
                            ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                            : org.verification_status === "changes_requested"
                            ? "border-sky-500/30 bg-sky-500/10 text-sky-300"
                            : org.verification_status === "rejected"
                            ? "border-red-500/30 bg-red-500/10 text-red-300"
                            : "border-slate-700 bg-slate-800 text-slate-400"
                        }`}
                      >
                        {org.verification_status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-400">
                      {new Date(org.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400">{org.data_origin}</td>
                    <td className="py-2.5 px-3 font-mono text-[10px] text-slate-400">{org.id.slice(0, 8)}...</td>
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
