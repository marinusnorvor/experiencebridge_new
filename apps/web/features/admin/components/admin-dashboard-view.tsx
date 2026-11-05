"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePortalApi, type AdminDashboardStats, type AdminAuditLogItem } from "@/lib/api/portal-api";

export function AdminDashboardView() {
  const { getApi, isSignedIn } = usePortalApi();
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [recentLogs, setRecentLogs] = useState<AdminAuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function init() {
      try {
        setError(null);
        const api = await getApi();
        const [statsRes, logsRes] = await Promise.all([
          api.getAdminStats(),
          api.getAdminAuditLogs({ limit: 5 }),
        ]);
        if (statsRes.error) throw new Error(statsRes.error);
        if (active) {
          setStats(statsRes.data);
          setRecentLogs(logsRes.data?.items ?? []);
        }
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Failed to load admin metrics.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void init();
    return () => {
      active = false;
    };
  }, [getApi, isSignedIn]);

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-400">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
        <p className="mt-3 text-xs">Loading admin dashboard metrics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-950/20 p-5 text-red-200">
        <h3 className="text-sm font-bold text-red-300">Administrative Metrics Unavailable</h3>
        <p className="mt-1 text-xs">{error}</p>
        <p className="mt-3 text-[11px] text-red-400">
          Ensure you are signed in with an authorized Platform Admin account.
        </p>
      </div>
    );
  }

  const pendingOrgs = stats?.organizations?.submitted ?? 0;
  const pendingProjects = stats?.projects?.pending_review ?? 0;
  const pendingMentors = stats?.mentors?.pending ?? 0;

  return (
    <div className="space-y-6">
      {/* Moderation Alert Banner */}
      {(pendingOrgs > 0 || pendingProjects > 0 || pendingMentors > 0) && (
        <section aria-labelledby="moderation-alert-heading" className="rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-950/40 via-amber-900/20 to-slate-900 p-5 shadow-sm">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-amber-400 text-lg">⚠️</span>
                <h2 id="moderation-alert-heading" className="text-sm font-bold text-amber-200">
                  Pending Administrative Actions Require Review
                </h2>
              </div>
              <p className="mt-1 text-xs text-amber-300/80">
                Independent administrator verification is required before partner organizations and project terms go live.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {pendingOrgs > 0 && (
                <Link
                  href="/admin/organizations"
                  className="rounded-lg bg-amber-600/30 hover:bg-amber-600/40 border border-amber-500/40 px-3 py-1.5 text-xs font-semibold text-amber-200 transition"
                >
                  Verify {pendingOrgs} Organization{pendingOrgs === 1 ? "" : "s"}
                </Link>
              )}
              {pendingProjects > 0 && (
                <Link
                  href="/admin/projects"
                  className="rounded-lg bg-indigo-600/30 hover:bg-indigo-600/40 border border-indigo-500/40 px-3 py-1.5 text-xs font-semibold text-indigo-200 transition"
                >
                  Moderate {pendingProjects} Project{pendingProjects === 1 ? "" : "s"}
                </Link>
              )}
              {pendingMentors > 0 && (
                <Link
                  href="/admin/mentors"
                  className="rounded-lg bg-teal-600/30 hover:bg-teal-600/40 border border-teal-500/40 px-3 py-1.5 text-xs font-semibold text-teal-200 transition"
                >
                  Vet {pendingMentors} Mentor{pendingMentors === 1 ? "" : "s"}
                </Link>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Organizations Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Organizations</span>
            <span className="text-lg">🏢</span>
          </div>
          <div className="mt-2 text-2xl font-bold text-white tracking-tight">
            {stats?.organizations?.total ?? 0}
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] border-t border-slate-850 pt-2 text-slate-400">
            <span>Verified: <strong className="text-emerald-400">{stats?.organizations?.verified ?? 0}</strong></span>
            <span>Pending: <strong className="text-amber-400">{pendingOrgs}</strong></span>
          </div>
        </div>

        {/* Projects Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Projects</span>
            <span className="text-lg">📁</span>
          </div>
          <div className="mt-2 text-2xl font-bold text-white tracking-tight">
            {stats?.projects?.total ?? 0}
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] border-t border-slate-850 pt-2 text-slate-400">
            <span>Open/Active: <strong className="text-indigo-400">{(stats?.projects?.open ?? 0) + (stats?.projects?.in_progress ?? 0)}</strong></span>
            <span>Completed: <strong className="text-emerald-400">{stats?.projects?.completed ?? 0}</strong></span>
          </div>
        </div>

        {/* Mentors Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Mentors Pool</span>
            <span className="text-lg">🎓</span>
          </div>
          <div className="mt-2 text-2xl font-bold text-white tracking-tight">
            {stats?.mentors?.total ?? 0}
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] border-t border-slate-850 pt-2 text-slate-400">
            <span>Eligible: <strong className="text-emerald-400">{stats?.mentors?.eligible ?? 0}</strong></span>
            <span>Vetting: <strong className="text-amber-400">{pendingMentors}</strong></span>
          </div>
        </div>

        {/* Applications & Participations */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Student Talent</span>
            <span className="text-lg">👥</span>
          </div>
          <div className="mt-2 text-2xl font-bold text-white tracking-tight">
            {stats?.users?.total ?? 0}
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] border-t border-slate-850 pt-2 text-slate-400">
            <span>Applications: <strong className="text-sky-400">{stats?.applications?.total ?? 0}</strong></span>
            <span>Active Workspaces: <strong className="text-emerald-400">{stats?.participations?.active ?? 0}</strong></span>
          </div>
        </div>
      </div>

      {/* Secondary Metrics & Quick Links */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* System Breakdown */}
        <div className="lg:col-span-1 rounded-2xl border border-slate-800 bg-slate-950 p-5 space-y-4">
          <h2 className="text-sm font-bold text-white">Platform Health & Coverage</h2>
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between py-1.5 border-b border-slate-850 text-slate-300">
              <span className="text-slate-400">Registered Students</span>
              <span className="font-semibold">{stats?.users?.student ?? 0}</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-slate-850 text-slate-300">
              <span className="text-slate-400">Completed Projects</span>
              <span className="font-semibold text-emerald-400">{stats?.projects?.completed ?? 0}</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-slate-850 text-slate-300">
              <span className="text-slate-400">Active Workspaces</span>
              <span className="font-semibold text-indigo-400">{stats?.participations?.active ?? 0}</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-slate-850 text-slate-300">
              <span className="text-slate-400">Recorded Audit Events</span>
              <span className="font-semibold text-amber-400">{stats?.total_audit_events ?? 0}</span>
            </div>
          </div>
          <div className="pt-2">
            <Link
              href="/admin/audit"
              className="block text-center rounded-xl border border-slate-800 bg-slate-900 py-2 text-xs font-semibold text-indigo-400 hover:bg-slate-850 transition"
            >
              View Complete Audit Trail →
            </Link>
          </div>
        </div>

        {/* Recent Audit Events Stream */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-slate-950 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white">Recent Attributed Operations</h2>
            <Link href="/admin/audit" className="text-xs text-indigo-400 hover:underline">
              All events ({stats?.total_audit_events ?? 0})
            </Link>
          </div>

          <div className="space-y-2">
            {recentLogs.length === 0 ? (
              <p className="py-8 text-center text-xs text-slate-400">No recent audit events.</p>
            ) : (
              recentLogs.map((log) => (
                <div
                  key={log.id}
                  className="rounded-xl border border-slate-850 bg-slate-900/50 p-3 flex items-center justify-between text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="font-mono text-[11px] font-semibold text-indigo-300">
                      {log.event_type}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Actor: {log.actor_name || log.actor_email || log.actor_user_id.slice(0, 8)}
                    </div>
                  </div>
                  <div className="text-right text-[11px] text-slate-400">
                    <div>{new Date(log.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                    <div className="font-mono text-[10px] text-slate-400">{log.entity_id.slice(0, 8)}...</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
