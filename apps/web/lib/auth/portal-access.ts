export type PortalAccess = "preview" | "loading" | "unauthenticated" | "expired" | "forbidden" | "unavailable" | "allowed";

/** Decide only the UI boundary; backend permissions remain authoritative. */
export function portalAccess(state: string, contexts: readonly string[], portal: string, preview: boolean): PortalAccess {
  if (preview) return "preview";
  if (state === "loading" || state === "unauthenticated" || state === "expired" || state === "forbidden" || state === "unavailable") return state;
  if (state !== "authenticated") return "unauthenticated";
  if (["mentor", "organization", "admin"].includes(portal) && !contexts.includes(portal)) return "forbidden";
  return "allowed";
}
