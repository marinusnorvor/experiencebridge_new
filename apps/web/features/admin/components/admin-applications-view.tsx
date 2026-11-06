"use client";

import { useEffect, useState } from "react";
import { usePortalApi, type AdminApplicationOversightItem } from "@/lib/api/portal-api";
import { StatusBadge } from "@/components/ui/status-badge";
import { PageHeader } from "@/components/ui/primitives";

export function AdminApplicationsView() {
  const { getApi, isSignedIn } = usePortalApi();
  const [applications, setApplications] = useState<AdminApplicationOversightItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function loadApplications() {
      try {
        setError(null);
        const api = await getApi();
        const res = await api.getAdminOversightApplications(
          statusFilter === "all" ? undefined : statusFilter
        );
        if (res.error) throw new Error(res.error);
        if (active) setApplications(res.data ?? []);
      } catch {
        if (active) setError("We couldn't load applications. Check your connection and refresh the page.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadApplications();
    return () => {
      active = false;
    };
  }, [getApi, isSignedIn, statusFilter]);

  const filtered = applications.filter((app) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const projMatch = app.project_title?.toLowerCase().includes(q);
      const studentMatch = app.student_name?.toLowerCase().includes(q) || app.student_email?.toLowerCase().includes(q);
      if (!projMatch && !studentMatch) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader className="pb-0" eyebrow="Admin" title="Applications" description="Every application across the platform. Read-only." />

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
            <option value="submitted">Submitted</option>
            <option value="shortlisted">Shortlisted</option>
            <option value="offered">Offered</option>
            <option value="under_review">Under review</option>
            <option value="rejected">Rejected</option>
            <option value="withdrawn">Withdrawn</option>
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
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead className="border-b border-line text-ink-500">
              <tr>
                <th className="py-2.5 px-3">Project</th>
                <th className="py-2.5 px-3">Student</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Availability</th>
                <th className="py-2.5 px-3">Applied</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line text-ink-700">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-ink-500">
                    Loading…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-ink-500">
                    No applications match this search.
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
                    <td className="py-2.5 px-3">
                      {Math.round(item.weekly_minutes_available / 60)} h / week
                    </td>
                    <td className="py-2.5 px-3 text-ink-500">
                      {new Date(item.created_at).toLocaleDateString()}
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
