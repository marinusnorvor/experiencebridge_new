"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Popover as P } from "radix-ui";
import { Bell, CheckCircle2, ChevronRight } from "lucide-react";
import { usePortalApi } from "@/lib/api/portal-api";
import { cn } from "@/lib/utils/cn";
import { adminHref, useAdminBase } from "./admin-base";
import type { Portal } from "./portal-nav";
import { termsSnapshot } from "@/features/student/lib/api-records";

export type ActionItem = { id: string; title: string; detail?: string; href: string; tone: "action" | "info" | "celebrate" };
type Api = Awaited<ReturnType<ReturnType<typeof usePortalApi>["getApi"]>>;

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/**
 * Action Centre v1 (PRODUCT-PLAN §4.5): derived on the client from existing list endpoints.
 * Every handoff that needs this person shows up here with a link to where they act.
 */
async function loadItems(api: Api, portal: Portal, adminBase: string): Promise<ActionItem[]> {
  const items: ActionItem[] = [];
  if (portal === "student") {
    const [offers, applications, participations] = await Promise.all([api.getMyOffers(), api.getMyApplications(), api.getMyParticipations()]);
    const titles = new Map<string, string>();
    const title = async (projectId: string) => {
      if (!titles.has(projectId)) titles.set(projectId, (await api.getProject(projectId)).data?.title ?? "a project");
      return titles.get(projectId)!;
    };
    for (const offer of (offers.data ?? []).filter((o) => o.status === "offered")) {
      items.push({ id: `offer-${offer.id}`, tone: "celebrate", title: `You have an offer for ${await title(offer.project_id)}`, detail: offer.expires_at ? `Reply before ${new Date(offer.expires_at).toLocaleDateString()}` : "Accept or decline it", href: `/student/applications/${offer.application_id}` });
    }
    for (const app of (applications.data ?? []).filter((a) => a.status === "shortlisted")) {
      items.push({ id: `short-${app.id}`, tone: "info", title: `You're shortlisted for ${await title(app.project_id)}`, detail: "The organisation is deciding on offers", href: `/student/applications/${app.id}` });
    }
    // Participations carry their own agreed-terms snapshot; completed projects aren't readable via /projects/{id}.
    const partTitle = async (partId: string, projectId: string) => {
      if (!titles.has(projectId)) {
        const detail = (await api.getParticipation(partId)).data;
        titles.set(projectId, detail ? termsSnapshot(detail.agreed_terms).title : "your project");
      }
      return titles.get(projectId)!;
    };
    for (const part of (participations.data ?? []).filter((p) => p.status === "active")) {
      const subs = (await api.getSubmissions(part.id)).data ?? [];
      if (subs.some((s) => s.status === "revision_requested")) {
        items.push({ id: `rev-${part.id}`, tone: "action", title: `Revision requested on ${await partTitle(part.id, part.project_id)}`, detail: "Read the feedback and resubmit", href: `/student/projects/${part.id}` });
      } else if (!subs.some((s) => s.status === "submitted")) {
        items.push({ id: `work-${part.id}`, tone: "action", title: `Submit your work for ${await partTitle(part.id, part.project_id)}`, detail: "Your mentor reviews it next", href: `/student/projects/${part.id}` });
      }
    }
    for (const part of (participations.data ?? []).filter((p) => p.status === "completed" || p.status === "partially_completed")) {
      items.push({ id: `pass-${part.id}`, tone: "celebrate", title: `${await partTitle(part.id, part.project_id)} is in your Passport`, detail: "Verified by the organisation", href: "/student/passport" });
    }
  }
  if (portal === "organization") {
    const orgs = (await api.getMyOrganizations()).data ?? [];
    for (const org of orgs) {
      if (org.verification_status === "draft") items.push({ id: `org-${org.id}`, tone: "action", title: `Submit ${org.display_name} for verification`, detail: "You can publish projects once verified", href: "/organization/settings" });
      if (org.verification_status === "changes_requested") items.push({ id: `org-${org.id}`, tone: "action", title: "Changes requested on your organisation", detail: "Read the reason and resubmit", href: "/organization/settings" });
      const projects = (await api.getOrganizationProjects(org.id)).data ?? [];
      for (const project of projects) {
        if (project.status === "changes_requested") items.push({ id: `proj-${project.id}`, tone: "action", title: `Changes requested on ${project.title}`, detail: "Update the brief and resubmit", href: `/organization/projects/${project.id}/edit` });
        if (project.status === "open" || project.status === "in_progress") {
          const apps = (await api.getProjectApplications(project.id)).data ?? [];
          const fresh = apps.filter((a) => a.status === "submitted" || a.status === "under_review").length;
          if (fresh) items.push({ id: `apps-${project.id}`, tone: "action", title: `${plural(fresh, "new application")} for ${project.title}`, detail: "Shortlist, offer or decline", href: "/organization/applications" });
          const parts = (await api.getProjectParticipations(project.id)).data ?? [];
          const ready = parts.filter((p) => p.status === "under_review").length;
          if (ready) items.push({ id: `fin-${project.id}`, tone: "action", title: `Finalise ${plural(ready, "participant")} on ${project.title}`, detail: "This writes to their Passport", href: `/organization/projects/${project.id}/workspace` });
          if (project.status === "open" && parts.some((p) => p.status === "active")) items.push({ id: `start-${project.id}`, tone: "info", title: `Start ${project.title}`, detail: "Your participant has accepted", href: `/organization/projects/${project.id}/workspace` });
        }
      }
    }
  }
  if (portal === "mentor") {
    const assignments = (await api.getMyMentorAssignments()).data ?? [];
    for (const a of assignments.filter((x) => x.status === "proposed")) {
      const project = (await api.getProject(a.project_id)).data;
      items.push({ id: `inv-${a.id}`, tone: "action", title: `Invitation to mentor on ${project?.title ?? "a project"}`, detail: "Accept or decline", href: `/mentor/assignments/${a.id}` });
    }
    for (const a of assignments.filter((x) => x.status === "accepted")) {
      const subs = (await api.getSubmissions(a.participation_id)).data ?? [];
      const waiting = subs.filter((s) => s.status === "submitted").length;
      if (waiting) items.push({ id: `rev-${a.id}`, tone: "action", title: `${plural(waiting, "submission")} to review`, detail: "The student is waiting for your feedback", href: `/mentor/participations/${a.participation_id}` });
    }
  }
  if (portal === "admin") {
    const [orgs, projects, mentors] = await Promise.all([api.getPendingOrganizations(), api.getPendingProjects(), api.getMentorProfilesForAdmin()]);
    const o = orgs.data?.length ?? 0, p = projects.data?.length ?? 0, m = (mentors.data ?? []).filter((x) => x.eligibility_status === "pending").length;
    if (o) items.push({ id: "a-orgs", tone: "action", title: `${plural(o, "organisation")} awaiting verification`, href: adminHref(adminBase, "/admin/organizations") });
    if (p) items.push({ id: "a-proj", tone: "action", title: `${plural(p, "project")} awaiting review`, href: adminHref(adminBase, "/admin/projects") });
    if (m) items.push({ id: "a-ment", tone: "action", title: `${plural(m, "mentor")} awaiting approval`, href: adminHref(adminBase, "/admin/mentors") });
  }
  return items;
}

