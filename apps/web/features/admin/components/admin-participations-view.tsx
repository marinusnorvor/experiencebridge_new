"use client";

import { useEffect, useState } from "react";
import { usePortalApi, type AdminParticipationOversightItem } from "@/lib/api/portal-api";
import { StatusBadge } from "@/components/ui/status-badge";
import { PageHeader } from "@/components/ui/primitives";

export function AdminParticipationsView() {
  const { getApi, isSignedIn } = usePortalApi();
  const [participations, setParticipations] = useState<AdminParticipationOversightItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function loadParticipations() {
      try {
        setError(null);
        const api = await getApi();
        const res = await api.getAdminOversightParticipations(
          statusFilter === "all" ? undefined : statusFilter
        );
        if (res.error) throw new Error(res.error);
        if (active) setParticipations(res.data ?? []);
      } catch {
        if (active) setError("We couldn't load participations. Check your connection and refresh the page.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadParticipations();
    return () => {
      active = false;
    };
  }, [getApi, isSignedIn, statusFilter]);

  const filtered = participations.filter((part) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const projMatch = part.project_title?.toLowerCase().includes(q);
      const studentMatch = part.student_name?.toLowerCase().includes(q) || part.student_email?.toLowerCase().includes(q);
      if (!projMatch && !studentMatch) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader className="pb-0" eyebrow="Admin" title="Participations" description="Students working on projects, from start to completion. Read-only." />

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            placeholder="Search project or student"
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
            <option value="active">Active</option>
            <option value="under_review">Ready for final review</option>
            <option value="completed">Completed</option>
            <option value="withdrawn">Withdrawn</option>
            <option value="cancelled">Cancelled</option>
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
                <th className="py-2.5 px-3">Project</th>
                <th className="py-2.5 px-3">Student</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Started</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line text-ink-700">
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-ink-500">
                    Loading…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-ink-500">
                    No participations match this search.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-canvas">
                    <td className="py-2.5 px-3 font-semibold text-ink-900 max-w-xs truncate">
                      {item.project_title || "Untitled project"}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-medium text-ink-900">{item.student_name || "Student"}</div>
                      {item.student_email && <div className="text-[11px] text-ink-500">{item.student_email}</div>}
                    </td>
                    <td className="py-2.5 px-3">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="py-2.5 px-3 text-ink-500">
                      {item.started_at ? new Date(item.started_at).toLocaleDateString() : "Not started yet"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
