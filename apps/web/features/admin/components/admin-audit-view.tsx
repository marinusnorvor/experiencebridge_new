"use client";

import { useEffect, useState } from "react";
import { usePortalApi, type AdminAuditLogItem } from "@/lib/api/portal-api";
import { PageHeader } from "@/components/ui/primitives";
import { Dialog } from "@/components/ui/dialog";
import { humanizeEvent } from "./admin-dashboard-view";

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
      } catch {
        if (active) setError("We couldn't load the audit log. Check your connection and refresh the page.");
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
        <PageHeader className="pb-0" eyebrow="Admin" title="Audit log" description="Every decision and important change, with who made it and when. Entries can't be edited." />

        <div className="flex items-center gap-2">
          <select
            value={eventTypeFilter}
            onChange={(e) => setEventTypeFilter(e.target.value)}
            className="rounded-lg border border-line bg-canvas px-3 py-1.5 text-xs text-ink-900 focus:border-brand-600/30 focus:outline-none"
          >
            <option value="all">All events ({total})</option>
            <option value="organization.created">Organization created</option>
            <option value="organization.verification_submitted">Organization verification submitted</option>
            <option value="organization.verification_decided">Organization verification decided</option>
            <option value="project.created">Project created</option>
            <option value="project.moderation_submitted">Project moderation submitted</option>
            <option value="project.moderation_decided">Project moderation decided</option>
            <option value="project.started">Project started</option>
            <option value="project.completed">Project completed</option>
          </select>
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-danger/25 bg-danger-bg p-4 text-sm text-danger-text">
          {error}
        </div>
      )}

      <div className="rounded-[var(--radius-card)] border border-line bg-surface p-2 shadow-card sm:p-4">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-xs">
            <thead className="border-b border-line text-ink-500">
              <tr>
                <th className="py-2.5 px-3">Event</th>
                <th className="py-2.5 px-3">By</th>
                <th className="py-2.5 px-3">When</th>
                <th className="py-2.5 px-3"><span className="sr-only">Details</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line text-ink-700">
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-ink-500">
                    Loading…
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-ink-500">
                    No events match this filter.
                  </td>
                </tr>
              ) : (
                logs.map((item) => (
                  <tr key={item.id} className="hover:bg-canvas">
                    <td className="py-2.5 px-3">
                      <div className="font-medium text-ink-900">{humanizeEvent(item.event_type)}</div>
                      <div className="font-mono text-[10px] text-ink-500">{item.event_type}</div>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-medium text-ink-900">{item.actor_name || "Team member"}</div>
                      {item.actor_email && <div className="text-[11px] text-ink-500">{item.actor_email}</div>}
                    </td>
                    <td className="py-2.5 px-3 text-ink-500 whitespace-nowrap">
                      {new Date(item.created_at).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3">
                      <button
                        type="button"
                        onClick={() => setSelectedDetails(item)}
                        className="rounded-full border border-line-strong px-2.5 py-0.5 text-[11px] text-ink-700 hover:border-brand-600 hover:text-brand-700 transition"
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!selectedDetails} onOpenChange={(open) => { if (!open) setSelectedDetails(null); }}
        className="sm:max-w-2xl" title={selectedDetails ? humanizeEvent(selectedDetails.event_type) : "Event"}
        description={selectedDetails ? `${selectedDetails.actor_name || selectedDetails.actor_email || "Team member"} · ${new Date(selectedDetails.created_at).toLocaleString()}` : undefined}>
        {selectedDetails && (
          <div className="space-y-3 text-xs text-ink-700">
            <dl className="grid gap-2 rounded-lg border border-line bg-canvas p-3 font-mono text-[11px] sm:grid-cols-2">
              <div><dt className="text-ink-500">Event</dt><dd className="break-all">{selectedDetails.event_type}</dd></div>
              <div><dt className="text-ink-500">Record</dt><dd className="break-all">{selectedDetails.entity_id}</dd></div>
              <div><dt className="text-ink-500">Request</dt><dd className="break-all">{selectedDetails.request_id}</dd></div>
              <div><dt className="text-ink-500">Recorded</dt><dd>{new Date(selectedDetails.created_at).toISOString()}</dd></div>
            </dl>
            <div>
              <p className="mb-1 font-medium text-ink-900">What changed</p>
              <pre className="max-h-60 overflow-auto rounded-lg border border-line bg-canvas p-3 font-mono text-[11px] text-ink-700">{JSON.stringify(selectedDetails.details, null, 2)}</pre>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
