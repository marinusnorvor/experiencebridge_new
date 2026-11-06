import Link from "next/link";
import { Building2, GraduationCap, Lock, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Portal } from "./portal-nav";

/** Shown when a signed-in user opens a workspace they don't have yet. Always offers a way forward. */
export function NoAccess({ portal }: { portal: Portal }) {
  const copy = {
    organization: { icon: Building2, title: "You don't have an organisation workspace yet", body: "Set up your organisation to post projects and review applicants. It takes about two minutes.", cta: { href: "/onboarding?path=organization", label: "Set up an organisation" } },
    mentor: { icon: GraduationCap, title: "You're not a mentor yet", body: "Tell us about your experience. Once approved, organisations can invite you to guide students.", cta: { href: "/onboarding?path=mentor", label: "Become a mentor" } },
    student: { icon: Lock, title: "This page isn't available", body: "Your account can't open this page.", cta: { href: "/app", label: "Go to my home" } },
    admin: { icon: Lock, title: "This page isn't available", body: "Your account can't open this page.", cta: { href: "/app", label: "Go to my home" } },
  }[portal];
  const Icon = copy.icon;
  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-16 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-brand-50 text-brand-600"><Icon className="size-6" aria-hidden /></span>
      <h1 className="mt-6 text-2xl font-semibold tracking-tight text-ink-900">{copy.title}</h1>
      <p className="mt-2 text-[15px] text-ink-500">{copy.body}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button asChild><Link href={copy.cta.href}>{copy.cta.label}</Link></Button>
        <Button asChild variant="secondary"><Link href="/app">Go to my home</Link></Button>
      </div>
    </div>
  );
}

export function ServiceUnavailable({ onRetry }: { onRetry: () => void }) {
  return (
    <div role="alert" className="mx-auto flex max-w-md flex-col items-center py-24 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-warning-bg text-warning-text"><RefreshCw className="size-6" aria-hidden /></span>
      <h1 className="mt-6 text-2xl font-semibold tracking-tight text-ink-900">We can&rsquo;t reach ExperienceBridge right now</h1>
      <p className="mt-2 text-[15px] text-ink-500">Check your connection and try again. Your work is saved.</p>
      <Button className="mt-8" onClick={onRetry}>Try again</Button>
    </div>
  );
}
