"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { DropdownMenu as M } from "radix-ui";
import { Check, ChevronDown, GraduationCap, LogOut, MoreHorizontal, Building2, UserRound, ShieldCheck } from "lucide-react";
import { useAuth } from "@/components/layouts/auth-provider";
import { Dialog } from "@/components/ui/dialog";
import { cn } from "@/lib/utils/cn";
import { adminHref, useAdminBase } from "./admin-base";
import { PORTAL_HOME, PORTAL_LABEL, portalNav, type NavItem, type Portal } from "./portal-nav";
import { Logo } from "./logo";

const PORTAL_ICON = { student: UserRound, organization: Building2, mentor: GraduationCap, admin: ShieldCheck } as const;

function initials(name?: string | null) {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "EB";
}

export function AppShell({ portal, children, badges = {}, headerExtra, actionCentre }: {
  portal: Portal; children: ReactNode; badges?: Record<string, number>; headerExtra?: ReactNode; actionCentre?: ReactNode;
}) {
  const pathname = usePathname();
  const adminBase = useAdminBase();
  const items = portalNav(portal).map((item) => ({ ...item, href: adminHref(adminBase, item.href) }));
  const isActive = (item: NavItem) => {
    if (item.exact) return pathname === item.href;
    return pathname === item.href || pathname.startsWith(item.href + "/") || (item.href.endsWith("/dashboard") && pathname === item.href.replace("/dashboard", ""));
  };
  const [moreOpen, setMoreOpen] = useState(false);
  const tabs = items.length > 5 ? items.slice(0, 4) : items;
  const overflow = items.length > 5 ? items.slice(4) : [];

  return (
    <div className="min-h-dvh bg-canvas">
      <a href="#main" className="sr-only z-[60] rounded-md bg-surface px-3 py-2 focus:not-sr-only focus:fixed focus:left-3 focus:top-3">Skip to content</a>
      <header className="sticky top-0 z-40 border-b border-line/80 bg-surface/80 backdrop-blur-xl supports-[backdrop-filter]:bg-surface/70">
        <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-3 px-4 sm:px-6">
          <Link href="/" className="shrink-0" aria-label="ExperienceBridge home"><Logo /></Link>
          <span aria-hidden className="hidden h-5 w-px bg-line sm:block" />
          <span className="hidden text-[13px] font-medium text-ink-500 sm:block">{PORTAL_LABEL[portal]}</span>
          <div className="ml-auto flex items-center gap-1.5">
            {headerExtra}
            {actionCentre}
            <AccountMenu portal={portal} />
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1400px]">
        {items.length > 1 && (
          <aside className="sticky top-14 hidden h-[calc(100dvh-3.5rem)] w-60 shrink-0 border-r border-line/70 px-3 py-6 lg:block">
            <nav aria-label={`${PORTAL_LABEL[portal]} navigation`} className="space-y-0.5">
              {items.map((item) => <SideLink key={item.href} item={item} active={isActive(item)} badge={item.badgeKey ? badges[item.badgeKey] : undefined} />)}
            </nav>
          </aside>
        )}
        <main id="main" tabIndex={-1} className={cn("min-w-0 flex-1 px-4 pb-28 pt-6 outline-none sm:px-6 lg:px-10 lg:pb-16 lg:pt-8", portal === "admin" && "admin-content")}>
          <div className="mx-auto max-w-[1200px] animate-rise">{children}</div>
        </main>
      </div>

      {items.length > 1 && (
        <nav aria-label={`${PORTAL_LABEL[portal]} navigation`} className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
          <div className="mx-auto flex max-w-md justify-around">
            {tabs.map((item) => <TabLink key={item.href} item={item} active={isActive(item)} badge={item.badgeKey ? badges[item.badgeKey] : undefined} />)}
            {overflow.length > 0 && (
              <button type="button" onClick={() => setMoreOpen(true)} className={cn("flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium", overflow.some(isActive) ? "text-brand-600" : "text-ink-500")}>
                <MoreHorizontal className="size-5" aria-hidden />More
              </button>
            )}
          </div>
        </nav>
      )}
      <Dialog open={moreOpen} onOpenChange={setMoreOpen} title="More">
        <nav className="space-y-1">{overflow.map((item) => <SideLink key={item.href} item={item} active={isActive(item)} badge={item.badgeKey ? badges[item.badgeKey] : undefined} onNavigate={() => setMoreOpen(false)} />)}</nav>
      </Dialog>
    </div>
  );
}

