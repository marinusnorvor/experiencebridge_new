"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { toast } from "sonner";
import { ArrowLeft, BadgeCheck, Building2, Clock, GraduationCap, PartyPopper, UserRound } from "lucide-react";
import { useAuth } from "@/components/layouts/auth-provider";
import { usePortalApi } from "@/lib/api/portal-api";
import { Logo } from "@/components/app/logo";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { PageSkeleton } from "@/components/ui/primitives";
import { cn } from "@/lib/utils/cn";
import { TagInput } from "./tag-input";

type Path = "student" | "organization" | "mentor";

const SKILL_SUGGESTIONS = ["Writing", "Research", "Data analysis", "Excel", "Python", "JavaScript", "React", "UI design", "Marketing", "Social media", "Customer support", "Accounting"];
const INTEREST_SUGGESTIONS = ["Health", "Education", "Agriculture", "Finance", "Climate", "Media", "Public sector", "Tech startups"];
const MENTOR_SKILL_SUGGESTIONS = ["Software engineering", "Product design", "Data science", "Marketing", "Finance", "Project management", "Research", "Writing"];

function useDraft<T extends object>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === "undefined") return initial;
    try { const saved = window.localStorage.getItem(key); return saved ? { ...initial, ...JSON.parse(saved) } : initial; } catch { return initial; }
  });
  useEffect(() => { try { window.localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode */ } }, [key, value]);
  const clear = () => { try { window.localStorage.removeItem(key); } catch { /* ignore */ } };
  return [value, (patch: Partial<T>) => setValue((v) => ({ ...v, ...patch })), clear] as const;
}

function Frame({ step, total, title, subtitle, children, onBack }: { step: number; total: number; title: ReactNode; subtitle?: ReactNode; children: ReactNode; onBack?: () => void }) {
  const reduce = useReducedMotion();
  return (
    <div className="min-h-dvh bg-canvas">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4 sm:px-6">
          <Link href="/" aria-label="ExperienceBridge home"><Logo /></Link>
          <span className="text-[13px] text-ink-500">Step {step} of {total}</span>
        </div>
        <div className="h-1 bg-line" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={step} aria-label="Setup progress">
          <div className="h-full bg-brand-600 transition-[width] duration-300" style={{ width: `${(step / total) * 100}%` }} />
        </div>
      </header>
      <main className="mx-auto max-w-xl px-4 py-10 sm:px-6 sm:py-14">
        {onBack && <button type="button" onClick={onBack} className="mb-6 inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink-900"><ArrowLeft className="size-3.5" aria-hidden />Back</button>}
        <motion.div key={step} initial={reduce ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, ease: "easeOut" }}>
          <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.02em]">{title}</h1>
          {subtitle && <p className="mt-2 text-[15px] text-ink-500">{subtitle}</p>}
          <div className="mt-8 rounded-[var(--radius-card)] border border-line bg-surface p-5 shadow-card sm:p-7">{children}</div>
        </motion.div>
      </main>
    </div>
  );
}

