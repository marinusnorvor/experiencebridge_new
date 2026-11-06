import Link from "next/link";
import { ArrowRight, BadgeCheck, Building2, FileCheck2, GraduationCap, Landmark, MessageSquareText, Sparkles, UserRound } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { PassportCard, VerifiedSeal } from "@/components/marketing/passport-card";
import { GuillocheRosette } from "@/components/marketing/guilloche";
import { Tilt } from "@/components/marketing/tilt";
import { Reveal } from "@/components/marketing/reveal";
import { AudienceTabs } from "@/components/marketing/audience-tabs";
import { Faq } from "@/components/marketing/faq";
import { CtaBand, MarketingFooter, Section, SectionHeading } from "@/components/marketing/layout";

const STEPS = [
  { icon: Building2, title: "Organisations post real projects", body: "A short, scoped piece of real work with clear deliverables, milestones and terms. We check every organisation and project before it goes live." },
  { icon: GraduationCap, title: "Students deliver with a mentor", body: "Students apply, accept an offer and do the work. A mentor reviews each submission and the organisation gives its own decision." },
  { icon: BadgeCheck, title: "Every finished project becomes proof", body: "Completed work becomes a verified entry in the student's Experience Passport: what they delivered, the skills they showed and what reviewers said." },
];

const FAQ = [
  { q: "What does it cost?", a: "Joining is free. Organisations set their own terms for each project, including any payment. ExperienceBridge doesn't handle payments yet." },
  { q: "Who checks the organisations?", a: "The ExperienceBridge team reviews every organisation before it can publish a project, and reviews every project before students can see it." },
  { q: "What goes into an Experience Passport?", a: "Each finished project: the organisation, your role, the dates, what you delivered, the skills you showed, your mentor's review and the organisation's decision. Nothing is added unless it was reviewed." },
  { q: "Who can see my Passport?", a: "Your Passport is private to you for now. Shareable links you control are coming next." },
];