export function useActionItems(portal: Portal) {
  const { getApi, isSignedIn } = usePortalApi();
  const adminBase = useAdminBase();
  return useQuery({
    queryKey: ["action-centre", portal],
    enabled: isSignedIn,
    refetchInterval: 45_000,
    queryFn: async () => loadItems(await getApi(), portal, adminBase),
  });
}

export function ActionList({ items, empty, onNavigate }: { items: ActionItem[]; empty?: string; onNavigate?: () => void }) {
  if (!items.length) {
    return <p className="flex items-center gap-2 px-3 py-6 text-sm text-ink-500"><CheckCircle2 className="size-4 text-success" aria-hidden />{empty ?? "You're all caught up."}</p>;
  }
  return (
    <ul className="divide-y divide-line">
      {items.map((item) => (
        <li key={item.id}>
          <Link href={item.href} onClick={onNavigate} className="group flex items-center gap-3 px-3 py-3 hover:bg-canvas">
            <span aria-hidden className={cn("size-2 shrink-0 rounded-full", item.tone === "action" && "bg-brand-600", item.tone === "info" && "bg-info", item.tone === "celebrate" && "bg-gold-400")} />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-ink-900">{item.title}</span>
              {item.detail && <span className="block text-[13px] text-ink-500">{item.detail}</span>}
            </span>
            <ChevronRight className="size-4 text-ink-400 transition group-hover:translate-x-0.5" aria-hidden />
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Bell + panel in the app header. */
export function ActionCentre({ portal }: { portal: Portal }) {
  const { data = [] } = useActionItems(portal);
  const count = data.filter((i) => i.tone !== "info").length;
  return (
    <P.Root>
      <P.Trigger className="relative grid size-9 place-items-center rounded-full text-ink-700 hover:bg-ink-900/5 data-[state=open]:bg-ink-900/5" aria-label={count ? `Needs your attention: ${count}` : "Needs your attention"}>
        <Bell className="size-[18px]" aria-hidden />
        {count > 0 && <span className="absolute right-1 top-1 grid min-w-4 place-items-center rounded-full bg-gold-400 px-1 text-[10px] font-bold leading-4 text-ink-900">{count}</span>}
      </P.Trigger>
      <P.Portal>
        <P.Content align="end" sideOffset={8} className="z-50 w-[min(92vw,380px)] overflow-hidden rounded-xl border border-line bg-surface shadow-pop data-[state=open]:animate-rise">
          <div className="border-b border-line px-3 py-2.5"><p className="text-sm font-semibold text-ink-900">Needs your attention</p></div>
          <div className="max-h-[60vh] overflow-y-auto"><ActionList items={data} /></div>
        </P.Content>
      </P.Portal>
    </P.Root>
  );
}
