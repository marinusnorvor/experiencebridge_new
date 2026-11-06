import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Building2, GraduationCap, UserRound, type LucideIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Reveal } from "@/components/marketing/reveal";
import { Faq } from "@/components/marketing/faq";
import { CtaBand, MarketingFooter, Section, SectionHeading } from "@/components/marketing/layout";

export const metadata: Metadata = {
  title: "How it works",
  description: "How students, organisations and mentors work together on ExperienceBridge, step by step.",
};

type Journey = { id: string; icon: LucideIcon; label: string; title: string; steps: { title: string; body: string }[]; cta: { label: string; href: string } };

const JOURNEYS: Journey[] = [
  {
    id: "students", icon: UserRound, label: "For students", title: "Turn real projects into a Passport employers can trust.",
    steps: [
      { title: "Create your profile", body: "Tell us where you study, what you're learning and the skills you want to use." },
      { title: "Find a project", body: "Browse open projects from verified organisations. Each one shows the scope, milestones, time needed and terms." },
      { title: "Apply", body: "Say why you're a good fit and how much time you have. You can follow every step: submitted, under review, shortlisted, offer." },
      { title: "Accept an offer", body: "Read the terms and accept before the offer expires. Your project workspace opens straight away." },
      { title: "Do the work", body: "Work through the milestones and submit your deliverables with links. Your mentor reviews it, then the organisation. If they ask for changes, you revise and resubmit." },
      { title: "Earn your Passport entry", body: "When the organisation finalises your project, it becomes a verified entry in your Experience Passport." },
    ],
    cta: { label: "Find a project", href: "/sign-up?as=student" },
  },
  {
    id: "organisations", icon: Building2, label: "For organisations", title: "Get real work done and see talent in action.",
    steps: [
      { title: "Set up your organisation", body: "Add your organisation's name and what you do, then submit it for verification. We usually review within 48 hours." },
      { title: "Draft a project", body: "Describe the work, what's in and out of scope, milestones and acceptance criteria, capacity and dates. You can draft while you wait to be verified." },
      { title: "Set your terms", body: "Compensation, who owns the work, confidentiality and how mentoring will work. Students see these before they apply." },
      { title: "Submit for review", body: "Our team checks the project. Once approved it opens to students." },
      { title: "Choose your participants", body: "Review applications, shortlist, and make offers. When a student accepts, they join your project." },
      { title: "Review and finalise", body: "Assign a mentor, review each submission after the mentor does, and finalise the project. That writes the result to the student's Passport." },
    ],
    cta: { label: "Post a project", href: "/sign-up?as=organization" },
  },
  {
    id: "mentors", icon: GraduationCap, label: "For mentors", title: "Guide students with structured, lightweight reviews.",
    steps: [
      { title: "Create a mentor profile", body: "Share your expertise, the skills you can assess and how much time you have each week." },
      { title: "Get approved", body: "Our team reviews your profile. Once approved, organisations can invite you to their projects." },
      { title: "Accept invitations", body: "See the project and the student before you accept, and declare any conflict of interest." },
      { title: "Review submissions", body: "Score the work against the project's criteria, write feedback for the student, and either mark it reviewed or ask for a revision." },
    ],
    cta: { label: "Become a mentor", href: "/sign-up?as=mentor" },
  },
];

const FAQ = [
  { q: "What does it cost?", a: "Joining is free for everyone. Organisations set their own terms; ExperienceBridge doesn't handle payments yet." },
  { q: "Who verifies organisations and projects?", a: "The ExperienceBridge team reviews each organisation before it can publish, and each project before students can see it. If something needs changing, we say what and why." },
  { q: "Are projects paid?", a: "Each project shows its compensation terms before you apply. We only list paid work or properly reviewed learning projects." },
  { q: "What's in a Passport entry?", a: "The project, the organisation, your role, the dates, your deliverables, the skills you showed, your mentor's review and the organisation's decision." },
  { q: "Is my Passport private?", a: "Your Passport is private to you for now. Shareable links that you control are coming next." },
  { q: "Can I be a student and a mentor, or run an organisation too?", a: "Yes. One account can have several workspaces. Switch between them from the menu in the top corner." },
  { q: "What if the organisation asks for changes to my work?", a: "You'll see their feedback in your project workspace. Revise and resubmit; nothing goes in your Passport until it's accepted." },
];

export default function HowItWorksPage() {
  return (
    <>
      <main>
        <section className="px-4 pb-10 pt-16 sm:px-6 md:pt-24">
          <div className="mx-auto max-w-[1200px]">
            <p className="text-[13px] font-semibold text-brand-600">How it works</p>
            <h1 className="mt-4 max-w-3xl text-[40px] font-semibold leading-[1.04] tracking-[-0.03em] text-ink-900 sm:text-[56px]">Everyone knows what happens next.</h1>
            <p className="mt-6 max-w-2xl text-[18px] leading-relaxed text-ink-500">Students, organisations and mentors each have a clear path. Every handoff shows up for the person who needs to act.</p>
            <nav aria-label="Jump to a journey" className="mt-8 flex flex-wrap gap-2">
              {JOURNEYS.map((j) => (
                <a key={j.id} href={`#${j.id}`} className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-surface px-4 text-sm font-medium text-ink-700 hover:border-ink-900">
                  <j.icon className="size-4 text-brand-600" aria-hidden />{j.label}
                </a>
              ))}
              <a href="#faq" className="inline-flex h-10 items-center rounded-full px-4 text-sm font-medium text-ink-500 hover:text-ink-900">Questions</a>
            </nav>
          </div>
        </section>

        {JOURNEYS.map((journey, index) => (
          <Section key={journey.id} id={journey.id} className={index % 2 === 0 ? "bg-surface" : undefined} inner="grid gap-12 lg:grid-cols-[1fr_1.3fr]">
            <div className="lg:sticky lg:top-24 lg:self-start">
              <span className="grid size-12 place-items-center rounded-2xl bg-ink-900 text-white"><journey.icon className="size-5" aria-hidden /></span>
              <p className="mt-6 text-[13px] font-semibold text-brand-600">{journey.label}</p>
              <h2 className="mt-2 text-[30px] font-semibold leading-[1.1] tracking-[-0.02em] text-ink-900 sm:text-[40px]">{journey.title}</h2>
              <Link href={journey.cta.href} className={`${buttonVariants({ size: "lg" })} mt-8`}>{journey.cta.label} <ArrowRight aria-hidden /></Link>
            </div>
            <ol className="relative space-y-3">
              {journey.steps.map((step, i) => (
                <Reveal as="li" key={step.title} delay={i * 0.04} className="flex gap-4 rounded-[18px] border border-line bg-surface p-5 shadow-card">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-50 font-mono text-[13px] font-semibold text-brand-700 ring-1 ring-inset ring-brand-600/20">{i + 1}</span>
                  <div>
                    <h3 className="text-[17px] font-semibold text-ink-900">{step.title}</h3>
                    <p className="mt-1 text-[15px] leading-relaxed text-ink-500">{step.body}</p>
                  </div>
                </Reveal>
              ))}
            </ol>
          </Section>
        ))}

        <Section id="faq" inner="grid gap-10 md:grid-cols-[1fr_1.4fr]">
          <SectionHeading eyebrow="Questions" title="Frequently asked." />
          <Faq items={FAQ} />
        </Section>

        <CtaBand />
      </main>
      <MarketingFooter />
    </>
  );
}
