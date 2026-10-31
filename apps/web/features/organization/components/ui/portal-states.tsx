"use client";
import { Button, portalStyles as s } from "./portal-ui";
export function PortalLoading() {
  return <main className={s.page} aria-busy="true" aria-label="Loading organization workspace"><p role="status" className={s.muted}>Loading your workspace…</p><div className={s.skeleton} /><div className={s.grid}><div className={s.skeleton} /><div className={s.skeleton} /></div></main>;
}
export function PortalError({ reset }: { reset: () => void }) {
  return <main className={s.page}><section className={s.empty}><h1>This workspace couldn’t load</h1><p>Your current session may still be available. Try loading this screen again.</p><Button primary onClick={reset}>Try again</Button></section></main>;
}
