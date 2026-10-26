"use client";

import { useEffect, useState } from "react";

import type { HealthResponse } from "@experiencebridge/api-client";
import { getApiClient } from "@/lib/api/client";

type HealthCheckState =
  | { kind: "loading" }
  | { kind: "success"; data: HealthResponse; statusCode: number }
  | { kind: "api-error"; statusCode: number }
  | { kind: "network-error" };

export function ApiHealthPanel() {
  const [state, setState] = useState<HealthCheckState>({ kind: "loading" });
  const [requestNumber, setRequestNumber] = useState(0);

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

  return (
    <section aria-labelledby="api-health-heading" className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
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
  );
}
