"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";

import type { PortalContext, UserSelf } from "@experiencebridge/api-client";
import { getAuthenticatedApiClient } from "@/lib/api/client";

type PortalAuthStatusProps = {
  portalContext: PortalContext;
  portalLabel: string;
};

type VerificationState =
  | { kind: "loading" }
  | { kind: "unauthenticated" }
  | { kind: "verified"; profile: UserSelf; isContextAuthorized: boolean }
  | { kind: "api-error"; statusCode: number; message: string }
  | { kind: "network-error" };

export function PortalAuthStatus({
  portalContext,
  portalLabel,
}: PortalAuthStatusProps) {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const [state, setState] = useState<VerificationState>({ kind: "loading" });
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      return;
    }

    const controller = new AbortController();
    let active = true;

    async function verifyPortalIdentityAndAuthorization() {
      setState({ kind: "loading" });

      try {
        const token = await getToken();
        if (!active) return;

        if (!token) {
          setState({ kind: "unauthenticated" });
          return;
        }

        const client = getAuthenticatedApiClient(token);
        const result = await client.GET("/api/v1/me", {
          signal: controller.signal,
        });

        if (!active) return;

        if (!result.response.ok || !result.data) {
          setState({
            kind: "api-error",
            statusCode: result.response.status,
            message:
              result.response.status === 401
                ? "FastAPI rejected the session token (401 AUTH_REQUIRED)."
                : result.response.status === 403
                  ? "FastAPI denied access for this account status (403 FORBIDDEN)."
                  : `FastAPI returned HTTP ${result.response.status}.`,
          });
          return;
        }

        const effectiveContexts = result.data.effective_contexts ?? [];
        setState({
          kind: "verified",
          profile: result.data,
          isContextAuthorized: effectiveContexts.includes(portalContext),
        });
      } catch {
        if (active && !controller.signal.aborted) {
          setState({ kind: "network-error" });
        }
      }
    }

    void verifyPortalIdentityAndAuthorization();

    return () => {
      active = false;
      controller.abort();
    };
  }, [isLoaded, isSignedIn, getToken, portalContext, reloadCount]);

  const effectiveState: VerificationState = !isLoaded
    ? { kind: "loading" }
    : !isSignedIn
      ? { kind: "unauthenticated" }
      : state;

  return (
    <section
      aria-label={`${portalLabel} portal authorization status`}
      className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-800">
            Server-side verification · GET /api/v1/me
          </p>
          <h2 className="mt-1 text-lg font-semibold text-slate-900">
            Identity &amp; {portalLabel} portal authorization check
          </h2>
        </div>
        <button
          type="button"
          onClick={() => setReloadCount((c) => c + 1)}
          disabled={effectiveState.kind === "loading"}
          className="rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-800 transition hover:border-teal-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800 disabled:cursor-wait disabled:opacity-60"
        >
          Re-verify with API
        </button>
      </div>

      <div aria-live="polite" className="mt-4">
        {effectiveState.kind === "loading" && (
          <div role="status" className="space-y-2 text-sm text-slate-600">
            <p>Verifying Clerk session token and portal role grants with FastAPI…</p>
            <div className="h-12 w-full animate-pulse rounded-lg bg-slate-100" />
          </div>
        )}

        {effectiveState.kind === "unauthenticated" && (
          <div
            role="alert"
            className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950"
          >
            <p className="font-semibold">Authentication required (401)</p>
            <p className="mt-1">
              No active Clerk session token is available. Sign in to verify your internal
              ExperienceBridge identity and portal permissions.
            </p>
          </div>
        )}

        {effectiveState.kind === "network-error" && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900"
          >
            <p className="font-semibold">API authorization check unreachable</p>
            <p className="mt-1">
              Could not reach FastAPI <code className="rounded bg-red-100 px-1 py-0.5 text-xs">GET /api/v1/me</code>.
              Portal permissions cannot be assumed from browser sign-in alone.
            </p>
          </div>
        )}

        {effectiveState.kind === "api-error" && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900"
          >
            <p className="font-semibold">
              API verification rejected (HTTP {effectiveState.statusCode})
            </p>
            <p className="mt-1">{effectiveState.message}</p>
          </div>
        )}

        {effectiveState.kind === "verified" && (
          <div className="space-y-4">
            <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  Internal User ID (Neon)
                </p>
                <p className="mt-1 font-mono text-xs text-slate-900">
                  {effectiveState.profile.id}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  Verified Clerk Subject
                </p>
                <p className="mt-1 font-mono text-xs text-slate-900">
                  {effectiveState.profile.identity_subject}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  Display Name &amp; Status
                </p>
                <p className="mt-1 text-slate-900">
                  {effectiveState.profile.display_name}{" "}
                  <span className="ml-1.5 inline-flex items-center rounded-full bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-900">
                    {effectiveState.profile.account_status}
                  </span>
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  DB Role Grants
                </p>
                <p className="mt-1 font-mono text-xs text-slate-900">
                  {(effectiveState.profile.role_grants ?? []).length > 0
                    ? (effectiveState.profile.role_grants ?? []).join(", ")
                    : "none"}
                </p>
              </div>
            </div>

            {effectiveState.isContextAuthorized ? (
              <div className="rounded-lg border border-teal-300 bg-teal-50 p-4 text-sm text-teal-950">
                <p className="font-semibold">
                  Portal context authorized: <code className="font-mono">{portalContext}</code>
                </p>
                <p className="mt-1">
                  FastAPI confirmed that your internal ExperienceBridge account holds the{" "}
                  <code className="font-mono">{portalContext}</code> portal context in PostgreSQL.
                </p>
              </div>
            ) : (
              <div
                role="status"
                className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950"
              >
                <p className="font-semibold">
                  Signed in, but not yet authorized for the {portalLabel} portal
                </p>
                <p className="mt-1 leading-6">
                  Your Clerk identity is verified, and your internal ExperienceBridge user record is
                  provisioned. However,{" "}
                  <strong>identity is not authorization</strong>: your account does not currently
                  hold the <code className="rounded bg-amber-100 px-1 py-0.5 font-mono text-xs">{portalContext}</code>{" "}
                  context in <code className="rounded bg-amber-100 px-1 py-0.5 font-mono text-xs">effective_contexts</code>{" "}
                  (current:{" "}
                  <code className="rounded bg-amber-100 px-1 py-0.5 font-mono text-xs">
                    {(effectiveState.profile.effective_contexts ?? []).length > 0
                      ? (effectiveState.profile.effective_contexts ?? []).join(", ")
                      : "none"}
                  </code>
                  ). Protected {portalLabel.toLowerCase()} domain actions remain blocked by FastAPI.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
