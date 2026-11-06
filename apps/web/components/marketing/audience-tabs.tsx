"use client";

import Link from "next/link";
import { Tabs as T } from "radix-ui";
import { ArrowRight, Building2, Check, GraduationCap, Landmark, UserRound } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

const AUDIENCES = [
  {
    id: "students", label: "Students", icon: UserRound,
    title: "Proof you can show, not just tell.",
    points: ["Real projects from real organisations, sized to fit around your studies", "Feedback from a mentor and the organisation on every piece of work", "A private Experience Passport that grows with every finished project"],
    cta: { label: "Find a project", href: "/sign-up?as=student" },
  },
  {
    id: "organisations", label: "Organisations", icon: Building2,
    title: "Get real work done and meet talent in action.",
    points: ["Post a short, scoped project with your own terms", "Review applicants, make offers and follow progress in one place", "See how someone works before you ever hire"],
    cta: { label: "Post a project", href: "/sign-up?as=organization" },
  },
  {
    id: "mentors", label: "Mentors", icon: GraduationCap,
    title: "Shape the next generation in a few hours a week.",
    points: ["Choose the projects you guide", "Give structured, lightweight reviews against clear criteria", "Your feedback becomes part of a student's verified record"],
    cta: { label: "Become a mentor", href: "/sign-up?as=mentor" },
  },
  {
    id: "universities", label: "Universities", icon: Landmark,
    title: "Measurable employability for your students.",
    points: ["Give students real project experience before they graduate", "Evidence of what they delivered, reviewed by professionals", "Partnerships for career services are coming next"],
    cta: { label: "Learn how it works", href: "/how-it-works" },
  },
];

export function AudienceTabs() {
  return (
    <T.Root defaultValue="students" className="mt-12">
      <T.List aria-label="Who ExperienceBridge is for" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {AUDIENCES.map(({ id, label, icon: Icon }) => (
          <T.Trigger key={id} value={id} className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-line bg-surface px-4 text-sm font-medium text-ink-700 transition hover:border-line-strong data-[state=active]:border-ink-900 data-[state=active]:bg-ink-900 data-[state=active]:text-white">
            <Icon className="size-4" aria-hidden />{label}
          </T.Trigger>
        ))}
      </T.List>
      {AUDIENCES.map((a) => (
        <T.Content key={a.id} value={a.id} className="mt-6 grid gap-8 rounded-[24px] border border-line bg-surface p-6 shadow-card outline-none data-[state=active]:animate-rise sm:p-10 md:grid-cols-[1fr_1.1fr]">
          <div>
            <h3 className="text-[26px] font-semibold leading-tight tracking-[-0.02em] text-ink-900 sm:text-[32px]">{a.title}</h3>
            <Link href={a.cta.href} className={cn(buttonVariants({ size: "lg" }), "mt-8")}>{a.cta.label} <ArrowRight aria-hidden /></Link>
          </div>
          <ul className="space-y-4">
            {a.points.map((p) => (
              <li key={p} className="flex gap-3 text-[16px] leading-relaxed text-ink-700">
                <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-600"><Check className="size-3.5" strokeWidth={3} aria-hidden /></span>{p}
              </li>
            ))}
          </ul>
        </T.Content>
      ))}
    </T.Root>
  );
}
