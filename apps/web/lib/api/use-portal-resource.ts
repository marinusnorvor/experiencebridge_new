"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePortalApi, type createPortalApi, type ApiResult } from "./portal-api";

export type PortalApi = ReturnType<typeof createPortalApi>;

export function requireData<T>(result: ApiResult<T>): T {
  if (result.error || result.data === null) throw new Error(result.error ?? "The API returned no record.");
  return result.data;
}

/** Clear stale records on authentication changes; never substitute demo data on failure. */
export function usePortalResource<T>(load: (api: PortalApi) => Promise<T>, enabled = true) {
  const { getApi, isLoaded, isSignedIn } = usePortalApi();
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(enabled);
  const generation = useRef(0);
  const reload = useCallback(async () => {
    const run = ++generation.current;
    setLoading(true); setError("");
    try {
      const next = await load(await getApi());
      if (run === generation.current) setData(next);
      return next;
    } catch (e) {
      if (run === generation.current) { setData(null); setError(e instanceof Error ? e.message : "API request failed."); }
      throw e;
    } finally { if (run === generation.current) setLoading(false); }
  }, [getApi, load]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setData(null);
      if (enabled && isLoaded) void reload().catch(() => {});
    }, 0);
    const requestGeneration = generation;
    return () => { window.clearTimeout(timer); requestGeneration.current++; };
  }, [enabled, isLoaded, isSignedIn, reload]);
  return { data, error, loading: enabled && (!isLoaded || loading), reload, getApi };
}