function Celebrate({ title, body, cta, href, tone = "brand" }: { title: string; body: ReactNode; cta: string; href: string; tone?: "brand" | "gold" }) {
  const reduce = useReducedMotion();
  return (
    <div className="grid min-h-dvh place-items-center bg-canvas px-4">
      <div className="max-w-md text-center">
        <motion.span initial={reduce ? false : { scale: 0.4, rotate: -20, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} transition={{ type: "spring", stiffness: 260, damping: 16 }}
          className={cn("mx-auto grid size-20 place-items-center rounded-full", tone === "gold" ? "bg-gold-50 text-gold-500 ring-8 ring-gold-100" : "bg-brand-50 text-brand-600 ring-8 ring-brand-100")}>
          {tone === "gold" ? <BadgeCheck className="size-9" /> : <PartyPopper className="size-9" />}
        </motion.span>
        <h1 className="mt-8 text-[28px] font-semibold tracking-[-0.02em]">{title}</h1>
        <p className="mt-2 text-[15px] text-ink-500">{body}</p>
        <Button asChild size="lg" className="mt-8"><a href={href}>{cta}</a></Button>
      </div>
    </div>
  );
}

export function OnboardingWizard() {
  const params = useSearchParams();
  const router = useRouter();
  const { state } = useAuth();
  const requested = (["student", "organization", "mentor"] as const).find((p) => p === params.get("path"));
  const [path, setPath] = useState<Path | null>(requested ?? null);

  useEffect(() => {
    if (state === "unauthenticated" || state === "expired") router.replace(`/sign-in?next=${encodeURIComponent(`/onboarding${path ? `?path=${path}` : ""}`)}`);
  }, [state, router, path]);

  if (state !== "authenticated") return <div className="mx-auto max-w-xl px-4 py-16"><PageSkeleton /></div>;
  if (!path) return <ChoosePath onChoose={setPath} />;
  if (path === "organization") return <OrganizationOnboarding />;
  if (path === "mentor") return <MentorOnboarding />;
  return <StudentOnboarding />;
}

function ChoosePath({ onChoose }: { onChoose: (p: Path) => void }) {
  const options = [
    { value: "student" as const, icon: UserRound, title: "Find projects", body: "Build your profile and apply to real work." },
    { value: "organization" as const, icon: Building2, title: "Post projects", body: "Set up your organisation." },
    { value: "mentor" as const, icon: GraduationCap, title: "Mentor students", body: "Share your expertise and review work." },
  ];
  return (
    <Frame step={1} total={1} title="What would you like to do first?" subtitle="You can add the others any time from your account menu.">
      <div className="space-y-3">
        {options.map(({ value, icon: Icon, title, body }) => (
          <button key={value} type="button" onClick={() => onChoose(value)} className="flex w-full items-center gap-4 rounded-2xl border border-line-strong p-4 text-left transition hover:border-brand-600 hover:bg-brand-50">
            <span className="grid size-11 place-items-center rounded-xl bg-canvas text-ink-700"><Icon className="size-5" aria-hidden /></span>
            <span><span className="block text-[15px] font-semibold text-ink-900">{title}</span><span className="block text-sm text-ink-500">{body}</span></span>
          </button>
        ))}
      </div>
    </Frame>
  );
}

/* ---------------------------------- Student ---------------------------------- */

function StudentOnboarding() {
  const { user } = useAuth();
  const { getApi } = usePortalApi();
  const year = new Date().getFullYear();
  const [draft, patch, clear] = useDraft("eb:onboarding:student", {
    display_name: user?.display_name ?? "", headline: "", institution: "", program_of_study: "", graduation_year: year,
    skills: [] as string[], interests: [] as string[], weekly_hours_available: 10, bio: "", portfolio_url: "", github_url: "", linkedin_url: "",
  });
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [touched, setTouched] = useState(false);

  const completeness = useMemo(() => {
    const checks = [draft.display_name, draft.headline, draft.institution, draft.program_of_study, draft.skills.length, draft.interests.length, draft.bio, draft.portfolio_url || draft.github_url || draft.linkedin_url];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [draft]);

  const urlError = (v: string) => (v && !/^https?:\/\/\S+\.\S+/.test(v.trim()) ? "Start the link with https://" : undefined);
  const step1Errors = { display_name: !draft.display_name.trim() ? "Enter your name." : undefined, institution: !draft.institution.trim() ? "Enter your school or university." : undefined };

  async function save() {
    if (urlError(draft.portfolio_url) || urlError(draft.github_url) || urlError(draft.linkedin_url)) { setTouched(true); return; }
    setBusy(true); setError("");
    try {
      const api = await getApi();
      const current = await api.getStudentProfile();
      const existing = current.data;
      const result = await api.upsertStudentProfile({
        display_name: draft.display_name.trim(), headline: draft.headline.trim(), bio: draft.bio.trim(), institution: draft.institution.trim(),
        program_of_study: draft.program_of_study.trim(), graduation_year: Number(draft.graduation_year), weekly_hours_available: Math.min(80, Math.max(1, Number(draft.weekly_hours_available) || 10)),
        preferred_domains: draft.interests, portfolio_url: draft.portfolio_url.trim() || null, github_url: draft.github_url.trim() || null, linkedin_url: draft.linkedin_url.trim() || null,
        self_reported_skills: draft.skills.map((name, i) => ({ id: `skill-${i}-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`.slice(0, 80), name, category: "General", proficiency: "intermediate" as const })),
        top_projects: existing?.top_projects ?? [],
      }, existing?.row_version);
      if (!result.data) throw new Error(result.error ?? "save failed");
      clear();
      toast.success("Profile saved");
      setDone(true);
    } catch {
      setError("We couldn't save your profile. Check your connection and try again.");
    } finally { setBusy(false); }
  }

  if (done) return <Celebrate title="You're all set" body="Your profile is ready. Next, find a project that fits your skills and apply." cta="Find projects" href="/student/applications" />;

  const meter = (
    <div className="mb-6 flex items-center gap-3">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-line"><div className="h-full rounded-full bg-gradient-to-r from-brand-600 to-brand-500 transition-[width] duration-500" style={{ width: `${completeness}%` }} /></div>
      <span className="text-[13px] font-medium tabular-nums text-ink-700">Profile {completeness}% complete</span>
    </div>
  );

  if (step === 1) return (
    <Frame step={1} total={3} title="Tell us about yourself" subtitle="Organisations see this when you apply.">
      {meter}
      <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); setTouched(true); if (!step1Errors.display_name && !step1Errors.institution) { setTouched(false); setStep(2); } }}>
        <Field label="Full name" error={touched ? step1Errors.display_name : undefined}>{(a) => <Input {...a} value={draft.display_name} maxLength={160} autoComplete="name" onChange={(e) => patch({ display_name: e.target.value })} />}</Field>
        <Field label="One-line headline" optional hint="For example: Final-year Computer Science student who loves data">{(a) => <Input {...a} value={draft.headline} maxLength={240} onChange={(e) => patch({ headline: e.target.value })} />}</Field>
        <Field label="School or university" error={touched ? step1Errors.institution : undefined}>{(a) => <Input {...a} value={draft.institution} maxLength={200} autoComplete="organization" onChange={(e) => patch({ institution: e.target.value })} />}</Field>
        <div className="grid gap-5 sm:grid-cols-[1fr_9rem]">
          <Field label="Programme" optional>{(a) => <Input {...a} value={draft.program_of_study} maxLength={200} onChange={(e) => patch({ program_of_study: e.target.value })} />}</Field>
          <Field label="Graduation year">{(a) => (
            <select {...a} value={draft.graduation_year} onChange={(e) => patch({ graduation_year: Number(e.target.value) })} className="h-11 w-full rounded-[var(--radius-control)] border border-line-strong bg-surface px-3 text-[16px]">
              {Array.from({ length: 12 }, (_, i) => year - 5 + i).map((y) => <option key={y} value={y}>{y}</option>)}
            </select>)}</Field>
        </div>
        <Button type="submit" size="lg" className="w-full">Continue</Button>
      </form>
    </Frame>
  );

  if (step === 2) return (
    <Frame step={2} total={3} title="What can you do?" subtitle="Add skills you can show in a real project. You'll prove them by doing the work." onBack={() => setStep(1)}>
      {meter}
      <div className="space-y-6">
        <Field label="Skills" hint="Type a skill and press Enter.">{(a) => <TagInput {...a} value={draft.skills} onChange={(skills) => patch({ skills })} suggestions={SKILL_SUGGESTIONS} placeholder="e.g. Excel" max={50} />}</Field>
        <Field label="Interests" optional hint="The kinds of organisations you'd like to work with.">{(a) => <TagInput {...a} value={draft.interests} onChange={(interests) => patch({ interests })} suggestions={INTEREST_SUGGESTIONS} placeholder="e.g. Health" />}</Field>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          <Button variant="ghost" onClick={() => setStep(3)}>Skip for now</Button>
          <Button size="lg" onClick={() => setStep(3)}>Continue</Button>
        </div>
      </div>
    </Frame>
  );

  return (
    <Frame step={3} total={3} title="Last bit: availability and links" subtitle="All optional. You can change these later in your profile." onBack={() => setStep(2)}>
      {meter}
      <div className="space-y-5">
        <Field label="Hours per week you can give a project">{(a) => <Input {...a} type="number" inputMode="numeric" min={1} max={80} value={draft.weekly_hours_available} onChange={(e) => patch({ weekly_hours_available: Number(e.target.value) })} />}</Field>
        <Field label="Short bio" optional>{(a) => <Textarea {...a} rows={3} maxLength={2000} value={draft.bio} onChange={(e) => patch({ bio: e.target.value })} />}</Field>
        <Field label="LinkedIn" optional error={touched ? urlError(draft.linkedin_url) : undefined}>{(a) => <Input {...a} type="url" inputMode="url" placeholder="https://linkedin.com/in/…" value={draft.linkedin_url} onChange={(e) => patch({ linkedin_url: e.target.value })} />}</Field>
        <Field label="GitHub" optional error={touched ? urlError(draft.github_url) : undefined}>{(a) => <Input {...a} type="url" inputMode="url" placeholder="https://github.com/…" value={draft.github_url} onChange={(e) => patch({ github_url: e.target.value })} />}</Field>
        <Field label="Portfolio" optional error={touched ? urlError(draft.portfolio_url) : undefined}>{(a) => <Input {...a} type="url" inputMode="url" placeholder="https://…" value={draft.portfolio_url} onChange={(e) => patch({ portfolio_url: e.target.value })} />}</Field>
        {error && <p role="alert" className="rounded-xl bg-danger-bg p-3 text-sm text-danger-text">{error}</p>}
        <Button size="lg" className="w-full" loading={busy} onClick={save}>Finish setup</Button>
      </div>
    </Frame>
  );
}

