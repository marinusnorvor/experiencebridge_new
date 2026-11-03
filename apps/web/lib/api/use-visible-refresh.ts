"use client";
import { useEffect } from "react";

/** Refresh visible portals when another account publishes or submits a record. */
export function useVisibleRefresh(reload: () => Promise<unknown>, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    let running = false;
    const refresh = () => {
      if (document.visibilityState !== "visible" || running) return;
      running = true;
      void reload().catch(() => {}).finally(() => { running = false; });
    };
    const timer = window.setInterval(refresh, 30000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [reload, enabled]);
}
