"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { DashboardCategory, DashboardSnapshot } from "../../types/dashboard";
import { dashboardHref, formatDashboardDate, selectDashboardRecords } from "../../lib/dashboard-selectors";
import { OrganizationButton, OrganizationIcon } from "../ui/organization-ui";
import styles from "./dashboard.module.css";

const titles: Record<DashboardCategory, string> = {
  projects: "Active projects", applications: "New applications", reviews: "Pending deliverable reviews", deadlines: "Upcoming deadlines", invitations: "Mentor invitations",
};

export function DashboardDetail({ snapshot, view, recordId, emptyPreview }: { snapshot: DashboardSnapshot; view: DashboardCategory; recordId: string | null; emptyPreview: boolean }) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const [query, setQuery] = useState("");
  const project = view === "projects" ? snapshot.projects.find((item) => item.id === recordId && item.state === "Active") : undefined;
  const record = snapshot.records.find((item) => item.id === recordId && item.category === view);
  const missing = !!recordId && !project && !record;
  const title = missing ? "This preview isn’t available" : project?.title ?? record?.title ?? titles[view];
  const records = selectDashboardRecords(snapshot, view, query);
  const projects = snapshot.projects.filter((item) => item.state === "Active" && `${item.title} ${item.summary}`.toLowerCase().includes(query.trim().toLowerCase()));
  const count = view === "projects" ? projects.length : records.length;
  const close = () => router.replace(`/organization/dashboard${emptyPreview ? "?sample=empty" : ""}`, { scroll: false });

  useEffect(() => {
    const element = dialog.current;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    element?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      element?.close();
      document.body.style.overflow = overflow;
      if (opener?.isConnected && opener !== document.body) opener.focus();
      else document.getElementById("organization-content")?.focus();
    };
  }, []);

  useEffect(() => { heading.current?.focus(); }, [recordId, view]);

  function href(id?: string) {
    return `${dashboardHref(view, id)}${emptyPreview ? "&sample=empty" : ""}`;
  }

  return (
    <dialog ref={dialog} className={styles.dialog} aria-labelledby="dashboard-detail-title" aria-describedby="dashboard-detail-disclosure"
      onCancel={(event) => { event.preventDefault(); close(); }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) close();
      }}>
      <div className={styles.dialogHeader}>
        <div><span className={styles.eyebrow}>Dashboard preview</span><h2 ref={heading} tabIndex={-1} id="dashboard-detail-title">{title}</h2><p id="dashboard-detail-disclosure" className={styles.muted}>Synthetic records · read-only · no real verification</p></div>
        <OrganizationButton aria-label="Close dashboard preview" onClick={close}><OrganizationIcon name="close" /></OrganizationButton>
      </div>
      <div className={styles.dialogBody}>
        {(project || record?.href) && <Link className={styles.textLink} href={project ? `/organization/projects/${project.id}/workspace` : record!.href!}>Open full workspace record →</Link>}
        {recordId && <Link href={href()} replace scroll={false} className={styles.textLink}>← Back to {titles[view].toLowerCase()}</Link>}
        {missing ? <p role="status" className={styles.status}>The requested record is not in this sample collection. Choose another record or return to the overview.</p> : project ? <>
          <p className={styles.muted}>{project.summary}</p>
          <ul className={styles.details}>
            <li><strong>Milestone progress</strong><br />{project.completedMilestones} of {project.totalMilestones} complete in this fixture. Next: {project.nextMilestone}, due {formatDashboardDate(project.due)}.</li>
            <li><strong>Sample team</strong><br />{project.members.join(", ") || "No accepted members"}<br />{project.mentor}</li>
            <li><strong>Evidence stays separate</strong><br />Milestone progress is not an organization acceptance or an independent mentor assessment. Workspace actions aren’t available in this read-only preview.</li>
          </ul>
        </> : record ? <>
          <p className={styles.status}>{snapshot.projects.find((item) => item.id === record.projectId)?.title} · {formatDashboardDate(record.date)} · {record.status}</p>
          <p className={styles.muted}>{record.description}</p>
          <ul className={styles.details}>{record.details.map((detail) => <li key={detail}>{detail}</li>)}</ul>
          <p className={styles.muted}>This preview cannot send an offer, accept a deliverable, or grant access.</p>
        </> : <>
          <label htmlFor="dashboard-record-search" className={styles.rowTitle}>Search {titles[view].toLowerCase()}</label>
          <input id="dashboard-record-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} className={styles.input} placeholder="Search by name or project…" />
          <p role="status" className={styles.muted}>{count} {count === 1 ? "record" : "records"} in this sample collection</p>
          <ul className={styles.recordList}>
            {view === "projects" ? projects.map((item) => <li key={item.id}><Link className={styles.record} href={href(item.id)} replace scroll={false}><span className={styles.rowTitle}>{item.title} ↗</span><span className={styles.rowMeta}>{item.completedMilestones} of {item.totalMilestones} milestones · {item.state}</span></Link></li>) : records.map((item) => <li key={item.id}><Link className={styles.record} href={href(item.id)} replace scroll={false}><span className={styles.rowTitle}>{item.title} ↗</span><span className={styles.rowMeta}>{snapshot.projects.find((project) => project.id === item.projectId)?.title} · {item.status}</span></Link></li>)}
          </ul>
          {count === 0 && <div className={styles.empty}><h3>No matching records</h3><p>Try a different search or return to the overview.</p>{query && <OrganizationButton onClick={() => setQuery("")} className="mt-4">Clear search</OrganizationButton>}</div>}
        </>}
      </div>
    </dialog>
  );
}