/* -------------------------------- Organisation -------------------------------- */

function OrganizationOnboarding() {
  const { refresh } = useAuth();
  const { getApi } = usePortalApi();
  const [draft, patch, clear] = useDraft("eb:onboarding:organization", { display_name: "", description: "" });
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [touched, setTouched] = useState(false);
  const [org, setOrg] = useState<{ id: string; row_version: number; display_name: string } | null>(null);
  const [finished, setFinished] = useState<"submitted" | "later" | null>(null);

  const errors = {
    display_name: draft.display_name.trim().length < 2 ? "Enter your organisation's name." : undefined,
    description: draft.description.trim().length < 10 ? "Describe your organisation in at least 10 characters." : undefined,
  };

  async function create() {
    setTouched(true);
    if (errors.display_name || errors.description) return;
    setBusy(true); setError("");
    try {
      const api = await getApi();
      const result = await api.createOrganization({ display_name: draft.display_name.trim(), description: draft.description.trim() });
      if (!result.data) throw new Error(result.error ?? "create failed");
      setOrg(result.data);
      clear();
      await refresh();
      toast.success("Organisation created");
      setStep(2);
    } catch { setError("We couldn't create your organisation. Check your connection and try again."); }
    finally { setBusy(false); }
  }

  async function submitVerification() {
    if (!org) return;
    setBusy(true); setError("");
    try {
      const api = await getApi();
      const result = await api.submitOrganizationVerification(org.id, org.row_version);
      if (!result.data) throw new Error(result.error ?? "submit failed");
      toast.success("Sent for verification");
      setFinished("submitted");
    } catch { setError("We couldn't send it for verification. You can do it later from Settings."); }
    finally { setBusy(false); }
  }

  if (finished) return (
    <Celebrate title={finished === "submitted" ? "Sent for verification" : "Your organisation is ready"}
      body={finished === "submitted" ? "We'll review it, usually within 48 hours. Meanwhile you can start drafting your first project." : "Draft your first project now. You'll need to be verified before it can go live."}
      cta="Go to my organisation" href="/organization/dashboard" />
  );

  if (step === 1) return (
    <Frame step={1} total={2} title="Set up your organisation" subtitle="Students see this on every project you post.">
      <div className="space-y-5">
        <Field label="Organisation name" error={touched ? errors.display_name : undefined}>{(a) => <Input {...a} value={draft.display_name} maxLength={160} autoComplete="organization" onChange={(e) => patch({ display_name: e.target.value })} />}</Field>
        <Field label="What does your organisation do?" error={touched ? errors.description : undefined} hint="A few sentences: your sector, where you're based, and the kind of projects you'd like help with.">
          {(a) => <Textarea {...a} rows={5} maxLength={5000} value={draft.description} onChange={(e) => patch({ description: e.target.value })} />}
        </Field>
        {error && <p role="alert" className="rounded-xl bg-danger-bg p-3 text-sm text-danger-text">{error}</p>}
        <Button size="lg" className="w-full" loading={busy} onClick={create}>Create organisation</Button>
      </div>
    </Frame>
  );

  return (
    <Frame step={2} total={2} title="Get verified" subtitle="Verification keeps students safe. Only verified organisations can publish projects.">
      <ul className="space-y-3 text-sm text-ink-700">
        <li className="flex gap-3"><BadgeCheck className="size-5 shrink-0 text-gold-500" aria-hidden />An ExperienceBridge admin checks your organisation details.</li>
        <li className="flex gap-3"><Clock className="size-5 shrink-0 text-brand-600" aria-hidden />It usually takes up to 48 hours. You can draft projects while you wait.</li>
      </ul>
      {error && <p role="alert" className="mt-5 rounded-xl bg-danger-bg p-3 text-sm text-danger-text">{error}</p>}
      <div className="mt-7 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
        <Button variant="ghost" onClick={() => setFinished("later")}>Do this later</Button>
        <Button size="lg" loading={busy} onClick={submitVerification}>Submit for verification</Button>
      </div>
    </Frame>
  );
}

