"use client";
import type { PortalContext } from "@experiencebridge/api-client";
import { useAuth } from "@/components/layouts/auth-provider";
export function PortalAuthStatus({ portalContext, portalLabel }: {portalContext: PortalContext; portalLabel: string}) {
 const {state, user, refresh}=useAuth();
 if (state === "loading") return <p role="status">Checking permissions?</p>;
 if (state !== "authenticated" || !user) return <p role="alert">Your session is unavailable. Sign in again.</p>;
 const allowed = (user.effective_contexts ?? []).includes(portalContext);
 return <section aria-label={`${portalLabel} portal authorization status`} className="mt-8 rounded-xl border p-6"><p>{allowed ? `${portalLabel} access confirmed.` : `Your account does not have ${portalLabel} access.`}</p><button onClick={() => void refresh()}>Refresh access</button></section>;
}
