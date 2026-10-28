"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";

import type { HealthResponse, UserSelf } from "@experiencebridge/api-client";
import { getApiClient, getAuthenticatedApiClient } from "@/lib/api/client";

type HealthCheckState =
  | { kind: "loading" }
  | { kind: "success"; data: HealthResponse; statusCode: number }
  | { kind: "api-error"; statusCode: number }
  | { kind: "network-error" };

type MeCheckState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "success"; data: UserSelf; statusCode: number }
  | { kind: "api-error"; statusCode: number; detail: string }
  | { kind: "network-error" };

export function ApiHealthPanel() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const [state, setState] = useState<HealthCheckState>({ kind: "loading" });
  const [requestNumber, setRequestNumber] = useState(0);
  const [meState, setMeState] = useState<MeCheckState>({ kind: "idle" });

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    async function checkHealth() {
      setState({ kind: "loading" });

      try {
        const result = await getApiClient().GET("/health", {
          signal: controller.signal,
        });

        if (!active) return;

        if (!result.response.ok || result.error || !result.data) {
          setState({ kind: "api-error", statusCode: result.response.status });
          return;
        }

        setState({
          kind: "success",
          data: result.data,
          statusCode: result.response.status,
        });
      } catch {
        if (active && !controller.signal.aborted) {
          setState({ kind: "network-error" });
        }
      }
    }

    void checkHealth();

    return () => {
      active = false;
      controller.abort();
    };
  }, [requestNumber]);

  async function checkIdentityProfile() {
    setMeState({ kind: "loading" });
    try {
      const token = isSignedIn ? await getToken() : null;
      const client = getAuthenticatedApiClient(token);
      const result = await client.GET("/api/v1/me");

      if (!result.response.ok || !result.data) {
        setMeState({
          kind: "api-error",
          statusCode: result.response.status,
          detail:
            result.response.status === 401
              ? "401 AUTH_REQUIRED (anonymous or invalid/expired Bearer token)"
              : `HTTP ${result.response.status}`,
        });
        return;
      }

      setMeState({
        kind: "success",
        data: result.data,
        statusCode: result.response.status,
      });
    } catch {
      setMeState({ kind: "network-error" });
    }
  }

  return (
    <div className="space-y-6">
      <section
        aria-labelledby="api-health-heading"
        className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 id="api-health-heading" className="text-lg font-semibold">
              FastAPI health check
            </h2>
            <p className="mt-1 text-sm text-slate-600">GET /health</p>
          </div>
          <button
            type="button"
            onClick={() => setRequestNumber((current) => current + 1)}
            disabled={state.kind === "loading"}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium transition hover:border-teal-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800 disabled:cursor-wait disabled:opacity-60"
          >
            Retry request
          </button>
        </div>

        <div aria-live="polite" className="mt-5">
          {state.kind === "loading" && (
            <p role="status" className="text-sm text-slate-700">
              Requesting the live response from FastAPI…
            </p>
          )}

          {state.kind === "network-error" && (
            <p role="alert" className="text-sm text-red-800">
              The FastAPI service could not be reached. Check that it is running and that the public API URL is correct.
            </p>
          )}

          {state.kind === "api-error" && (
            <p role="alert" className="text-sm text-red-800">
              FastAPI returned HTTP {state.statusCode} for /health.
            </p>
          )}

          {state.kind === "success" && (
            <div>
              <p className="text-sm font-medium text-teal-900">
                FastAPI responded with HTTP {state.statusCode}.
              </p>
              <pre className="mt-3 overflow-x-auto rounded-lg bg-slate-950 p-4 text-sm text-slate-50">
                <code>{JSON.stringify(state.data, null, 2)}</code>
              </pre>
            </div>
          )}
        </div>
      </section>

      <section
        aria-labelledby="api-me-heading"
        className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 id="api-me-heading" className="text-lg font-semibold">
              Authenticated identity &amp; role check
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              GET /api/v1/me (Clerk session status:{" "}
              {!isLoaded ? "loading…" : isSignedIn ? "signed in" : "signed out"})
            </p>
          </div>
          <button
            type="button"
            onClick={() => void checkIdentityProfile()}
            disabled={!isLoaded || meState.kind === "loading"}
            className="rounded-lg bg-teal-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800 disabled:cursor-wait disabled:opacity-60"
          >
            Request /api/v1/me
          </button>
        </div>

        <div aria-live="polite" className="mt-5">
          {meState.kind === "idle" && (
            <p className="text-sm text-slate-600">
              Click <strong>Request /api/v1/me</strong> to verify Bearer token propagation and
              PostgreSQL profile resolution.
            </p>
          )}

          {meState.kind === "loading" && (
            <p role="status" className="text-sm text-slate-700">
              Requesting /api/v1/me from FastAPI…
            </p>
          )}

          {meState.kind === "network-error" && (
            <p role="alert" className="text-sm text-red-800">
              Could not reach FastAPI GET /api/v1/me.
            </p>
          )}

          {meState.kind === "api-error" && (
            <p role="alert" className="text-sm text-amber-900">
              FastAPI returned {meState.detail}.
            </p>
          )}

          {meState.kind === "success" && (
            <div>
              <p className="text-sm font-medium text-teal-900">
                FastAPI verified Clerk token and returned HTTP {meState.statusCode}.
              </p>
              <pre className="mt-3 overflow-x-auto rounded-lg bg-slate-950 p-4 text-sm text-slate-50">
                <code>{JSON.stringify(meState.data, null, 2)}</code>
              </pre>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
