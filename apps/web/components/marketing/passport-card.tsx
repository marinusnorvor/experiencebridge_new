import { BadgeCheck } from "lucide-react";
import { GuillocheRosette, GuillocheWaves } from "./guilloche";
import { cn } from "@/lib/utils/cn";

/** Gold verification seal: a scalloped stamp with a check. */
export function VerifiedSeal({ className }: { className?: string }) {
  const teeth = 24;
  const points: string[] = [];
  for (let i = 0; i < teeth * 2; i++) {
    const a = (i * Math.PI) / teeth;
    const r = i % 2 === 0 ? 48 : 43;
    points.push(`${(50 + r * Math.cos(a)).toFixed(2)},${(50 + r * Math.sin(a)).toFixed(2)}`);
  }
  return (
    <svg viewBox="0 0 100 100" className={className} role="img" aria-label="Verified seal">
      <polygon points={points.join(" ")} fill="#F59E0B" />
      <circle cx="50" cy="50" r="37" fill="none" stroke="#FFFBEB" strokeWidth="1.2" strokeDasharray="2 2.4" />
      <circle cx="50" cy="50" r="31" fill="#D97706" />
      <path d="M37 51l9 9 17-19" fill="none" stroke="#FFFBEB" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * The product visual: an Experience Passport entry styled like a passport data page.
 * Labelled "Example" — it is never presented as a real person or outcome.
 */
export function PassportCard({ className }: { className?: string }) {
  return (
    <figure className={cn("relative w-full max-w-[440px] overflow-hidden rounded-[20px] border border-white/60 bg-[#FCFDFB] text-left shadow-[0_30px_60px_-20px_rgb(11_19_36/0.35),0_0_0_1px_rgb(11_19_36/0.04)]", className)}>
      {/* security print */}
      <GuillocheRosette className="pointer-events-none absolute -right-16 -top-16 size-72 text-brand-600/[0.13]" />
      <GuillocheWaves className="pointer-events-none absolute inset-x-0 bottom-0 h-28 w-full text-gold-500/[0.16]" />

      <div className="relative flex items-center justify-between bg-ink-900 px-5 py-3 text-white">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-brand-100/80">Experience Passport</p>
          <p className="text-[13px] font-semibold">ExperienceBridge</p>
        </div>
        <span className="rounded-full bg-white/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-white/85 ring-1 ring-white/20">Example</span>
      </div>

      <div className="relative px-5 pb-5 pt-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-500">Project</p>
            <p className="mt-0.5 text-[17px] font-semibold leading-snug text-ink-900">Clinic appointment reminders</p>
            <p className="mt-1 text-[13px] text-ink-500">For a community health lab · 6 weeks</p>
          </div>
          <VerifiedSeal className="size-16 shrink-0 -rotate-12 drop-shadow-[0_4px_8px_rgb(217_119_6/0.35)]" />
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-y border-dashed border-ink-900/15 py-3">
          <div><dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-500">Role</dt><dd className="text-[13px] font-medium text-ink-900">Front-end developer</dd></div>
          <div><dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-500">Outcome</dt><dd className="flex items-center gap-1 text-[13px] font-medium text-success-text"><BadgeCheck className="size-3.5" aria-hidden />Accepted</dd></div>
          <div><dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-500">Mentor score</dt><dd className="text-[13px] font-medium text-ink-900">4 / 5</dd></div>
          <div><dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-500">Issued</dt><dd className="font-mono text-[13px] text-ink-900">2026-11-06</dd></div>
        </dl>

        <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Skills demonstrated">
          {["React", "Accessibility", "Form design"].map((skill) => (
            <li key={skill} className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700 ring-1 ring-inset ring-brand-600/20">{skill}</li>
          ))}
        </ul>

        <blockquote className="mt-4 rounded-xl bg-gold-50/90 px-3.5 py-3 text-[13px] leading-relaxed text-ink-700 ring-1 ring-inset ring-gold-500/25">
          <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.16em] text-gold-text">Organisation review · Example</span>
          &ldquo;Clear structure and solid keyboard support. Delivered what we asked for.&rdquo;
        </blockquote>

        <p className="mt-4 truncate font-mono text-[10px] tracking-[0.12em] text-ink-400" aria-hidden>
          EB&lt;&lt;PASSPORT&lt;&lt;ENTRY&lt;&lt;EXAMPLE&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;
        </p>
      </div>
    </figure>
  );
}
