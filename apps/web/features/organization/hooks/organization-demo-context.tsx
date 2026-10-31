"use client";

import { createContext, useContext, useRef, useState, type ReactNode } from "react";
import { createDemoState } from "../data/portal-fixtures";
import type { DemoState } from "../types/portal";

interface DemoContextValue {
  state: DemoState;
  update: (change: (current: DemoState) => DemoState) => void;
  notice: string;
  announce: (message: string) => void;
}
const DemoContext = createContext<DemoContextValue | null>(null);

/** In-memory tab session only. Refresh resets simulated decisions; no API writes. */
export function OrganizationDemoProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(createDemoState);
  const current = useRef(state);
  const [notice, announce] = useState("");
  function update(change: (state: DemoState) => DemoState) {
    const next = change(current.current);
    current.current = next;
    setState(next);
  }
  return <DemoContext.Provider value={{ state, update, notice, announce }}>{children}</DemoContext.Provider>;
}

export function useOrganizationDemo() {
  const context = useContext(DemoContext);
  if (!context) throw new Error("Organization presentation context is missing.");
  return context;
}
