"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { isPortalPresentationMode } from "@/lib/auth/portal-presentation";
import { syntheticOrganizationData } from "../../data/synthetic-organization-data";
import { useOrganizationDemo } from "../../hooks/organization-demo-context";
import { getActiveOrganizationNavItem, ORGANIZATION_NAV_ITEMS } from "../../lib/organization-routes";
import { OrganizationBadge, OrganizationButton, OrganizationIcon } from "../ui/organization-ui";
import styles from "./organization-shell.module.css";

export function OrganizationPortalShell({ children }: { children: ReactNode }) {
  const { state } = useOrganizationDemo();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const drawer = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const presentationMode = isPortalPresentationMode();
  const activeItem = getActiveOrganizationNavItem(pathname);
  const organizationName = presentationMode ? state.profile.name : "Organization workspace";

  // A native modal makes the background inert and contains keyboard focus.
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const dialog = drawer.current;
    const opener = trigger.current;
    dialog?.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const desktop = window.matchMedia("(min-width: 1024px)");
    const closeOnDesktop = () => { if (desktop.matches) setMobileMenuOpen(false); };
    desktop.addEventListener("change", closeOnDesktop);
    return () => {
      desktop.removeEventListener("change", closeOnDesktop);
      dialog?.close();
      document.body.style.overflow = previousOverflow;
      opener?.focus();
    };
  }, [mobileMenuOpen]);

  function navigation(mobile = false) {
    return (
      <nav aria-label={mobile ? "Mobile organization sections" : "Organization sections"} className={styles.nav}>
        {ORGANIZATION_NAV_ITEMS.map((item) => (
          <Link key={item.id} href={item.href} aria-current={activeItem?.id === item.id ? "page" : undefined}
            className={styles.navLink} onClick={mobile ? () => setMobileMenuOpen(false) : undefined}>
            <OrganizationIcon name={item.id} /><span>{item.label}</span>
            {item.status === "planned" && <span className={styles.planned}>Soon</span>}
          </Link>
        ))}
      </nav>
    );
  }

  const identity = (
    <div className={styles.identity}>
      <span className={styles.avatar} aria-hidden="true">{presentationMode ? syntheticOrganizationData.initials : "EB"}</span>
      <div><p className={styles.name}>{organizationName}</p><p className={styles.caption}>{presentationMode ? syntheticOrganizationData.verificationLabel : "Organization portal"}</p></div>
    </div>
  );

  return (
    <div className={styles.shell}>
      <a href="#organization-content" className={styles.skip}>Skip to organization content</a>
      <div className={styles.frame}>
        <aside aria-label="Organization portal sidebar" className={styles.sidebar}>
          {identity}{navigation()}
          <div className={styles.note}><p className={styles.name}>Your next opportunity starts here.</p><p className={styles.caption}>Bring a focused challenge to emerging talent. Sample decisions stay in this session.</p></div>
        </aside>
        <div className={styles.content}>
          <header className={styles.header}>
            <div className="flex min-w-0 items-center gap-3">
              <OrganizationButton ref={trigger} className={styles.mobileToggle} aria-label="Open organization navigation" aria-expanded={mobileMenuOpen} aria-controls="organization-navigation-drawer" onClick={() => setMobileMenuOpen(true)}><OrganizationIcon name="menu" /></OrganizationButton>
              <div><p className={styles.eyebrow}>Organization workspace</p><p className={styles.heading}>{activeItem?.label ?? "Project workspace"}</p></div>
            </div>
            {presentationMode && <div className="flex items-center gap-3"><Link className={styles.navLink} href="/organization/notifications" aria-label={`Notifications: ${state.events.filter((event) => !event.read).length} unread`}><OrganizationIcon name="messages" /><span>{state.events.filter((event) => !event.read).length}</span></Link><span className={styles.previewTag}><OrganizationBadge>Synthetic preview</OrganizationBadge></span></div>}
          </header>
          <div id="organization-content" tabIndex={-1} className={styles.content}>{children}</div>
        </div>
      </div>
      <dialog ref={drawer} id="organization-navigation-drawer" aria-labelledby="organization-navigation-title" className={styles.dialog}
        onCancel={() => setMobileMenuOpen(false)}
        onClick={(event) => { if (event.target === event.currentTarget && event.clientX >= event.currentTarget.getBoundingClientRect().right) setMobileMenuOpen(false); }}>
        <div className={styles.drawerHeader}><h2 id="organization-navigation-title" className={styles.name}>Organization navigation</h2><OrganizationButton aria-label="Close organization navigation" onClick={() => setMobileMenuOpen(false)}><OrganizationIcon name="close" /></OrganizationButton></div>
        {identity}{navigation(true)}
      </dialog>
    </div>
  );
}
