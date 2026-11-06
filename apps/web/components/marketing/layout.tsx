import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { Logo } from "@/components/app/logo";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

export function Section({ id, children, className, inner }: { id?: string; children: ReactNode; className?: string; inner?: string }) {
  return (
    <section id={id} className={cn("scroll-mt-20 px-4 py-20 sm:px-6 md:py-28 lg:py-32", className)}>
      <div className={cn("mx-auto max-w-[1200px]", inner)}>{children}</div>
    </section>
  );
}

export function SectionHeading({ eyebrow, title, lede, center, dark }: { eyebrow?: string; title: ReactNode; lede?: ReactNode; center?: boolean; dark?: boolean }) {
  return (
    <div className={cn("max-w-2xl", center && "mx-auto text-center")}>
      {eyebrow && <p className={cn("text-[13px] font-semibold", dark ? "text-brand-100" : "text-brand-600")}>{eyebrow}</p>}
      <h2 className={cn("mt-3 text-[32px] font-semibold leading-[1.08] tracking-[-0.02em] sm:text-[44px]", dark ? "text-white" : "text-ink-900")}>{title}</h2>
      {lede && <p className={cn("mt-4 text-[17px] leading-relaxed", dark ? "text-white/70" : "text-ink-500")}>{lede}</p>}
    </div>
  );
}

export function CtaBand({ title = "Your next project is proof.", lede = "Join as a student, post a project as an organisation, or guide the next generation as a mentor." }: { title?: string; lede?: string }) {
  return (
    <section className="px-4 pb-20 sm:px-6 md:pb-28">
      <div className="relative mx-auto max-w-[1200px] overflow-hidden rounded-[28px] bg-ink-900 px-6 py-16 text-center sm:px-12 md:py-20">
        <div aria-hidden className="pointer-events-none absolute -left-24 -top-24 size-80 rounded-full bg-brand-600/40 blur-[100px]" />
        <div aria-hidden className="pointer-events-none absolute -bottom-28 -right-16 size-80 rounded-full bg-gold-400/25 blur-[100px]" />
        <h2 className="relative mx-auto max-w-2xl text-[32px] font-semibold leading-[1.08] tracking-[-0.02em] text-white sm:text-[48px]">{title}</h2>
        <p className="relative mx-auto mt-4 max-w-xl text-[17px] text-white/70">{lede}</p>
        <div className="relative mt-9 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/sign-up?as=student" className={cn(buttonVariants({ size: "lg" }), "bg-white text-ink-900 hover:bg-brand-50")}>Find a project <ArrowRight aria-hidden /></Link>
          <Link href="/sign-up?as=organization" className={cn(buttonVariants({ size: "lg", variant: "secondary" }), "border-white/25 bg-white/5 text-white hover:border-white/50 hover:bg-white/10")}>Post a project</Link>
        </div>
      </div>
    </section>
  );
}

export function MarketingFooter() {
  const columns = [
    { title: "Product", links: [{ label: "How it works", href: "/how-it-works" }, { label: "For students", href: "/how-it-works#students" }, { label: "For organisations", href: "/how-it-works#organisations" }, { label: "For mentors", href: "/how-it-works#mentors" }] },
    { title: "JAMS", links: [{ label: "About us", href: "/about" }, { label: "Our values", href: "/about#values" }, { label: "Questions", href: "/how-it-works#faq" }] },
    { title: "Account", links: [{ label: "Create an account", href: "/sign-up" }, { label: "Sign in", href: "/sign-in" }] },
  ];
  return (
    <footer className="border-t border-line bg-surface px-4 py-14 sm:px-6">
      <div className="mx-auto grid max-w-[1200px] gap-10 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm text-ink-500">Real work. Verified experience. Built in Ghana, for Africa.</p>
        </div>
        {columns.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <p className="text-[13px] font-semibold text-ink-900">{col.title}</p>
            <ul className="mt-3 space-y-2">
              {col.links.map((link) => <li key={link.label}><Link href={link.href} className="text-sm text-ink-500 hover:text-brand-700">{link.label}</Link></li>)}
            </ul>
          </nav>
        ))}
      </div>
      <div className="mx-auto mt-12 flex max-w-[1200px] flex-col gap-2 border-t border-line pt-6 text-[13px] text-ink-500 sm:flex-row sm:justify-between">
        <p>© JAMS 2026 · Built for the XANIX Challenge</p>
        <p>Privacy policy and terms: coming soon</p>
      </div>
    </footer>
  );
}
