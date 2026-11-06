"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, useReducedMotion } from "motion/react";
import { toast } from "sonner";
import { ArrowUpRight, BadgeCheck, Building2, CheckCircle2, Circle, ExternalLink, Lock, Printer, Quote, Search, Sparkles } from "lucide-react";
import { usePortalApi } from "@/lib/api/portal-api";
import { loadStudentPassportAndDecisions } from "@/features/student/lib/api-records";
import type { PassportProjectAssertion } from "@/features/student/lib/types";
import { GuillocheRosette, GuillocheWaves } from "@/components/marketing/guilloche";
import { Button } from "@/components/ui/button";
import { Card, EmptyState, PageSkeleton } from "@/components/ui/primitives";
import { Pill } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils/cn";

const LEVEL = { advanced: "Advanced", proficient: "Proficient", demonstrated: "Demonstrated" } as const;
const SEEN_KEY = "eb:passport:seen";

function formatDate(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function usePassport() {
  const { getApi, isSignedIn } = usePortalApi();
  return useQuery({
    queryKey: ["passport"],
    enabled: isSignedIn,
    queryFn: async () => {
      const api = await getApi();
      const [data, parts, profile] = await Promise.all([
        loadStudentPassportAndDecisions(api),
        api.getMyParticipations(),
        api.getStudentProfile().catch(() => ({ data: null })),
      ]);
      const status = new Map((parts.data ?? []).map((p) => [p.id, p.status]));
      return { ...data, status, profile: profile.data };
    },
  });
}

/** An entry is verified only when the organisation accepted the work AND finalised the participation. */
function isVerified(entry: PassportProjectAssertion, status?: string) {
  return entry.evidenceTiers.deliverableAccepted && (status === "completed" || status === "partially_completed");
}

export function ExperiencePassport() {
  const { data, isLoading, isError, refetch } = usePassport();
  const reduce = useReducedMotion();

  const verified = useMemo(() => (data ? data.passport.projectAssertions.filter((e) => isVerified(e, data.status.get(e.participationId))) : []), [data]);
  const inProgress = useMemo(() => (data ? data.passport.projectAssertions.filter((e) => !isVerified(e, data.status.get(e.participationId)) && !["withdrawn", "cancelled"].includes(data.status.get(e.participationId) ?? "")) : []), [data]);
  const skills = useMemo(() => {
    if (!data) return [];
    const verifiedTitles = new Set(verified.map((v) => v.projectTitle));
    const byName = new Map<string, { name: string; level: keyof typeof LEVEL; projects: Set<string> }>();
    const rank = { demonstrated: 1, proficient: 2, advanced: 3 } as const;
    for (const s of data.passport.assessedSkills.filter((s) => verifiedTitles.has(s.projectOrigin))) {
      const key = s.name.toLowerCase();
      const cur = byName.get(key) ?? { name: s.name, level: s.level, projects: new Set<string>() };
      if (rank[s.level] > rank[cur.level]) cur.level = s.level;
      cur.projects.add(s.projectOrigin);
      byName.set(key, cur);
    }
    return [...byName.values()];
  }, [data, verified]);

  // Celebrate an entry the student hasn't seen yet.
  useEffect(() => {
    if (!verified.length) return;
    try {
      const seen = new Set<string>(JSON.parse(window.localStorage.getItem(SEEN_KEY) ?? "[]"));
      const fresh = verified.filter((v) => !seen.has(v.id));
      if (fresh.length && seen.size > 0) toast.success(`New Passport entry: ${fresh[0].projectTitle}`, { icon: <BadgeCheck className="size-4 text-gold-500" /> });
      window.localStorage.setItem(SEEN_KEY, JSON.stringify(verified.map((v) => v.id)));
    } catch { /* private mode */ }
  }, [verified]);

  if (isLoading || !data) {
    if (isError) return <EmptyState icon={Lock} title="We couldn't load your Passport" description="Check your connection and try again." action={<Button onClick={() => void refetch()}>Try again</Button>} />;
    return <PageSkeleton />;
  }

  const holder = data.profile?.display_name || data.passport.student.displayName;
  const passportNo = `EB-${data.passport.student.id.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
  const firstIssued = verified.map((v) => v.organizationDecision?.decidedAt).filter(Boolean).sort()[0];

  return (
    <div className="space-y-10 print:space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[13px] font-medium text-brand-600">Student</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink-900 sm:text-[28px]">Experience Passport</h1>
          <p className="mt-1.5 flex items-center gap-1.5 text-[15px] text-ink-500"><Lock className="size-3.5" aria-hidden />Private to you. Sharing links are coming soon.</p>
        </div>
        <Button variant="secondary" onClick={() => window.print()} className="self-start print:hidden"><Printer aria-hidden />Print or save as PDF</Button>
      </div>

      {/* The document */}
      <motion.section initial={reduce ? false : { opacity: 0, y: 14, rotateX: 6 }} animate={{ opacity: 1, y: 0, rotateX: 0 }} transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
        aria-label="Passport summary" className="relative overflow-hidden rounded-[20px] bg-ink-900 text-white shadow-pop print:shadow-none">
        <GuillocheRosette className="pointer-events-none absolute -right-16 -top-16 size-80 text-brand-500/25 sm:size-[26rem]" />
        <GuillocheWaves className="pointer-events-none absolute inset-x-0 bottom-0 h-24 w-full text-gold-400/20" />
        <div className="absolute -left-20 top-10 size-72 rounded-full bg-brand-600/30 blur-[90px]" aria-hidden />
        <div className="relative grid gap-8 p-6 sm:p-9 md:grid-cols-[1fr_auto]">
          <div className="min-w-0">
            <p className="font-mono text-[11px] tracking-[0.25em] text-brand-100/70">EXPERIENCE · PASSPORT</p>
            <p className="mt-6 text-[11px] uppercase tracking-[0.16em] text-white/50">Holder</p>
            <h2 className="mt-1 truncate text-3xl font-semibold tracking-[-0.02em] text-white sm:text-[40px]">{holder}</h2>
            {(data.profile?.institution || data.profile?.program_of_study) && (
              <p className="mt-1 text-white/70">{[data.profile?.program_of_study, data.profile?.institution].filter(Boolean).join(" · ")}</p>
            )}
            <dl className="mt-8 grid grid-cols-3 gap-4 sm:max-w-md">
              {[["Verified projects", verified.length], ["Skills proven", skills.length], ["Reviews", verified.filter((v) => v.mentorReview).length + verified.filter((v) => v.organizationDecision).length]].map(([label, value]) => (
                <div key={label as string}>
                  <dt className="text-[11px] uppercase tracking-[0.12em] text-white/50">{label}</dt>
                  <dd className="mt-1 text-3xl font-semibold tabular-nums text-white">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="flex flex-row items-end justify-between gap-6 md:flex-col md:items-end">
            <div className="text-left md:text-right">
              <p className="text-[11px] uppercase tracking-[0.16em] text-white/50">Passport no.</p>
              <p className="font-mono text-sm tracking-wider text-white">{passportNo}</p>
              {firstIssued && <><p className="mt-3 text-[11px] uppercase tracking-[0.16em] text-white/50">First entry</p><p className="font-mono text-sm text-white">{formatDate(firstIssued)}</p></>}
            </div>
            <Seal earned={verified.length > 0} />
          </div>
        </div>
        <p aria-hidden className="relative truncate border-t border-white/10 px-6 py-2.5 font-mono text-[10px] tracking-[0.3em] text-white/30 sm:px-9">
          {`EB<PASSPORT<${holder.toUpperCase().replace(/[^A-Z]+/g, "<")}<<${passportNo}<<<<<<<<<<<<<<<<<<<<<<`}
        </p>
      </motion.section>

      {/* Entries */}
      {verified.length === 0 && inProgress.length === 0 ? (
        <EmptyState icon={Sparkles} title="Your Passport fills up as you finish projects"
          description="When an organisation accepts your work and a mentor reviews it, the project appears here as verified proof."
          action={<Button asChild><Link href="/student/applications"><Search aria-hidden />Find a project</Link></Button>} />
      ) : (
        <section aria-labelledby="verified-heading" className="space-y-4">
          <div className="flex items-baseline justify-between">
            <h2 id="verified-heading" className="text-lg font-semibold text-ink-900">Verified projects</h2>
            <p className="text-[13px] text-ink-500">{verified.length} {verified.length === 1 ? "entry" : "entries"}</p>
          </div>
          {verified.length === 0 && <p className="rounded-[var(--radius-card)] border border-dashed border-line-strong bg-surface p-5 text-sm text-ink-500">No verified entries yet. Your projects in progress will appear here once the organisation accepts and finalises your work.</p>}
          {verified.map((entry, i) => <Entry key={entry.id} entry={entry} index={i} skills={data.passport.assessedSkills.filter((s) => s.projectOrigin === entry.projectTitle)} />)}
        </section>
      )}

      {skills.length > 0 && (
        <section aria-labelledby="skills-heading">
          <h2 id="skills-heading" className="text-lg font-semibold text-ink-900">Skills proven in real work</h2>
          <p className="mt-1 text-sm text-ink-500">Each skill was scored by a mentor on a project the organisation accepted.</p>
          <ul className="mt-4 flex flex-wrap gap-2">
            {skills.map((s) => (
              <li key={s.name} className="inline-flex items-center gap-2 rounded-full border border-gold-500/30 bg-gold-50 py-1 pl-3 pr-1.5 text-sm">
                <BadgeCheck className="size-4 text-gold-500" aria-hidden />
                <span className="font-medium text-ink-900">{s.name}</span>
                <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-medium text-gold-text">{LEVEL[s.level]}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {inProgress.length > 0 && (
        <section aria-labelledby="progress-heading" className="space-y-3 print:hidden">
          <h2 id="progress-heading" className="text-lg font-semibold text-ink-900">In progress</h2>
          <p className="text-sm text-ink-500">Not verified yet. These move up when the organisation accepts your work and finalises the project.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {inProgress.map((e) => (
              <Card key={e.id} className="p-5">
                <p className="font-medium text-ink-900">{e.projectTitle}</p>
                <EvidenceChain entry={e} compact />
                <Link href={`/student/projects/${e.participationId}`} className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline">Open workspace<ArrowUpRight className="size-3.5" aria-hidden /></Link>
              </Card>
            ))}
          </div>
        </section>
      )}

      {data.passport.selfReportedSkills.length > 0 && (
        <section aria-labelledby="self-heading" className="print:hidden">
          <h2 id="self-heading" className="text-lg font-semibold text-ink-900">Skills you&rsquo;ve listed</h2>
          <p className="mt-1 text-sm text-ink-500">Self-reported on your profile, not yet proven on a project. <Link href="/student/profile" className="font-medium text-brand-600 hover:underline">Edit</Link></p>
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {data.passport.selfReportedSkills.map((s) => <li key={s.id}><Pill>{s.name}</Pill></li>)}
          </ul>
        </section>
      )}
    </div>
  );
}

function Seal({ earned }: { earned: boolean }) {
  const reduce = useReducedMotion();
  return (
    <motion.div initial={reduce ? false : { scale: 0.6, rotate: -25, opacity: 0 }} animate={{ scale: 1, rotate: -8, opacity: 1 }} transition={{ delay: 0.35, type: "spring", stiffness: 220, damping: 14 }}
      className={cn("relative grid size-24 shrink-0 place-items-center rounded-full sm:size-28", earned ? "text-gold-400" : "text-white/25")}>
      <svg viewBox="0 0 100 100" className="absolute inset-0" aria-hidden>
        <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 3" />
        <circle cx="50" cy="50" r="38" fill="none" stroke="currentColor" strokeWidth="1" />
        <path id="seal-arc" d="M50 50 m-30 0 a30 30 0 1 1 60 0 a30 30 0 1 1 -60 0" fill="none" />
        <text fontSize="7.5" letterSpacing="2.4" fill="currentColor" fontFamily="var(--font-geist-mono)"><textPath href="#seal-arc">VERIFIED · REAL WORK · VERIFIED · REAL WORK ·</textPath></text>
      </svg>
      <BadgeCheck className="size-9" aria-hidden />
      <span className="sr-only">{earned ? "Has verified entries" : "No verified entries yet"}</span>
    </motion.div>
  );
}

function EvidenceChain({ entry, compact }: { entry: PassportProjectAssertion; compact?: boolean }) {
  const steps = [
    { label: "Work submitted", done: entry.evidenceTiers.workSubmitted },
    { label: "Mentor reviewed", done: entry.evidenceTiers.mentorReviewed },
    { label: "Accepted by organisation", done: entry.evidenceTiers.deliverableAccepted },
  ];
  return (
    <ol className={cn("flex flex-wrap gap-x-4 gap-y-1.5", compact ? "mt-2" : "mt-4")} aria-label="Evidence">
      {steps.map((s) => (
        <li key={s.label} className={cn("flex items-center gap-1.5 text-[13px]", s.done ? "text-ink-700" : "text-ink-400")}>
          {s.done ? <CheckCircle2 className="size-4 text-success" aria-hidden /> : <Circle className="size-4" aria-hidden />}
          {s.label}<span className="sr-only">{s.done ? " (done)" : " (not yet)"}</span>
        </li>
      ))}
    </ol>
  );
}

function Entry({ entry, index, skills }: { entry: PassportProjectAssertion; index: number; skills: { name: string; level: keyof typeof LEVEL }[] }) {
  const reduce = useReducedMotion();
  return (
    <motion.article initial={reduce ? false : { opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-40px" }} transition={{ duration: 0.3, delay: index * 0.05 }}
      className="relative overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface shadow-card print:break-inside-avoid">
      <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-gold-400 to-gold-500" />
      <div className="p-5 sm:p-7">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-ink-900">{entry.projectTitle}</h3>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-500">
              <span className="inline-flex items-center gap-1"><Building2 className="size-3.5" aria-hidden />{entry.organizationName}</span>
              <span aria-hidden>·</span><span>{entry.timeframe}</span>
            </p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-full bg-gold-50 px-3 py-1 text-[13px] font-semibold text-gold-text ring-1 ring-inset ring-gold-500/30">
            <BadgeCheck className="size-4 text-gold-500" aria-hidden />Verified
          </span>
        </div>
        <EvidenceChain entry={entry} />

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-500">What they did</h4>
            <p className="mt-2 text-sm leading-relaxed text-ink-700">{entry.contributionStatement}</p>
            {entry.deliverables.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {entry.deliverables.map((d) => <li key={d} className="flex gap-2 text-sm text-ink-700"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-brand-600" aria-hidden />{d}</li>)}
              </ul>
            )}
            {skills.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {skills.map((s) => <Pill key={s.name} tone="gold">{s.name} · {LEVEL[s.level]}</Pill>)}
              </div>
            )}
          </div>
          <div className="space-y-4">
            {entry.mentorReview?.feedbackExcerpt && (
              <figure className="rounded-xl bg-canvas p-4">
                <Quote className="size-4 text-brand-600" aria-hidden />
                <blockquote className="mt-2 text-sm leading-relaxed text-ink-800">{entry.mentorReview.feedbackExcerpt}</blockquote>
                <figcaption className="mt-2 text-xs text-ink-500">Mentor review · {formatDate(entry.mentorReview.reviewedAt)}</figcaption>
              </figure>
            )}
            {entry.organizationDecision?.formalStatement && (
              <figure className="rounded-xl border border-gold-500/25 bg-gold-50/60 p-4">
                <Quote className="size-4 text-gold-500" aria-hidden />
                <blockquote className="mt-2 text-sm leading-relaxed text-ink-800">{entry.organizationDecision.formalStatement}</blockquote>
                <figcaption className="mt-2 text-xs text-ink-500">Accepted by the organisation · {formatDate(entry.organizationDecision.decidedAt)}</figcaption>
              </figure>
            )}
          </div>
        </div>

        {entry.evidenceLinks.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-2 border-t border-line pt-4">
            {entry.evidenceLinks.map((l) => (
              <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-[13px] text-ink-700 hover:border-brand-600 hover:text-brand-700">
                <ExternalLink className="size-3.5" aria-hidden />{l.label}
              </a>
            ))}
          </div>
        )}
      </div>
    </motion.article>
  );
}
