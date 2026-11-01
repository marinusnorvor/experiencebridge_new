"use client";

import { useEffect, useId, useRef, type ComponentProps, type ReactNode } from "react";
import Link from "next/link";
import { useOrganizationDemo } from "../../hooks/organization-demo-context";
import { OrganizationIcon } from "./organization-ui";
import styles from "./portal.module.css";
export { styles as portalStyles };

export function PortalPage({ title, description, action, children }: { title: string; description: string; action?: ReactNode; children: ReactNode }) {
  const { notice } = useOrganizationDemo();
  return <main className={styles.page}><div className={styles.heading}><div><p className={styles.eyebrow}>Organization workspace</p><h1 className={styles.title}>{title}</h1><p className={styles.subtitle}>{description}</p></div>{action}</div><div className={styles.disclosure}><span><strong>Synthetic local demo</strong> · No database writes. Decisions reset on refresh.</span><span>Do not enter real or confidential information.</span></div>{notice && <p role="status" className={styles.feedback}>{notice}</p>}{children}</main>;
}
export function Button({ primary, danger, className = "", type = "button", ...props }: ComponentProps<"button"> & { primary?: boolean; danger?: boolean }) {
  return <button type={type} className={`${styles.button} ${primary ? styles.primary : ""} ${danger ? styles.danger : ""} ${className}`} {...props} />;
}
export function ActionLink({ primary, children, ...props }: ComponentProps<typeof Link> & { primary?: boolean }) {
  return <Link {...props} className={`${styles.button} ${primary ? styles.primary : ""} ${props.className ?? ""}`}>{children}</Link>;
}
export function Badge({ children, tone = "muted" }: { children: ReactNode; tone?: "muted" | "warning" | "positive" }) { return <span className={styles.badge} data-tone={tone}>{children}</span>; }
export function Empty({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) { return <div className={styles.empty}><h2>{title}</h2><p>{children}</p>{action}</div>; }
export function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: (props: { id: string; "aria-invalid": boolean; "aria-describedby"?: string; className: string }) => ReactNode }) {
  const id = useId();
  return <div><label htmlFor={id} className={styles.label}>{label}</label>{children({ id, "aria-invalid": !!error, "aria-describedby": error || hint ? `${id}-help` : undefined, className: styles.input })}{(error || hint) && <span id={`${id}-help`} className={error ? styles.error : styles.help}>{error ?? hint}</span>}</div>;
}
export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const dialog = ref.current;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    dialog?.showModal(); document.body.style.overflow = "hidden";
    return () => { dialog?.close(); document.body.style.overflow = overflow; if (opener?.isConnected) opener.focus(); };
  }, []);
  return <dialog ref={ref} className={styles.modal} aria-labelledby={id} onCancel={(event) => { event.preventDefault(); onClose(); }} onClick={(event) => {
    if (event.target !== event.currentTarget) return;
    const box = event.currentTarget.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) onClose();
  }}><div className={styles.modalHead}><div><p className={styles.eyebrow}>Local demo action</p><h2 id={id}>{title}</h2></div><Button aria-label="Close dialog" onClick={onClose}><OrganizationIcon name="close" /></Button></div><div className={styles.modalBody}>{children}</div></dialog>;
}
