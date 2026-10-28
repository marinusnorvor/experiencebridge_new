import { Suspense } from "react";

import type { PortalContext } from "@experiencebridge/api-client";
import { PortalAuthStatus } from "@/components/layouts/portal-auth-status";
import { isPortalPresentationMode } from "@/lib/auth/portal-presentation";

type PortalPlaceholderProps = {
  title: string;
  description: string;
  portalContext?: PortalContext;
};

function resolvePortalContext(
  title: string,
  explicitContext?: PortalContext
): PortalContext {
  if (explicitContext) {
    return explicitContext;
  }
  const normalized = title.trim().toLowerCase();
  if (
    normalized === "student" ||
    normalized === "organization" ||
    normalized === "mentor" ||
    normalized === "admin"
  ) {
    return normalized;
  }
  return "student";
}

export function PortalPlaceholder({
  title,
  description,
  portalContext,
}: PortalPlaceholderProps) {
  const resolvedContext = resolvePortalContext(title, portalContext);
  const presentationMode = isPortalPresentationMode();

  return (
    <main className="mx-auto flex min-h-[calc(100vh-4.5rem)] w-full max-w-4xl flex-col justify-center px-6 py-16">
      <p className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-teal-800">
        ExperienceBridge · {presentationMode ? "Portal interface" : "Protected portal route"}
      </p>
      <h1 className="text-4xl font-semibold tracking-tight">{title} dashboard</h1>
      <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">{description}</p>

      {!presentationMode && <Suspense
        fallback={
          <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
            Loading portal verification status…
          </div>
        }
      >
        <PortalAuthStatus portalContext={resolvedContext} portalLabel={title} />
      </Suspense>}

      <p className="mt-6 rounded-lg border border-slate-200 bg-slate-100 p-4 text-sm text-slate-700">
        {presentationMode ? (
          <>This portal’s workflows are not implemented in the merged code yet.
          Private data and actions are unavailable in this local view.</>
        ) : <>Authentication is enforced via Clerk, and portal context authorization is verified
        against FastAPI (<code className="rounded bg-white px-1.5 py-0.5 text-xs">GET /api/v1/me</code>).
        Domain workflows for the {title.toLowerCase()} portal remain gated behind their
        respective feature issues.</>}
      </p>
    </main>
  );
}
