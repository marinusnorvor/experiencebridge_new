"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePortalApi } from "@/lib/api/portal-api";

interface NavItem {
  name: string;
  href: string;
  badgeKey?: "orgs" | "projects" | "mentors";
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { name: "Overview", href: "/admin/dashboard", icon: "📊" },
  { name: "Organizations", href: "/admin/organizations", badgeKey: "orgs", icon: "🏢" },
  { name: "Projects", href: "/admin/projects", badgeKey: "projects", icon: "📁" },
  { name: "Mentors", href: "/admin/mentors", badgeKey: "mentors", icon: "🎓" },
  { name: "Users & Roles", href: "/admin/users", icon: "👥" },
  { name: "Applications", href: "/admin/applications", icon: "📝" },
  { name: "Workspaces", href: "/admin/participations", icon: "💼" },
  { name: "Audit History", href: "/admin/audit", icon: "🛡️" },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { getApi, isSignedIn } = usePortalApi();
  const [counts, setCounts] = useState<{ orgs: number; projects: number; mentors: number }>({
    orgs: 0,
    projects: 0,
    mentors: 0,
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadBadges() {
      if (!isSignedIn) return;
      try {
        const api = await getApi();
        const [orgsRes, projRes, mentorRes] = await Promise.all([
          api.getPendingOrganizations(),
          api.getPendingProjects(),
          api.getMentorProfilesForAdmin(),
        ]);
        if (active) {
          const pendingMentors = (mentorRes.data ?? []).filter((m) => m.eligibility_status === "pending").length;
          setCounts({
            orgs: orgsRes.data?.length ?? 0,
            projects: projRes.data?.length ?? 0,
            mentors: pendingMentors,
          });
        }
      } catch {
        // Silently fail badge counts if non-admin or loading
      }
    }
    void loadBadges();
    return () => {
      active = false;
    };
  }, [getApi, isSignedIn, pathname]);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col md:flex-row">
      {/* Mobile Top Bar */}
      <div className="md:hidden flex items-center justify-between border-b border-slate-800 bg-slate-950 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="rounded-lg bg-indigo-600 px-2 py-1 text-xs font-bold text-white">EB ADMIN</span>
          <span className="text-sm font-semibold text-slate-200">Governance Portal</span>
        </div>
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-200"
        >
          {mobileMenuOpen ? "Close Menu" : "Menu"}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside
        className={`${
          mobileMenuOpen ? "block" : "hidden"
        } md:block w-full md:w-64 border-r border-slate-800 bg-slate-950 p-4 shrink-0 flex flex-col justify-between`}
      >
        <div className="space-y-6">
          <div className="hidden md:flex items-center gap-3 px-2 py-3 border-b border-slate-800/80">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow">
              EB
            </div>
            <div>
              <div className="text-sm font-bold tracking-tight text-white">ExperienceBridge</div>
              <div className="text-[11px] font-medium text-indigo-400">Platform Administration</div>
            </div>
          </div>

          <nav aria-label="Admin Navigation" className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href || (item.href !== "/admin/dashboard" && pathname?.startsWith(item.href));
              const badge = item.badgeKey ? counts[item.badgeKey] : 0;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-medium transition ${
                    active
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <span className="text-base">{item.icon}</span>
                    <span>{item.name}</span>
                  </span>
                  {badge > 0 && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        active ? "bg-white text-indigo-700" : "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
                      }`}
                    >
                      {badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer / System Status */}
        <div className="mt-8 border-t border-slate-800/80 pt-4 px-2 space-y-2">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Production Live</span>
            </span>
            <span className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-300">v0.1.0</span>
          </div>
          <div className="text-[10px] text-slate-400">
            Independent Reviewer & Governance Lane
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 bg-slate-900 overflow-y-auto">
        <header className="border-b border-slate-800 bg-slate-950/70 backdrop-blur px-6 py-4 flex items-center justify-between sticky top-0 z-10">
          <div>
            <h1 className="text-base font-bold text-white tracking-tight">Admin & Governance Oversight</h1>
            <p className="text-xs text-slate-400">ExperienceBridge System Management</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 text-[11px] font-semibold text-emerald-400 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Platform Admin
            </span>
            <Link
              href="/student/dashboard"
              className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-700 transition"
            >
              Exit to Student
            </Link>
          </div>
        </header>

        <div className="p-6 max-w-7xl mx-auto space-y-6">
          {children}
        </div>
      </main>
    </div>
  );
}
