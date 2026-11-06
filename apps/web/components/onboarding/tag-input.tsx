"use client";

import { useState, type KeyboardEvent } from "react";
import { Plus, X } from "lucide-react";
import { inputClass } from "@/components/ui/field";
import { cn } from "@/lib/utils/cn";

/** Type and press Enter (or comma) to add; suggestions are one tap. */
export function TagInput({ id, value, onChange, suggestions = [], placeholder, max = 20, ...aria }: {
  id?: string; value: string[]; onChange: (next: string[]) => void; suggestions?: string[]; placeholder?: string; max?: number;
  "aria-invalid"?: boolean; "aria-describedby"?: string;
}) {
  const [draft, setDraft] = useState("");
  const add = (raw: string) => {
    const tag = raw.trim().replace(/,$/, "").slice(0, 80);
    if (!tag || value.length >= max || value.some((v) => v.toLowerCase() === tag.toLowerCase())) return;
    onChange([...value, tag]);
    setDraft("");
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(draft); }
    if (e.key === "Backspace" && !draft && value.length) onChange(value.slice(0, -1));
  };
  const remaining = suggestions.filter((s) => !value.some((v) => v.toLowerCase() === s.toLowerCase()));
  return (
    <div>
      <div className={cn(inputClass, "flex h-auto min-h-11 flex-wrap items-center gap-1.5 py-1.5")}>
        {value.map((tag) => (
          <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-brand-50 py-0.5 pl-2.5 pr-1 text-sm font-medium text-brand-700 ring-1 ring-inset ring-brand-600/20">
            {tag}
            <button type="button" onClick={() => onChange(value.filter((v) => v !== tag))} aria-label={`Remove ${tag}`} className="grid size-5 place-items-center rounded-full hover:bg-brand-100"><X className="size-3" /></button>
          </span>
        ))}
        <input id={id} {...aria} value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={onKey} onBlur={() => add(draft)}
          placeholder={value.length ? "" : placeholder} className="min-w-[8rem] flex-1 bg-transparent py-1 text-[16px] outline-none placeholder:text-ink-400" />
      </div>
      {remaining.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {remaining.slice(0, 10).map((s) => (
            <button key={s} type="button" onClick={() => add(s)} className="inline-flex items-center gap-1 rounded-full border border-dashed border-line-strong px-2.5 py-1 text-[13px] text-ink-700 hover:border-brand-600 hover:text-brand-700">
              <Plus className="size-3" aria-hidden />{s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
