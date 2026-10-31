import Link from "next/link";
import type { DashboardProject } from "../../types/dashboard";
import { formatDashboardDate } from "../../lib/dashboard-selectors";
import { OrganizationIcon } from "../ui/organization-ui";
import styles from "./dashboard.module.css";

export function DashboardProjectCard({ project }: { project: DashboardProject }) {
  return <article className={styles.project}>
    <div className={styles.projectTop}><span aria-hidden="true" className={styles.monogram}>{project.title.split(" ").slice(0, 2).map((word) => word[0]).join("")}</span><span className={styles.badge}><span className={styles.dot} />{project.state}</span></div>
    <h3>{project.title}</h3><p className={styles.summary}>{project.summary}</p>
    <div className={styles.progressLabel}><span>Milestone progress</span><strong>{project.completedMilestones}/{project.totalMilestones}</strong></div>
    <progress className={styles.progress} value={project.completedMilestones} max={project.totalMilestones} aria-label={`${project.title}: milestone progress`} />
    <div className={styles.projectDue}><OrganizationIcon name="calendar" /><span>Next milestone · {formatDashboardDate(project.due)}</span></div>
    <div className={styles.projectFooter}><div className={styles.avatars} aria-label={`Sample team: ${project.members.join(", ")}`}>{project.members.map((member) => <span title={member} aria-hidden="true" className={styles.avatar} key={member}>{member.split(" ").at(-1)}</span>)}</div><Link href={`/organization/projects/${project.id}/workspace`} className={styles.textLink} aria-label={`Open workspace: ${project.title}`}>Open workspace <OrganizationIcon name="arrow" /></Link></div>
  </article>;
}