function SideLink({ item, active, badge, onNavigate }: { item: NavItem; active: boolean; badge?: number; onNavigate?: () => void }) {
  const Icon = item.icon;
  return (
    <Link href={item.href} prefetch onClick={onNavigate} aria-current={active ? "page" : undefined}
      className={cn("group flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-sm font-medium transition-colors",
        active ? "bg-brand-50 text-brand-700" : "text-ink-700 hover:bg-ink-900/[0.04] hover:text-ink-900")}>
      <Icon className={cn("size-4", active ? "text-brand-600" : "text-ink-400 group-hover:text-ink-700")} aria-hidden />
      <span className="flex-1">{item.label}</span>
      {!!badge && <span className="rounded-full bg-brand-600 px-1.5 py-px text-[11px] font-semibold tabular-nums text-white">{badge}<span className="sr-only"> waiting</span></span>}
    </Link>
  );
}

function TabLink({ item, active, badge }: { item: NavItem; active: boolean; badge?: number }) {
  const Icon = item.icon;
  return (
    <Link href={item.href} aria-current={active ? "page" : undefined}
      className={cn("relative flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium", active ? "text-brand-600" : "text-ink-500")}>
      <Icon className="size-5" aria-hidden />
      <span className="max-w-[72px] truncate">{item.label}</span>
      {!!badge && <span className="absolute right-[calc(50%-18px)] top-1.5 size-2 rounded-full bg-gold-400" aria-label={`${badge} waiting`} />}
    </Link>
  );
}

/** Avatar menu: who you are, workspace switcher, add a role, sign out. */
export function AccountMenu({ portal }: { portal?: Portal }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const contexts = (user?.effective_contexts ?? []) as string[];
  const available = (["student", "organization", "mentor", "admin"] as const).filter((p) => p === "student" || contexts.includes(p));
  return (
    <M.Root>
      <M.Trigger className="flex h-9 items-center gap-2 rounded-full border border-line bg-surface pl-1 pr-2.5 text-sm text-ink-900 hover:border-line-strong data-[state=open]:border-brand-600/40" aria-label="Account and workspaces">
        <span className="grid size-7 place-items-center rounded-full bg-ink-900 text-[11px] font-semibold text-white">{initials(user?.display_name)}</span>
        <span className="hidden max-w-[140px] truncate font-medium sm:block">{user?.display_name ?? "Account"}</span>
        <ChevronDown className="size-3.5 text-ink-500" aria-hidden />
      </M.Trigger>
      <M.Portal>
        <M.Content align="end" sideOffset={8} className="z-50 w-72 rounded-xl border border-line bg-surface p-1.5 shadow-pop data-[state=open]:animate-rise">
          <div className="px-2.5 py-2">
            <p className="truncate text-sm font-semibold text-ink-900">{user?.display_name}</p>
            <p className="truncate text-[13px] text-ink-500">{user?.email}</p>
          </div>
          <M.Separator className="my-1 h-px bg-line" />
          <M.Label className="px-2.5 pb-1 pt-1.5 text-xs font-medium text-ink-500">Workspaces</M.Label>
          {available.map((p) => {
            const Icon = PORTAL_ICON[p];
            return (
              <M.Item key={p} onSelect={() => router.push(PORTAL_HOME[p])} className="flex h-9 cursor-pointer items-center gap-2.5 rounded-lg px-2.5 text-sm text-ink-700 outline-none data-[highlighted]:bg-canvas data-[highlighted]:text-ink-900">
                <Icon className="size-4 text-ink-400" aria-hidden /><span className="flex-1">{PORTAL_LABEL[p]}</span>
                {p === portal && <Check className="size-4 text-brand-600" aria-label="current" />}
              </M.Item>
            );
          })}
          {(!contexts.includes("organization") || !contexts.includes("mentor")) && <M.Separator className="my-1 h-px bg-line" />}
          {!contexts.includes("organization") && (
            <M.Item onSelect={() => router.push("/onboarding?path=organization")} className="flex h-9 cursor-pointer items-center gap-2.5 rounded-lg px-2.5 text-sm text-ink-700 outline-none data-[highlighted]:bg-canvas">
              <Building2 className="size-4 text-ink-400" aria-hidden />Set up an organisation
            </M.Item>
          )}
          {!contexts.includes("mentor") && (
            <M.Item onSelect={() => router.push("/onboarding?path=mentor")} className="flex h-9 cursor-pointer items-center gap-2.5 rounded-lg px-2.5 text-sm text-ink-700 outline-none data-[highlighted]:bg-canvas">
              <GraduationCap className="size-4 text-ink-400" aria-hidden />Become a mentor
            </M.Item>
          )}
          <M.Separator className="my-1 h-px bg-line" />
          <M.Item onSelect={async () => { await logout(); router.push("/sign-in"); }} className="flex h-9 cursor-pointer items-center gap-2.5 rounded-lg px-2.5 text-sm text-ink-700 outline-none data-[highlighted]:bg-danger-bg data-[highlighted]:text-danger-text">
            <LogOut className="size-4" aria-hidden />Sign out
          </M.Item>
        </M.Content>
      </M.Portal>
    </M.Root>
  );
}