/* ----------------------------------- Mentor ----------------------------------- */

function MentorOnboarding() {
  const { refresh } = useAuth();
  const { getApi } = usePortalApi();
  const [draft, patch, clear] = useDraft("eb:onboarding:mentor", { bio: "", skills: [] as string[], availability_text: "", weekly_review_capacity: 3, directory_opt_in: true });
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [touched, setTouched] = useState(false);
  const [done, setDone] = useState(false);

  const errors = {
    bio: draft.bio.trim().length < 10 ? "Tell us about your experience in at least 10 characters." : undefined,
    skills: draft.skills.length === 0 ? "Add at least one area you can review." : undefined,
    availability_text: draft.availability_text.trim().length < 2 ? "Tell students when you're usually available." : undefined,
  };

  async function save() {
    setTouched(true);
    if (errors.availability_text) return;
    setBusy(true); setError("");
    try {
      const api = await getApi();
      const existing = await api.getMentorProfile();
      const result = await api.upsertMentorProfile({ bio: draft.bio.trim(), skills: draft.skills, availability_text: draft.availability_text.trim(), weekly_review_capacity: draft.weekly_review_capacity, directory_opt_in: draft.directory_opt_in }, existing.data?.row_version);
      if (!result.data) throw new Error(result.error ?? "save failed");
      clear();
      await refresh();
      toast.success("Mentor profile sent for approval");
      setDone(true);
    } catch { setError("We couldn't save your mentor profile. Check your connection and try again."); }
    finally { setBusy(false); }
  }

  if (done) return <Celebrate tone="gold" title="Thanks for offering to mentor" body="We'll review your profile, usually within 48 hours. Once approved, organisations can invite you to guide a student." cta="Go to my mentor home" href="/mentor/dashboard" />;

  if (step === 1) return (
    <Frame step={1} total={2} title="Your experience" subtitle="Organisations and students see this when you're invited to a project.">
      <div className="space-y-5">
        <Field label="About you" error={touched ? errors.bio : undefined} hint="Your role, years of experience and industries.">{(a) => <Textarea {...a} rows={5} maxLength={2000} value={draft.bio} onChange={(e) => patch({ bio: e.target.value })} />}</Field>
        <Field label="Areas you can review" error={touched ? errors.skills : undefined}>{(a) => <TagInput {...a} value={draft.skills} onChange={(skills) => patch({ skills })} suggestions={MENTOR_SKILL_SUGGESTIONS} placeholder="e.g. Data science" />}</Field>
        <Button size="lg" className="w-full" onClick={() => { setTouched(true); if (!errors.bio && !errors.skills) { setTouched(false); setStep(2); } }}>Continue</Button>
      </div>
    </Frame>
  );

  return (
    <Frame step={2} total={2} title="Your availability" subtitle="Reviews are short and structured. Pick what you can comfortably give." onBack={() => setStep(1)}>
      <div className="space-y-5">
        <Field label="When are you usually available?" error={touched ? errors.availability_text : undefined} hint="For example: Weekday evenings, about 2 hours a week">{(a) => <Input {...a} maxLength={200} value={draft.availability_text} onChange={(e) => patch({ availability_text: e.target.value })} />}</Field>
        <Field label="Reviews you can take on each week">{(a) => (
          <select {...a} value={draft.weekly_review_capacity} onChange={(e) => patch({ weekly_review_capacity: Number(e.target.value) })} className="h-11 w-full rounded-[var(--radius-control)] border border-line-strong bg-surface px-3 text-[16px]">
            {[1, 2, 3, 4, 5, 6, 8, 10].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>)}</Field>
        <label className="flex items-start gap-3 rounded-xl border border-line p-4 text-sm text-ink-700">
          <input type="checkbox" checked={draft.directory_opt_in} onChange={(e) => patch({ directory_opt_in: e.target.checked })} className="mt-0.5 size-4 accent-brand-600" />
          <span><span className="block font-medium text-ink-900">List me in the mentor directory</span>Verified organisations can find and invite you.</span>
        </label>
        {error && <p role="alert" className="rounded-xl bg-danger-bg p-3 text-sm text-danger-text">{error}</p>}
        <Button size="lg" className="w-full" loading={busy} onClick={save}>Send for approval</Button>
      </div>
    </Frame>
  );
}
