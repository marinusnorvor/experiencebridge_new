"use client";

import { useState, type ReactNode } from "react";
import { Dialog as D } from "radix-ui";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

export function Dialog({ open, onOpenChange, title, description, children, footer, className }: {
  open: boolean; onOpenChange: (open: boolean) => void; title: ReactNode; description?: ReactNode; children?: ReactNode; footer?: ReactNode; className?: string;
}) {
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-50 bg-ink-900/40 backdrop-blur-[2px] data-[state=open]:animate-[rise_0.2s_ease-out]" />
        <D.Content className={cn("fixed inset-x-3 bottom-3 z-50 max-h-[85dvh] overflow-y-auto rounded-2xl border border-line bg-surface p-6 shadow-pop outline-none data-[state=open]:animate-rise sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-full sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2", className)}>
          <D.Title className="pr-8 text-lg font-semibold text-ink-900">{title}</D.Title>
          {description ? <D.Description className="mt-1.5 text-sm text-ink-500">{description}</D.Description> : <D.Description className="sr-only">{typeof title === "string" ? title : "Dialog"}</D.Description>}
          {children && <div className="mt-5">{children}</div>}
          {footer && <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">{footer}</div>}
          <D.Close aria-label="Close" className="absolute right-4 top-4 grid size-8 place-items-center rounded-full text-ink-500 hover:bg-canvas hover:text-ink-900"><X className="size-4" /></D.Close>
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}

/** Confirm an irreversible action and say what it does. */
export function ConfirmDialog({ trigger, title, consequence, confirmLabel, onConfirm, danger }: {
  trigger: (open: () => void) => ReactNode; title: string; consequence: ReactNode; confirmLabel: string; onConfirm: () => Promise<unknown> | void; danger?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <>
      {trigger(() => setOpen(true))}
      <Dialog open={open} onOpenChange={(next) => !busy && setOpen(next)} title={title} description={consequence}
        footer={<>
          <Button variant="secondary" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
          <Button variant={danger ? "danger" : "primary"} loading={busy} onClick={async () => { setBusy(true); try { await onConfirm(); setOpen(false); } finally { setBusy(false); } }}>{confirmLabel}</Button>
        </>} />
    </>
  );
}
