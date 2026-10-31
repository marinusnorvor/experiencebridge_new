import type { ComponentPropsWithRef, HTMLAttributes } from "react";

export function OrganizationButton({ className = "", type = "button", ...props }: ComponentPropsWithRef<"button">) {
  return <button type={type} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none ${className}`} {...props} />;
}

export function OrganizationCard({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6 ${className}`} {...props} />;
}

export function OrganizationBadge({ className = "", ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={`inline-flex items-center rounded-md border border-teal-200 bg-teal-50 px-2 py-1 text-xs font-semibold text-teal-900 ${className}`} {...props} />;
}

const paths: Record<string, string> = {
  arrow: "M5 12h14 M13 6l6 6-6 6",
  calendar: "M4 5h16v16H4z M4 10h16 M8 3v4 M16 3v4 M8 14h3 M8 17h7",
  alert: "M12 3 2 21h20L12 3z M12 9v5 M12 17h.01",
  check: "M5 12l4 4L19 6",
  invitations: "M3 5h18v14H3z M3 5l9 7 9-7",
  dashboard: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
  projects: "M3 7h18v13H3z M8 7V4h8v3 M3 12h18 M10 12v3h4v-3",
  "create-project": "M12 5v14 M5 12h14",
  applications: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M17 4a4 4 0 0 1 0 7 M22 21v-2a4 4 0 0 0-3-4",
  reviews: "M9 3H5v18h14V3h-4 M9 2h6v4H9z M8 13l3 3 5-6",
  messages: "M21 3H3v14h5v4l5-4h8z M7 8h10 M7 12h6",
  settings: "M4 7h16 M4 17h16 M8 4v6 M16 14v6",
  close: "M6 6l12 12 M6 18L18 6",
  menu: "M4 6h16 M4 12h16 M4 18h16",
};

export function OrganizationIcon({ name }: { name: string }) {
  return <svg aria-hidden="true" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d={paths[name] ?? paths.projects} /></svg>;
}
