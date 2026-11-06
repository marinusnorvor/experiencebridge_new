import { cn } from "@/lib/utils/cn";

/** Wordmark: a bridge arc meeting a gold seal. */
export function Logo({ className, inverted }: { className?: string; inverted?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <svg viewBox="0 0 28 28" className="size-7" aria-hidden>
        <rect width="28" height="28" rx="8" fill={inverted ? "#fff" : "#0B1324"} />
        <path d="M6 19c2.2-6 5-9 8-9s5.8 3 8 9" fill="none" stroke={inverted ? "#0F766E" : "#2DD4BF"} strokeWidth="2.4" strokeLinecap="round" />
        <path d="M9 19v-2.5M14 19v-5M19 19v-2.5" stroke={inverted ? "#0F766E" : "#2DD4BF"} strokeWidth="1.6" strokeLinecap="round" opacity=".55" />
        <circle cx="21.5" cy="7.5" r="3" fill="#F59E0B" />
      </svg>
      <span className={cn("text-[15px] font-semibold tracking-tight", inverted ? "text-white" : "text-ink-900")}>ExperienceBridge</span>
    </span>
  );
}
