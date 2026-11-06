import { Check, BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type Tone = "neutral" | "info" | "warning" | "brand" | "gold" | "success" | "danger" | "muted";

/** One mapping for every status in the database (TONIGHT-SPRINT §4). */
const STATUS: Record<string, { tone: Tone; label: string }> = {
  draft: { tone: "neutral", label: "Draft" },
  submitted: { tone: "info", label: "Submitted" },
  pending_review: { tone: "info", label: "Awaiting review" },
  proposed: { tone: "info", label: "Proposed" },
  pending: { tone: "info", label: "Awaiting approval" },
  under_review: { tone: "warning", label: "Under review" },
  shortlisted: { tone: "warning", label: "Shortlisted" },
  changes_requested: { tone: "warning", label: "Changes requested" },
  revision_requested: { tone: "warning", label: "Revision requested" },
  revisions_requested: { tone: "warning", label: "Revisions requested" },
  unable_to_assess: { tone: "warning", label: "Unable to assess" },
  open: { tone: "brand", label: "Open" },
  active: { tone: "brand", label: "Active" },
  approved: { tone: "brand", label: "Approved" },
  accepted: { tone: "brand", label: "Accepted" },
  reviewed: { tone: "brand", label: "Reviewed" },
  in_progress: { tone: "brand", label: "In progress" },
  verified: { tone: "gold", label: "Verified" },
  offered: { tone: "gold", label: "Offer received" },
  completed: { tone: "success", label: "Completed" },
  partially_completed: { tone: "success", label: "Partially completed" },
  ended: { tone: "muted", label: "Ended" },
  rejected: { tone: "danger", label: "Not accepted" },
  declined: { tone: "muted", label: "Declined" },
  withdrawn: { tone: "muted", label: "Withdrawn" },
  cancelled: { tone: "muted", label: "Cancelled" },
  expired: { tone: "muted", label: "Expired" },
  revoked: { tone: "muted", label: "Revoked" },
  suspended: { tone: "danger", label: "Suspended" },
};

const TONES: Record<Tone, string> = {
  neutral: "bg-ink-900/[0.06] text-ink-700 ring-ink-900/10",
  info: "bg-info-bg text-info-text ring-info/20",
  warning: "bg-warning-bg text-warning-text ring-warning/25",
  brand: "bg-brand-50 text-brand-700 ring-brand-600/20",
  gold: "bg-gold-50 text-gold-text ring-gold-500/30",
  success: "bg-success-bg text-success-text ring-success/25",
  danger: "bg-danger-bg text-danger-text ring-danger/20",
  muted: "bg-canvas text-ink-500 ring-line-strong",
};

export function statusLabel(status: string): string {
  return STATUS[status]?.label ?? status.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

export function StatusBadge({ status, label, className }: { status: string; label?: string; className?: string }) {
  const entry = STATUS[status] ?? { tone: "neutral" as Tone, label: statusLabel(status) };
  return (
    <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset", TONES[entry.tone], className)}>
      {entry.tone === "success" && <Check className="size-3" aria-hidden strokeWidth={3} />}
      {status === "verified" && <BadgeCheck className="size-3.5" aria-hidden />}
      {label ?? entry.label}
    </span>
  );
}

export function Pill({ children, tone = "neutral", className }: { children: React.ReactNode; tone?: Tone; className?: string }) {
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset", TONES[tone], className)}>{children}</span>;
}
