import type { ComponentType, HTMLAttributes, ReactNode } from "react";
import { ArrowRight, Clock } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-[var(--radius-card)] border border-line bg-surface shadow-card", className)} {...props} />;
}

export function CardHeader({ title, description, action, className }: { title: ReactNode; description?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-start justify-between gap-4 border-b border-line px-5 py-4", className)}>
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold text-ink-900">{title}</h2>
        {description && <p className="mt-0.5 text-[13px] text-ink-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function PageHeader({ eyebrow, title, description, actions, className }: { eyebrow?: ReactNode; title: ReactNode; description?: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <header className={cn("flex flex-col gap-4 pb-6 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0">
        {eyebrow && <p className="mb-1.5 text-[13px] font-medium text-brand-600">{eyebrow}</p>}
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900 sm:text-[28px]">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-[15px] text-ink-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function EmptyState({ icon: Icon, title, description, action, className }: { icon: ComponentType<{ className?: string }>; title: ReactNode; description?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center rounded-[var(--radius-card)] border border-dashed border-line-strong bg-surface px-6 py-12 text-center", className)}>
      <span className="grid size-11 place-items-center rounded-full bg-brand-50 text-brand-600"><Icon className="size-5" /></span>
      <p className="mt-4 text-[15px] font-semibold text-ink-900">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-ink-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-md bg-ink-900/[0.07]", className)} />;
}

export function PageSkeleton() {
  return (
    <div role="status" aria-label="Loading" className="space-y-6">
      <Skeleton className="h-8 w-56" />
      <div className="grid gap-4 sm:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-24" />)}</div>
      <Skeleton className="h-64" />
    </div>
  );
}

/** "Waiting on: Admin review · usually within 24h" */
export function NextStepHint({ waitingOn, detail, action, tone = "brand" }: { waitingOn: ReactNode; detail?: ReactNode; action?: ReactNode; tone?: "brand" | "gold" | "warning" }) {
  const tones = { brand: "border-brand-600/20 bg-brand-50", gold: "border-gold-500/30 bg-gold-50", warning: "border-warning/30 bg-warning-bg" };
  return (
    <div className={cn("flex flex-col gap-3 rounded-[var(--radius-card)] border px-4 py-3 sm:flex-row sm:items-center sm:justify-between", tones[tone])}>
      <p className="flex items-start gap-2 text-sm text-ink-700">
        <Clock className="mt-0.5 size-4 shrink-0 text-brand-600" aria-hidden />
        <span><span className="font-semibold text-ink-900">Waiting on: {waitingOn}</span>{detail && <> · {detail}</>}</span>
      </p>
      {action}
    </div>
  );
}

export function StatCard({ label, value, hint, href }: { label: string; value: ReactNode; hint?: ReactNode; href?: string }) {
  const body = (
    <>
      <p className="text-[13px] text-ink-500">{label}</p>
      <p className="mt-1 text-[28px] font-semibold tabular-nums tracking-tight text-ink-900">{value}</p>
      {hint && <p className="mt-1 flex items-center gap-1 text-[13px] text-brand-600">{hint}{href && <ArrowRight className="size-3.5" aria-hidden />}</p>}
    </>
  );
  const cls = "block rounded-[var(--radius-card)] border border-line bg-surface p-5 shadow-card";
  return href ? <a href={href} className={cn(cls, "transition hover:-translate-y-0.5 hover:border-brand-600/40")}>{body}</a> : <div className={cls}>{body}</div>;
}

export type TimelineStep = { label: string; state: "done" | "current" | "upcoming" | "stopped"; detail?: ReactNode };

/** Horizontal on wide screens, vertical on phones. */
export function StatusTimeline({ steps, className }: { steps: TimelineStep[]; className?: string }) {
  return (
    <ol className={cn("flex flex-col gap-3 sm:flex-row sm:gap-0", className)}>
      {steps.map((step, index) => (
        <li key={step.label} className="relative flex items-start gap-3 sm:flex-1 sm:flex-col sm:gap-2">
          {index < steps.length - 1 && <span aria-hidden className={cn("absolute left-[11px] top-6 h-[calc(100%-4px)] w-0.5 sm:left-6 sm:top-[11px] sm:h-0.5 sm:w-[calc(100%-24px)]", step.state === "done" ? "bg-brand-600" : "bg-line-strong")} />}
          <span aria-hidden className={cn("relative z-10 grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold ring-4 ring-surface",
            step.state === "done" && "bg-brand-600 text-white",
            step.state === "current" && "bg-surface text-brand-700 ring-brand-100 outline-2 outline-brand-600",
            step.state === "upcoming" && "bg-canvas text-ink-400 outline-1 outline-line-strong",
            step.state === "stopped" && "bg-danger-bg text-danger-text outline-1 outline-danger/40")}>
            {step.state === "done" ? "✓" : step.state === "stopped" ? "×" : index + 1}
          </span>
          <span className="min-w-0 pr-3">
            <span className={cn("block text-[13px] font-medium", step.state === "upcoming" ? "text-ink-500" : "text-ink-900")}>{step.label}</span>
            {step.detail && <span className="block text-xs text-ink-500">{step.detail}</span>}
            <span className="sr-only">{step.state === "done" ? "(done)" : step.state === "current" ? "(current step)" : step.state === "stopped" ? "(stopped)" : "(not yet)"}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}
