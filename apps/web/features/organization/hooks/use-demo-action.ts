"use client";
import { useState } from "react";
import { useOrganizationDemo } from "./organization-demo-context";
import { demoActor, type DemoActionContext } from "../lib/demo-transitions";
import type { DemoState } from "../types/portal";

export function useDemoAction() {
  const { state, update, announce } = useOrganizationDemo();
  const [error, setError] = useState("");
  function run(change: (state: DemoState, context: DemoActionContext) => DemoState, message: string) {
    try {
      const context = { actor: demoActor, revision: state.revision, id: crypto.randomUUID(), at: new Date().toISOString() };
      update((current) => change(current, context));
      setError(""); announce(message); return true;
    } catch (error) { setError(error instanceof Error ? error.message : "The local action failed. Try again."); return false; }
  }
  return { run, error, clearError: () => setError("") };
}