export default function HomePage() {
  return (
    <>
      <main>
        {/* Hero */}
        <section className="relative overflow-hidden px-4 pb-20 pt-14 sm:px-6 md:pb-28 md:pt-20">
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_75%_30%,rgb(20_184_166/0.14),transparent_70%),radial-gradient(40%_35%_at_90%_70%,rgb(245_158_11/0.12),transparent_70%)]" />
          <div className="mx-auto grid max-w-[1200px] items-center gap-14 lg:grid-cols-[1.15fr_1fr]">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-brand-600/20 bg-brand-50 px-3 py-1 text-[13px] font-medium text-brand-700">
                <Sparkles className="size-3.5" aria-hidden />Built in Ghana, for Africa
              </p>
              <h1 className="mt-6 text-[40px] font-semibold leading-[1.02] tracking-[-0.03em] text-ink-900 sm:text-[56px] lg:text-[72px]">
                Real work.<br />
                Verified{" "}
                <span className="relative inline-block">experience.
                  <svg aria-hidden viewBox="0 0 300 12" preserveAspectRatio="none" className="absolute -bottom-1 left-0 h-3 w-full text-gold-400"><path d="M2 9C60 3 160 2 298 6" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" /></svg>
                </span>
              </h1>
              <p className="mt-7 max-w-xl text-[18px] leading-relaxed text-ink-500 sm:text-[20px]">
                Organisations post short, real projects. Students deliver them with a mentor. Every finished project becomes verified proof in an Experience Passport.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link href="/sign-up?as=student" className={buttonVariants({ size: "lg" })}>Find a project <ArrowRight aria-hidden /></Link>
                <Link href="/sign-up?as=organization" className={buttonVariants({ size: "lg", variant: "secondary" })}>Post a project</Link>
              </div>
              <p className="mt-5 text-[13px] text-ink-500">Free to join · Organisations and projects are reviewed before they go live</p>
            </div>

            <div className="relative mx-auto w-full max-w-[440px] lg:ml-auto">
              <div aria-hidden className="absolute -inset-10 -z-10 rounded-full bg-brand-500/25 blur-[80px]" />
              <div aria-hidden className="absolute -bottom-6 -right-6 -z-10 size-48 rounded-full bg-gold-400/30 blur-[60px]" />
              <Tilt><PassportCard /></Tilt>
            </div>
          </div>
        </section>

        {/* Audience strip */}
        <div className="border-y border-line bg-surface px-4 py-6 sm:px-6">
          <ul className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-center gap-x-10 gap-y-3 text-[15px] font-medium text-ink-500">
            <li className="w-full text-center text-[13px] text-ink-500 sm:w-auto">Made for</li>
            {[{ i: UserRound, l: "Students" }, { i: Building2, l: "Organisations" }, { i: GraduationCap, l: "Mentors" }, { i: Landmark, l: "Universities" }].map(({ i: Icon, l }) => (
              <li key={l} className="flex items-center gap-2"><Icon className="size-4 text-brand-600" aria-hidden />{l}</li>
            ))}
          </ul>
        </div>

        {/* The experience trap */}
        <Section id="problem">
          <SectionHeading eyebrow="The experience trap" title="Skills without proof don't get hired." lede="Young people finish school with skills but no evidence of experience. Even entry-level jobs ask for it. What matters is what you've actually done, and who can vouch for it." />
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            <Reveal className="flex flex-col rounded-[20px] border border-line bg-surface p-7 shadow-card">
              <p className="text-[56px] font-semibold leading-none tracking-[-0.03em] text-ink-900">1 in 5</p>
              <p className="mt-4 text-[16px] text-ink-700">Ghanaians aged 15–35 is unemployed.</p>
              <p className="mt-auto pt-6 text-xs text-ink-500">Source: Ghana Statistical Service, 2025</p>
            </Reveal>
            <Reveal delay={0.06} className="flex flex-col rounded-[20px] border border-line bg-surface p-7 shadow-card">
              <p className="font-mono text-[56px] font-semibold leading-none tracking-[-0.04em] text-ink-900">r ≈ 0.06</p>
              <p className="mt-4 text-[16px] text-ink-700">Years of experience barely predict how well someone performs in a job.</p>
              <p className="mt-auto pt-6 text-xs text-ink-500">Source: Van Iddekinge et al., 2019</p>
            </Reveal>
            <Reveal delay={0.12} className="flex flex-col rounded-[20px] bg-ink-900 p-7 text-white">
              <p className="text-[24px] font-semibold leading-snug tracking-[-0.02em]">Entry-level roles still ask for 1–2 years of experience.</p>
              <p className="mt-auto pt-6 text-[15px] text-white/70">So we turn real work into evidence that employers can trust.</p>
            </Reveal>
          </div>
        </Section>

        {/* How it works */}
        <Section id="how-it-works" className="bg-surface">
          <SectionHeading eyebrow="How it works" title="From a real project to verified proof, in three steps." />
          <ol className="mt-14 grid gap-6 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <Reveal as="li" key={step.title} delay={i * 0.08} className="relative">
                <div className="flex items-center gap-3">
                  <span className="grid size-11 place-items-center rounded-full bg-ink-900 font-mono text-sm font-semibold text-white">{i + 1}</span>
                  {i < STEPS.length - 1 && <span aria-hidden className="hidden h-px flex-1 bg-[repeating-linear-gradient(90deg,var(--line-strong)_0_6px,transparent_6px_12px)] md:block" />}
                </div>
                <step.icon className="mt-6 size-6 text-brand-600" aria-hidden />
                <h3 className="mt-3 text-[20px] font-semibold tracking-[-0.01em] text-ink-900">{step.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-ink-500">{step.body}</p>
              </Reveal>
            ))}
          </ol>
          <Link href="/how-it-works" className="mt-12 inline-flex items-center gap-1.5 text-[15px] font-medium text-brand-700 hover:underline">See the full journey for each role <ArrowRight className="size-4" aria-hidden /></Link>
        </Section>

        {/* Audiences */}
        <Section id="for-you">
          <SectionHeading eyebrow="Who it's for" title="One bridge, four ways across." lede="Everyone on a project has a clear part to play, and everyone can see what happens next." />
          <AudienceTabs />
        </Section>

        {/* Passport bento */}
        <Section id="passport" className="bg-surface">
          <SectionHeading eyebrow="The Experience Passport" title="A record of what you've actually done." lede="Each entry is earned. Nothing appears unless an organisation accepted the work and a mentor reviewed it." />
          <div className="mt-12 grid auto-rows-[minmax(180px,auto)] gap-4 md:grid-cols-6">
            <Reveal className="relative overflow-hidden rounded-[24px] bg-ink-900 p-7 text-white md:col-span-4 md:row-span-2">
              <GuillocheRosette className="pointer-events-none absolute -bottom-24 -right-24 size-[420px] text-brand-500/25" />
              <VerifiedSeal className="relative size-14" />
              <h3 className="relative mt-6 max-w-md text-[28px] font-semibold leading-tight tracking-[-0.02em] text-white">Verified by the people who saw the work.</h3>
              <p className="relative mt-3 max-w-md text-[16px] leading-relaxed text-white/70">The organisation accepts the deliverable. An independent mentor scores it against the project&rsquo;s criteria. Both are recorded separately, so nothing is overstated.</p>
            </Reveal>
            <Reveal delay={0.05} className="rounded-[24px] border border-line bg-canvas p-6 md:col-span-2">
              <FileCheck2 className="size-6 text-brand-600" aria-hidden />
              <h3 className="mt-4 text-[17px] font-semibold text-ink-900">Real deliverables</h3>
              <p className="mt-1.5 text-[15px] text-ink-500">Links to what you actually built, written and shipped.</p>
            </Reveal>
            <Reveal delay={0.1} className="rounded-[24px] border border-line bg-canvas p-6 md:col-span-2">
              <MessageSquareText className="size-6 text-brand-600" aria-hidden />
              <h3 className="mt-4 text-[17px] font-semibold text-ink-900">Real feedback</h3>
              <p className="mt-1.5 text-[15px] text-ink-500">What your mentor and the organisation said, in their words.</p>
            </Reveal>
            <Reveal delay={0.05} className="rounded-[24px] border border-gold-500/25 bg-gold-50 p-6 md:col-span-3">
              <p className="font-mono text-xs uppercase tracking-[0.16em] text-gold-text">Skills shown</p>
              <ul className="mt-4 flex flex-wrap gap-2">
                {["Research", "React", "Data analysis", "Writing", "Accessibility", "Design"].map((s) => <li key={s} className="rounded-full bg-surface px-3 py-1 text-sm font-medium text-ink-700 ring-1 ring-inset ring-gold-500/30">{s}</li>)}
              </ul>
              <p className="mt-4 text-[15px] text-ink-700">Skills come from what reviewers saw, not from a self-reported list.</p>
            </Reveal>
            <Reveal delay={0.1} className="rounded-[24px] border border-line bg-canvas p-6 md:col-span-3">
              <p className="font-mono text-xs uppercase tracking-[0.16em] text-ink-500">Private by default</p>
              <p className="mt-4 text-[20px] font-semibold leading-snug tracking-[-0.01em] text-ink-900">Your Passport is yours. You decide who sees it.</p>
              <p className="mt-2 text-[15px] text-ink-500">Shareable links you control are coming next.</p>
            </Reveal>
          </div>
        </Section>

        {/* FAQ */}
        <Section id="faq" inner="grid gap-10 md:grid-cols-[1fr_1.4fr]">
          <SectionHeading eyebrow="Questions" title="Good to know." lede={<>More answers on <Link href="/how-it-works#faq" className="font-medium text-brand-700 hover:underline">how it works</Link>.</>} />
          <Faq items={FAQ} />
        </Section>

        <CtaBand />
      </main>
      <MarketingFooter />
    </>
  );
}
