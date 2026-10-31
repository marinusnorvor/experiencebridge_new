import Link from "next/link";
import { OrganizationButton, OrganizationIcon } from "../ui/organization-ui";
import styles from "./dashboard.module.css";

export function DashboardLoading() {
  return <main className={styles.dashboard} aria-busy="true" aria-label="Organization dashboard"><p role="status" className={styles.muted}>Loading your organization overview…</p><div aria-hidden="true" className="mt-6"><div className={styles.skeleton} style={{ width: "55%", height: 32 }} /><div className={styles.skeleton} style={{ height: 130, marginTop: 32 }} /><div className={`${styles.skeleton} ${styles.skeletonTall}`} /></div></main>;
}

export function DashboardError({ reset }: { reset: () => void }) {
  return <main className={styles.dashboard}><div className={`${styles.panel} ${styles.empty}`}><span className={styles.emptyIcon}><OrganizationIcon name="alert" /></span><h1 className={styles.sectionTitle}>The overview couldn’t load</h1><p role="alert">Please try again. No project or application data has been changed.</p><OrganizationButton onClick={reset} className="mt-5">Try again</OrganizationButton><div><Link className={styles.textLink} href="/organization/dashboard">Return to dashboard</Link></div></div></main>;
}
