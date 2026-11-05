"use client";

import { useEffect, useState } from "react";
import { usePortalApi, type AdminParticipationOversightItem } from "@/lib/api/portal-api";

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
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Failed to load workspace participations.");
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
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">Active Workspaces & Project Progress</h2>
          <p className="text-xs text-slate-400">
            Real-time tracking of active student project participations, deliverable stages, and completions
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            placeholder="Search project or student..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white placeholder-slate-400 focus:border-indigo-500 focus:outline-none"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
          >
            <option value="all">All Participation Statuses</option>
            <option value="active">Active In-Progress</option>
            <option value="under_review">Under Milestone Review</option>
            <option value="completed">Successfully Completed</option>
            <option value="withdrawn">Withdrawn</option>
            <option value="cancelled">Cancelled</option>
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
                <th className="py-2.5 px-3">Project Title</th>
                <th className="py-2.5 px-3">Student Participant</th>
                <th className="py-2.5 px-3">Workspace Status</th>
                <th className="py-2.5 px-3">Started Date</th>
                <th className="py-2.5 px-3">Participation ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    Loading project participations...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    No participations found matching criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-900/50">
                    <td className="py-2.5 px-3 font-semibold text-white max-w-xs truncate">
                      {item.project_title || "Project Opportunity"}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-medium text-slate-200">{item.student_name || "Student Participant"}</div>
                      <div className="font-mono text-[10px] text-slate-400">{item.student_email || item.student_user_id.slice(0, 8)}</div>
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                          item.status === "completed"
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                            : item.status === "active"
                            ? "border-indigo-500/30 bg-indigo-500/10 text-indigo-300"
                            : item.status === "under_review"
                            ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                            : "border-slate-700 bg-slate-800 text-slate-400"
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-400">
                      {item.started_at ? new Date(item.started_at).toLocaleDateString() : "Pending Start"}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[10px] text-slate-400">
                      {item.id.slice(0, 8)}...
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
