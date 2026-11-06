"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { BadgeCheck } from "lucide-react";
import { Logo } from "@/components/app/logo";

const STATEMENTS = [
  "Real projects from real organisations.",
  "Feedback from people who do the work.",
  "Proof you can show any employer.",
];

/** Two-pane auth layout: form on the left, brand panel on the right (single column on phones). */
export function AuthShell({ title, subtitle, children, footer }: { title: ReactNode; subtitle?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % STATEMENTS.length), 3800);
    return () => window.clearInterval(timer);
  }, []);
  return (
    <div className="grid min-h-dvh bg-surface lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <div className="flex flex-col px-5 py-6 sm:px-10 lg:px-16">
        <Link href="/" aria-label="ExperienceBridge home" className="self-start"><Logo /></Link>
        <div className="mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-center py-10">
          <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.02em] sm:text-[32px]">{title}</h1>
          {subtitle && <p className="mt-2 text-[15px] text-ink-500">{subtitle}</p>}
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-8 text-sm text-ink-500">{footer}</div>}
        </div>
        <p className="text-xs text-ink-400">© JAMS 2026 · Built in Ghana</p>
      </div>

      <aside aria-hidden className="relative hidden overflow-hidden bg-ink-900 lg:block">
        {/* guilloche security pattern, the same motif as the Passport */}
        <svg className="absolute inset-0 size-full opacity-[0.16]" viewBox="0 0 600 800" preserveAspectRatio="xMidYMid slice">
          {Array.from({ length: 26 }).map((_, i) => (
            <ellipse key={i} cx="300" cy="400" rx={120 + i * 14} ry={60 + i * 22} fill="none" stroke={i % 3 === 0 ? "#F59E0B" : "#2DD4BF"} strokeWidth="0.6" transform={`rotate(${i * 7} 300 400)`} />
          ))}
        </svg>
        <div className="absolute -right-24 top-1/4 size-96 rounded-full bg-brand-600/40 blur-[120px]" />
        <div className="absolute -bottom-20 left-10 size-72 rounded-full bg-gold-400/20 blur-[100px]" />
        <div className="relative flex h-full flex-col justify-between p-14 text-white">
          <p className="font-mono text-xs tracking-[0.2em] text-brand-100/70">EXPERIENCE · PASSPORT</p>
          <div>
            <p className="text-[44px] font-semibold leading-[1.05] tracking-[-0.025em]">Real work.<br /><span className="text-gold-400">Verified</span> experience.</p>
            <p key={index} className="mt-5 h-7 animate-rise text-lg text-white/75">{STATEMENTS[index]}</p>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur">
            <span className="grid size-10 place-items-center rounded-full bg-gold-400/15 text-gold-400"><BadgeCheck className="size-5" /></span>
            <p className="text-sm text-white/80">Every finished project is reviewed by a mentor and accepted by the organisation before it reaches your Passport.</p>
          </div>
        </div>
      </aside>
    </div>
  );
}
