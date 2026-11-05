"use client";
import Link from "next/link";
import { useAuth } from "@/components/layouts/auth-provider";
import { portalLinks } from "@/lib/portal-routes";
import { isPortalPresentationMode } from "@/lib/auth/portal-presentation";

export function SiteHeader() {
  const { state, logout } = useAuth();
  return <header className="border-b border-slate-200 bg-white"><div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
    <Link href="/" className="font-semibold">ExperienceBridge</Link>
    <nav aria-label="Primary portal navigation" className="flex flex-wrap gap-4 text-sm">{portalLinks.map(portal => <Link key={portal.href} href={portal.href}>{portal.label}</Link>)}</nav>
    {!isPortalPresentationMode() && <div className="flex gap-3 text-sm">{state === "authenticated" ? <button onClick={() => void logout()}>Sign out</button> : <><Link href="/sign-in">Sign in</Link><Link href="/sign-up">Create account</Link></>}</div>}
  </div></header>;
}
