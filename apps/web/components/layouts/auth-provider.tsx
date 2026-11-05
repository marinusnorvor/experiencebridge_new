"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { UserSelf } from "@experiencebridge/api-client";
import { authClient, AuthApiError, clearCsrf } from "@/lib/auth/client";
import { PortalAuthContext } from "@/lib/api/portal-api";

type AuthState = "loading" | "authenticated" | "unauthenticated" | "expired" | "forbidden" | "unavailable";
type ContextValue = { state: AuthState; user: UserSelf | null; refresh: () => Promise<void>; logout: () => Promise<void> };
const Context = createContext<ContextValue>({ state: "unauthenticated", user: null, refresh: async () => {}, logout: async () => {} });
export const useAuth = () => useContext(Context);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>("loading");
  const [user, setUser] = useState<UserSelf | null>(null);
  const generation = useRef(0);
  const refresh = useCallback(async () => {
    const current = ++generation.current;
    try { const profile = await authClient.currentUser(); if (current === generation.current) { setUser(profile); setState("authenticated"); } }
    catch (error) { if (current === generation.current) { setUser(null); setState(error instanceof AuthApiError && error.status === 401 ? "unauthenticated" : error instanceof AuthApiError && error.status === 403 ? "forbidden" : "unavailable"); } }
  }, []);
  const logout = useCallback(async () => { ++generation.current; try { await authClient.logout(); } finally { clearCsrf(); setUser(null); setState("unauthenticated"); } }, []);
  useEffect(() => {
    const counter = generation;
    // Refresh asynchronously synchronizes this provider with the server session.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
    const expired = () => { ++generation.current; clearCsrf(); setUser(null); setState("expired"); };
    window.addEventListener("eb:session-expired", expired);
    return () => { ++counter.current; window.removeEventListener("eb:session-expired", expired); };
  }, [refresh]);
  const value = useMemo(() => ({ state, user, refresh, logout }), [state, user, refresh, logout]);
  const portal = useMemo(() => ({ isLoaded: state !== "loading", isSignedIn: state === "authenticated" }), [state]);
  return <Context.Provider value={value}><PortalAuthContext.Provider value={portal}>{children}</PortalAuthContext.Provider></Context.Provider>;
}
