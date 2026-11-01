"use client";
import { useState } from "react";
import { useOrganizationDemo } from "./organization-demo-context";
import { demoActor, type DemoActionContext } from "../lib/demo-transitions";
import type { DemoState } from "../types/portal";
import { usePortalApi } from "@/lib/api/portal-api";

export function useDemoAction() {
  const { state, update, announce, refetch } = useOrganizationDemo();
  const { getApi } = usePortalApi();
  const [error, setError] = useState("");

  function run(
    change: (state: DemoState, context: DemoActionContext) => DemoState,
    message: string,
    sync?: (api: Awaited<ReturnType<typeof getApi>>) => Promise<void>
  ) {
    try {
      const context = { actor: demoActor, revision: state.revision, id: crypto.randomUUID(), at: new Date().toISOString() };
      update((current) => change(current, context));
      if (sync) {
        void (async () => {
          try {
            const api = await getApi();
            await sync(api);
            void refetch();
          } catch (e) {
            console.warn("Backend sync notice:", e);
          }
        })();
      }
      setError("");
      announce(message);
      return true;
    } catch (error) {
      setError(error instanceof Error ? error.message : "The local action failed. Try again.");
      return false;
    }
  }

  return { run, error, clearError: () => setError("") };
}
