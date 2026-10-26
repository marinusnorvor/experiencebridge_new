import { notFound } from "next/navigation";

import { ApiHealthPanel } from "@/features/development-integration/components/api-health-panel";

export default function DevelopmentIntegrationPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-6 py-16">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-800">
        Development integration
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
        Web to API connection
      </h1>
      <p className="mt-4 max-w-2xl leading-7 text-slate-600">
        This development-only page requests the existing FastAPI liveness endpoint. It reports API availability only.
      </p>
      <ApiHealthPanel />
    </main>
  );
}
