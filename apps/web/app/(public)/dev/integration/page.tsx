import { Suspense } from "react";
import { notFound } from "next/navigation";

import { ApiHealthPanel } from "@/features/development-integration/components/api-health-panel";

export default function DevelopmentIntegrationPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return (
    <main className="mx-auto min-h-[calc(100vh-4.5rem)] w-full max-w-3xl px-6 py-16">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-800">
        Development integration
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
        Web to API connection
      </h1>
      <p className="mt-4 max-w-2xl leading-7 text-slate-600">
        This development-only page requests the FastAPI liveness endpoint (<code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">GET /health</code>)
        and the Clerk-authenticated profile endpoint (<code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">GET /api/v1/me</code>).
      </p>
      <Suspense
        fallback={
          <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
            Loading development integration diagnostics…
          </div>
        }
      >
        <ApiHealthPanel />
      </Suspense>
    </main>
  );
}
