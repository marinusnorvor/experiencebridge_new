"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useOrganizationDemo } from "../hooks/organization-demo-context";
import { portalDashboard } from "../lib/portal-dashboard";
import { dashboardHref, formatDashboardDate, getDashboardMetrics, parseDashboardView, selectAttention } from "../lib/dashboard-selectors";
import { DashboardDetail } from "../components/dashboard/dashboard-detail";
import { DashboardProjectCard } from "../components/dashboard/dashboard-project-card";
import { DashboardError, DashboardLoading } from "../components/dashboard/dashboard-states";
import { OrganizationButton, OrganizationIcon } from "../components/ui/organization-ui";
import styles from "../components/dashboard/dashboard.module.css";

export function OrganizationDashboardScreen() {
  return <SyntheticDashboard />;
}

function SyntheticDashboard() {
  const { state, preview, organization } = useOrganizationDemo();
  const params = useSearchParams();
  const router = useRouter();
  const [filter, setFilter] = useState("all");
  const [projectId, setProjectId] = useState("all");
  const emptyPreview = preview && params.get("sample") === "empty";
  const liveSnapshot = portalDashboard(state);
  const snapshot = emptyPreview ? { ...liveSnapshot, projects: [], records: [], attention: [], activity: [] } : liveSnapshot;
  const view = parseDashboardView(params.get("view"));
  const attention = selectAttention(snapshot, filter, projectId);
  const activeProjects = snapshot.projects.filter((project) => project.state === "Active");
  const highPriority = snapshot.attention.filter((item) => item.priority === "High").length;
  const firstPriority = snapshot.records.find((record) => record.id === snapshot.attention[0]?.recordId);
  const filters = [{ id: "all", label: "All" }, { id: "reviews", label: "Reviews" }, { id: "applications", label: "Applications" }, { id: "deadlines", label: "Deadlines" }, { id: "invitations", label: "Invitations" }];

  // Explicit local QA previews. These flags never change production auth or data.
  if (preview && params.get("sample") === "loading") return <><p className="px-6 pt-4 text-xs text-slate-600">Synthetic loading-state preview · <Link href="/organization/dashboard" className="underline">Exit preview</Link></p><DashboardLoading /></>;
  if (preview && params.get("sample") === "error") return <><p className="px-6 pt-4 text-xs text-slate-600">Synthetic error-state preview</p><DashboardError reset={() => router.replace("/organization/dashboard")} /></>;

  function href(category: Parameters<typeof dashboardHref>[0], id?: string) {
    return `${dashboardHref(category, id)}${emptyPreview ? "&sample=empty" : ""}`;
  }

  return (
    <main aria-labelledby="org-dashboard-title" className={styles.dashboard}>
      <div className={styles.intro}>
        <div><p className={styles.eyebrow}><span className={styles.dot} />Your organization, at a glance</p><h1 id="org-dashboard-title" className={styles.title}>Good work starts with a clear view.</h1><p className={styles.muted}>{state.profile.name} · <span>{preview ? "Synthetic preview" : organization?.verification_status ?? "Create an organization in Settings"}</span></p></div>
        <Link href="/organization/projects/new" className={styles.primary}><OrganizationIcon name="create-project" />Create project</Link>
      </div>

      <section aria-label="Overview Metrics" className={styles.metrics}>
        {getDashboardMetrics(snapshot).map((metric) => <Link className={styles.metric} key={metric.id} href={href(metric.id)} scroll={false} aria-label={`${metric.label}: ${metric.value}. View records.`}><span className={styles.metricLabel}>{metric.label}<OrganizationIcon name={metric.icon} /></span><span className={styles.metricValue}>{String(metric.value).padStart(2, "0")}<span className={styles.metricArrow}><OrganizationIcon name="arrow" /></span></span><span className={styles.metricCaption}>{metric.caption}</span></Link>)}
      </section>

      {params.has("view") && !view && <p role="status" className={styles.status}>That dashboard view is unavailable. Choose one of the overview metrics above.</p>}
      <div className={styles.columns}>
        <div className={styles.mainColumn}>
          <section className={styles.panel} aria-labelledby="attention-heading">
            <div className={styles.sectionHeader}><h2 id="attention-heading">Needs your attention <span className={styles.count}>{snapshot.attention.length}</span></h2><label><span className={styles.srOnly}>Filter attention by project</span><select className={styles.select} value={projectId} onChange={(event) => setProjectId(event.target.value)}><option value="all">All projects</option>{snapshot.projects.map((project) => <option value={project.id} key={project.id}>{project.title}</option>)}</select></label></div>
            <div className={styles.filters} role="group" aria-label="Filter attention by category">{filters.map((item) => <button className={styles.filter} key={item.id} type="button" aria-pressed={filter === item.id} onClick={() => setFilter(item.id)}>{item.label}</button>)}</div>
            <p className={styles.srOnly} role="status">{attention.length} attention {attention.length === 1 ? "item" : "items"} shown</p>
            <ul className={styles.attentionList}>{attention.map((item) => {
              const record = snapshot.records.find((entry) => entry.id === item.recordId)!;
              const project = snapshot.projects.find((entry) => entry.id === record.projectId);
              return <li className={styles.attentionRow} key={item.id}><span className={styles.rowIcon} data-priority={item.priority}><OrganizationIcon name={record.category === "deadlines" ? "alert" : record.category} /></span><div><span className={styles.rowTitle}>{item.label}</span><span className={styles.rowMeta}>{project?.title}</span><span className={styles.rowMeta}>{item.priority === "High" ? "Priority · " : ""}{record.status}</span></div><Link className={`${styles.textLink} ${styles.rowAction}`} href={record.href ?? href(record.category, record.id)} scroll={false}>{item.action}<OrganizationIcon name="arrow" /></Link></li>;
            })}</ul>
            {!attention.length && <div className={styles.empty}><span className={styles.emptyIcon}><OrganizationIcon name="check" /></span><h3>{snapshot.attention.length ? "Nothing in this view" : "A clear starting point"}</h3><p>{snapshot.attention.length ? "Try another project or category to see what needs attention." : "No sample items need attention. New project activity will appear here."}</p>{(filter !== "all" || projectId !== "all") && <OrganizationButton className="mt-4" onClick={() => { setFilter("all"); setProjectId("all"); }}>Reset filters</OrganizationButton>}</div>}
          </section>

          <section aria-labelledby="active-projects-heading">
            <div className={styles.projectHeading}><h2 id="active-projects-heading" className={styles.sectionTitle}>Work in motion <span className={styles.count}>{activeProjects.length}</span></h2><Link className={styles.textLink} href={href("projects")} scroll={false}>View active projects<OrganizationIcon name="arrow" /></Link></div>
            <div className={styles.projectGrid}>{activeProjects.map((project) => <DashboardProjectCard key={project.id} project={project} />)}</div>
            {!activeProjects.length && <div className={`${styles.panel} ${styles.empty}`}><h3>Your next collaboration belongs here</h3><p>Active projects will bring milestones, team members, and next steps into one view.</p><Link href="/organization/projects/new" className={styles.textLink}>Start with a project brief <OrganizationIcon name="arrow" /></Link></div>}
          </section>
        </div>

        <aside className={styles.sideColumn} aria-label="Focus and recent activity">
          <section className={styles.focusPanel}><span className={styles.eyebrow}>A little focus goes a long way</span><h2>{highPriority ? `${highPriority} things deserve a closer look.` : "Space for your next good idea."}</h2><p>{highPriority ? "A timely check-in and thoughtful feedback can help your teams take their next step." : "A well-scoped challenge gives emerging talent a purposeful place to start."}</p>{firstPriority ? <Link className={styles.textLink} href={firstPriority.href ?? href(firstPriority.category, firstPriority.id)} scroll={false}>Start with the priority <OrganizationIcon name="arrow" /></Link> : <Link className={styles.textLink} href="/organization/projects/new">Explore project creation <OrganizationIcon name="arrow" /></Link>}</section>
          <section className={styles.activity} aria-labelledby="activity-heading"><div className={styles.activityHeader}><h2 id="activity-heading" className={styles.sectionTitle}>Recent activity</h2><span className={styles.muted}>Sample history</span></div><ol className={styles.timeline}>{snapshot.activity.map((event) => {
            const record = snapshot.records.find((item) => item.id === event.recordId)!;
            return <li className={styles.timelineItem} key={event.id}><Link href={event.href ?? href(record.category, record.id)} scroll={false}>{event.title}</Link><p>{event.description}</p><time dateTime={event.date}>{formatDashboardDate(event.date)}</time></li>;
          })}</ol>{!snapshot.activity.length && <p className={styles.muted}>No activity yet. Project updates will appear here as work progresses.</p>}</section>
        </aside>
      </div>
      <p className={styles.footnote}><span>Synthetic snapshot · {formatDashboardDate(snapshot.asOf)} 2026 · no live or verified activity</span><span>Organization acceptance and mentor assessment remain separate.</span></p>
      {emptyPreview && <Link href="/organization/dashboard" className={styles.textLink}>Restore sample overview <OrganizationIcon name="arrow" /></Link>}
      {view && <DashboardDetail key={view} snapshot={snapshot} view={view} recordId={params.get("record")} emptyPreview={emptyPreview} />}
    </main>
  );
}
