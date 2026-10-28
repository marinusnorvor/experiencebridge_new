"use client";

import { useState } from "react";

import type { DemoPortalContent } from "@/features/demo/demo-data";

type DemoPortalProps = {
  content: DemoPortalContent;
};

export function DemoPortal({ content }: DemoPortalProps) {
  const [activeView, setActiveView] = useState<"overview" | "explore">(
    "overview"
  );

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.16em] text-teal-800">
            {content.name} portal · Public demo
          </p>
          <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            {content.heading}
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
            {content.description}
          </p>
        </div>
        <span className="w-fit rounded-full border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-amber-950">
          Synthetic data
        </span>
      </div>

      <div
        aria-label={`${content.name} demo views`}
        className="mb-6 flex gap-2 border-b border-slate-200"
      >
        <button
          type="button"
          aria-pressed={activeView === "overview"}
          onClick={() => setActiveView("overview")}
          className={`border-b-2 px-3 py-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800 ${
            activeView === "overview"
              ? "border-teal-800 text-teal-900"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          Overview
        </button>
        <button
          type="button"
          aria-pressed={activeView === "explore"}
          onClick={() => setActiveView("explore")}
          className={`border-b-2 px-3 py-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800 ${
            activeView === "explore"
              ? "border-teal-800 text-teal-900"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          What you can explore
        </button>
      </div>

      {activeView === "overview" ? (
        <section aria-label={`${content.name} overview`}>
          <p className="mb-6 max-w-3xl text-sm leading-6 text-slate-600">
            {content.overview}
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            {content.cards.map((card) => (
              <article
                key={card.label}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <p className="text-sm font-medium text-slate-600">{card.label}</p>
                <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
                  {card.value}
                </p>
                <p className="mt-2 text-xs text-slate-500">{card.detail}</p>
              </article>
            ))}
          </div>
          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            {content.items.map((item) => (
              <article
                key={item.title}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="font-semibold text-slate-950">{item.title}</h2>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                    {item.status}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {item.description}
                </p>
              </article>
            ))}
          </div>
        </section>
      ) : (
        <section
          aria-label="What you can explore in this demo"
          className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <h2 className="text-lg font-semibold text-slate-950">
            Explore the {content.name.toLowerCase()} experience
          </h2>
          <ul className="mt-4 space-y-3">
            {content.explore.map((item) => (
              <li key={item} className="flex gap-3 text-sm leading-6 text-slate-700">
                <span
                  aria-hidden="true"
                  className="mt-2 h-2 w-2 shrink-0 rounded-full bg-teal-700"
                />
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-6 rounded-lg bg-amber-50 p-4 text-sm leading-6 text-amber-950">
            This preview is read-only. It does not connect to protected APIs or
            save changes.
          </p>
        </section>
      )}
    </main>
  );
}
