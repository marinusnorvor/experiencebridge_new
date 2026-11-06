"use client";

import { forwardRef, useId, useState, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export const inputClass =
  "block h-11 w-full rounded-[var(--radius-control)] border border-line-strong bg-surface px-3.5 text-[16px] text-ink-900 shadow-[0_1px_0_rgb(11_19_36/0.02)] transition placeholder:text-ink-400 hover:border-ink-400 focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-100 aria-[invalid=true]:border-danger aria-[invalid=true]:focus:ring-danger-bg disabled:bg-canvas";

type FieldProps = { label: ReactNode; hint?: ReactNode; error?: string; optional?: boolean; children: (props: { id: string; "aria-invalid": boolean; "aria-describedby"?: string }) => ReactNode; className?: string };

/** Label + control + hint/error, wired for screen readers. */
export function Field({ label, hint, error, optional, children, className }: FieldProps) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={id} className="flex items-baseline justify-between text-sm font-medium text-ink-900">
        <span>{label}</span>{optional && <span className="text-xs font-normal text-ink-500">Optional</span>}
      </label>
      {children({ id, "aria-invalid": !!error, "aria-describedby": describedBy })}
      {error ? <p id={`${id}-error`} role="alert" className="text-[13px] text-danger-text">{error}</p>
        : hint ? <p id={`${id}-hint`} className="text-[13px] text-ink-500">{hint}</p> : null}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cn(inputClass, className)} {...props} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cn(inputClass, "h-auto min-h-24 py-2.5 leading-relaxed", className)} {...props} />;
});

export const PasswordInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function PasswordInput({ className, ...props }, ref) {
  const [shown, setShown] = useState(false);
  return (
    <div className="relative">
      <input ref={ref} type={shown ? "text" : "password"} className={cn(inputClass, "pr-11", className)} {...props} />
      <button type="button" onClick={() => setShown((s) => !s)} aria-label={shown ? "Hide password" : "Show password"} aria-pressed={shown}
        className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-[var(--radius-control)] text-ink-500 hover:text-ink-900">
        {shown ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
      </button>
    </div>
  );
});
