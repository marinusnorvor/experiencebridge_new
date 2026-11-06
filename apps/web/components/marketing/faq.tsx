"use client";

import { Accordion as A } from "radix-ui";
import { Plus } from "lucide-react";
import type { ReactNode } from "react";

export type FaqItem = { q: string; a: ReactNode };

export function Faq({ items }: { items: FaqItem[] }) {
  return (
    <A.Root type="single" collapsible className="divide-y divide-line border-y border-line">
      {items.map((item) => (
        <A.Item key={item.q} value={item.q}>
          <A.Header>
            <A.Trigger className="group flex w-full items-center justify-between gap-6 py-5 text-left text-[16px] font-medium text-ink-900 hover:text-brand-700">
              {item.q}
              <Plus className="size-5 shrink-0 text-ink-400 transition-transform duration-200 group-data-[state=open]:rotate-45 group-data-[state=open]:text-brand-600" aria-hidden />
            </A.Trigger>
          </A.Header>
          <A.Content className="overflow-hidden text-[15px] leading-relaxed text-ink-500 data-[state=closed]:animate-[none] data-[state=open]:animate-rise">
            <div className="pb-5 pr-10">{item.a}</div>
          </A.Content>
        </A.Item>
      ))}
    </A.Root>
  );
}
