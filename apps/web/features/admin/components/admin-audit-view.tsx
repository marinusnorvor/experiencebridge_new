"use client";

import { useEffect, useState } from "react";
import { usePortalApi, type AdminAuditLogItem } from "@/lib/api/portal-api";

export function AdminAuditView() {
  const { getApi, isSignedIn } = usePortalApi();
  const [logs, setLogs] = useState<AdminAuditLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [eventTypeFilter, setEventTypeFilter] = useState<string>("all");
  const [selectedDetails, setSelectedDetails] = useState<AdminAuditLogItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function loadLogs() {
      try {
        setError(null);
        const api = await getApi();
        const res = await api.getAdminAuditLogs({
          limit: 100,
          event_type: eventTypeFilter === "all" ? undefined : eventTypeFilter,
        });
        if (res.error) throw new Error(res.error);
        if (active && res.data) {
          setLogs(res.data.items);
          setTotal(res.data.total);
        }
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Failed to load audit trail.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadLogs();
    return () => {
      active = false;
    };
  }, [getApi, isSignedIn, eventTypeFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">System Audit & Compliance Log</h2>
          <p className="text-xs text-slate-400">
            Immutable, server-attributed log of all consequential state transitions and moderation actions
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={eventTypeFilter}
            onChange={(e) => setEventTypeFilter(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
          >
            <option value="all">All Event Types ({total})</option>
            <option value="organization.created">organization.created</option>
            <option value="organization.verification_submitted">organization.verification_submitted</option>
            <option value="organization.verification_decided">organization.verification_decided</option>
            <option value="project.created">project.created</option>
            <option value="project.moderation_submitted">project.moderation_submitted</option>
            <option value="project.moderation_decided">project.moderation_decided</option>
            <option value="project.started">project.started</option>
            <option value="project.completed">project.completed</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-950/20 p-4 text-xs text-red-200">
          {error}
        </div>
      )}

      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 text-slate-400">
              <tr>
                <th className="py-2.5 px-3">Event Type</th>
                <th className="py-2.5 px-3">Attributed Actor</th>
                <th className="py-2.5 px-3">Entity ID</th>
                <th className="py-2.5 px-3">Request ID</th>
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Payload Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Loading audit trail...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No audit records match the filter criteria.
                  </td>
                </tr>
              ) : (
                logs.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-900/50">
                    <td className="py-2.5 px-3 font-mono font-semibold text-indigo-300">
                      {item.event_type}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-medium text-slate-200">{item.actor_name || "Platform Actor"}</div>
                      <div className="font-mono text-[10px] text-slate-400">
                        {item.actor_email || item.actor_user_id.slice(0, 8)}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400">
                      {item.entity_id.slice(0, 8)}...
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[10px] text-slate-400">
                      {item.request_id.slice(0, 10)}...
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap">
                      {new Date(item.created_at).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3">
                      <button
                        type="button"
                        onClick={() => setSelectedDetails(item)}
                        className="rounded border border-indigo-500/30 bg-indigo-950/20 px-2 py-0.5 text-[11px] text-indigo-300 hover:bg-indigo-900/30 transition"
                      >
                        Inspect Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details Inspection Modal */}
      {selectedDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-w-2xl w-full rounded-2xl border border-slate-700 bg-slate-900 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-sm">
                Audit Event: <span className="font-mono text-indigo-400">{selectedDetails.event_type}</span>
              </h3>
              <button
                type="button"
                onClick={() => setSelectedDetails(null)}
                className="text-slate-400 hover:text-white text-xs font-bold px-2 py-1"
              >
                ✕ Close
              </button>
            </div>

            <div className="space-y-2 text-xs text-slate-300">
              <div className="grid grid-cols-2 gap-2 bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-[11px]">
                <div>
                  <span className="text-slate-400">Actor ID:</span> {selectedDetails.actor_user_id}
                </div>
                <div>
                  <span className="text-slate-400">Entity ID:</span> {selectedDetails.entity_id}
                </div>
                <div>
                  <span className="text-slate-400">Request ID:</span> {selectedDetails.request_id}
                </div>
                <div>
                  <span className="text-slate-400">Logged At:</span> {new Date(selectedDetails.created_at).toISOString()}
                </div>
              </div>

              <div>
                <span className="block font-semibold text-slate-300 mb-1">Details Payload:</span>
                <pre className="max-h-60 overflow-y-auto rounded-lg border border-slate-800 bg-slate-950 p-3 font-mono text-[11px] text-emerald-400">
                  {JSON.stringify(selectedDetails.details, null, 2)}
                </pre>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedDetails(null)}
                className="rounded-lg bg-slate-800 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700 transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
