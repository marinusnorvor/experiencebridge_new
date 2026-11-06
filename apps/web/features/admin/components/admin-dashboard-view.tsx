"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Building2, FolderKanban, GraduationCap, History } from "lucide-react";
import { usePortalApi, type AdminDashboardStats, type AdminAuditLogItem } from "@/lib/api/portal-api";
import { adminHref, useAdminBase } from "@/components/app/admin-base";
import { Card, CardHeader, PageHeader, PageSkeleton, StatCard } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

/** "organization.verified" → "Organization verified" */
export function humanizeEvent(eventType: string): string {
  const text = eventType.replace(/[._]+/g, " ").trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function AdminDashboardView() {
  const { getApi, isSignedIn } = usePortalApi();
  const base = useAdminBase();
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [recentLogs, setRecentLogs] = useState<AdminAuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

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
  }, [getApi, isSignedIn, attempt]);

  if (loading) return <PageSkeleton />;

  if (error) {
    return (
      <div role="alert" className="rounded-[var(--radius-card)] border border-danger/25 bg-danger-bg p-5">
        <h2 className="text-sm font-semibold text-danger-text">We couldn&rsquo;t load the overview</h2>
        <p className="mt-1 text-sm text-danger-text">Check your connection and that you&rsquo;re signed in with an admin account.</p>
        <Button size="sm" variant="secondary" className="mt-4" onClick={() => { setLoading(true); setAttempt((n) => n + 1); }}>Try again</Button>
      </div>
    );
  }

  const pendingOrgs = stats?.organizations?.submitted ?? 0;
  const pendingProjects = stats?.projects?.pending_review ?? 0;
  const pendingMentors = stats?.mentors?.pending ?? 0;
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

  const queues = [
    { count: pendingOrgs, label: plural(pendingOrgs, "organisation"), action: "awaiting verification", href: "/admin/organizations", icon: Building2 },
    { count: pendingProjects, label: plural(pendingProjects, "project"), action: "awaiting review", href: "/admin/projects", icon: FolderKanban },
    { count: pendingMentors, label: plural(pendingMentors, "mentor"), action: "awaiting approval", href: "/admin/mentors", icon: GraduationCap },
  ];

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Admin" title="Overview" description="Queues that need a decision first, then how the platform is doing." />

      <section aria-labelledby="queues-heading">
        <h2 id="queues-heading" className="mb-3 text-[15px] font-semibold text-ink-900">Needs a decision</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {queues.map(({ count, label, action, href, icon: Icon }) => (
            <Link key={href} href={adminHref(base, href)}
              className={cn("group flex flex-col rounded-[var(--radius-card)] border p-5 shadow-card transition hover:-translate-y-0.5",
                count > 0 ? "border-gold-500/40 bg-gold-50 hover:border-gold-500" : "border-line bg-surface hover:border-brand-600/40")}>
              <span className={cn("grid size-10 place-items-center rounded-xl", count > 0 ? "bg-gold-100 text-gold-text" : "bg-canvas text-ink-500")}><Icon className="size-5" aria-hidden /></span>
              <span className="mt-4 text-[28px] font-semibold tabular-nums tracking-tight text-ink-900">{count}</span>
              <span className="text-sm text-ink-700">{count > 0 ? <>{label} {action}</> : <>Nothing {action}</>}</span>
              <span className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-brand-600">
                {count > 0 ? "Review now" : "Open queue"}<ArrowRight className="size-3.5 transition group-hover:translate-x-0.5" aria-hidden />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section aria-labelledby="stats-heading">
        <h2 id="stats-heading" className="mb-3 text-[15px] font-semibold text-ink-900">Platform</h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Organisations" value={stats?.organizations?.total ?? 0} hint={`${stats?.organizations?.verified ?? 0} verified`} />
          <StatCard label="Projects" value={stats?.projects?.total ?? 0} hint={`${(stats?.projects?.open ?? 0) + (stats?.projects?.in_progress ?? 0)} open or in progress`} />
          <StatCard label="Mentors" value={stats?.mentors?.total ?? 0} hint={`${stats?.mentors?.approved ?? stats?.mentors?.eligible ?? 0} approved`} />
          <StatCard label="People with accounts" value={stats?.users?.total ?? 0} />
          <StatCard label="Applications" value={stats?.applications?.total ?? 0} />
          <StatCard label="Active participations" value={stats?.participations?.active ?? 0} />
          <StatCard label="Completed projects" value={stats?.projects?.completed ?? 0} />
          <StatCard label="Recorded decisions" value={stats?.total_audit_events ?? 0} />
        </div>
      </section>

      <Card>
        <CardHeader title="Recent activity" description="Every decision is recorded with who made it and when."
          action={<Link href={adminHref(base, "/admin/audit")} className="inline-flex items-center gap-1 whitespace-nowrap text-[13px] font-medium text-brand-600 hover:underline"><History className="size-3.5" aria-hidden />Audit log</Link>} />
        {recentLogs.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-ink-500">No decisions recorded yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {recentLogs.map((log) => (
              <li key={log.id} className="flex items-center justify-between gap-4 px-5 py-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink-900">{humanizeEvent(log.event_type)}</p>
                  <p className="truncate text-[13px] text-ink-500">by {log.actor_name || log.actor_email || "a team member"}</p>
                </div>
                <time dateTime={log.created_at} className="shrink-0 text-[13px] tabular-nums text-ink-500">
                  {new Date(log.created_at).toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </time>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
