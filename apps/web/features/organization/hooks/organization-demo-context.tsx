"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { createDemoState } from "../data/portal-fixtures";
import type { DemoState } from "../types/portal";
import { usePortalApi } from "@/lib/api/portal-api";
import { mapProjectReadToDemo } from "../lib/organization-api-sync";

interface DemoContextValue {
  state: DemoState;
  update: (change: (current: DemoState) => DemoState) => void;
  notice: string;
  announce: (message: string) => void;
  refetch: () => Promise<void>;
  orgId: string | null;
}
const DemoContext = createContext<DemoContextValue | null>(null);

export function OrganizationDemoProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(createDemoState);
  const current = useRef(state);
  const [notice, announce] = useState("");
  const [orgId, setOrgId] = useState<string | null>(null);
  const { getApi, isSignedIn } = usePortalApi();

  function update(change: (state: DemoState) => DemoState) {
    const next = change(current.current);
    current.current = next;
    setState(next);
  }

  const loadData = async () => {
    try {
      const api = await getApi();
      const meRes = await api.getMe();
      if (!meRes.data) return;

      const orgsRes = await api.getMyOrganizations();
      if (orgsRes.data && orgsRes.data.length > 0) {
        const primaryOrg = orgsRes.data[0];
        setOrgId(primaryOrg.id);

        const projectsRes = await api.getOrganizationProjects(primaryOrg.id);
        if (projectsRes.data) {
          const liveProjects = projectsRes.data.map(mapProjectReadToDemo);
          update((curr) => {
            const liveIds = new Set(liveProjects.map((p) => p.id));
            const remaining = curr.projects.filter((p) => !liveIds.has(p.id));
            return {
              ...curr,
              profile: {
                ...curr.profile,
                name: primaryOrg.display_name,
                description: primaryOrg.description,
                verification: primaryOrg.verification_status === "verified" ? "Not verified" : "Pending demo review",
              },
              projects: [...liveProjects, ...remaining],
            };
          });
        }
      }
    } catch {
      // In offline or non-authed environments, preserve sample fixtures
    }
  };

  useEffect(() => {
    let active = true;
    async function init() {
      if (!isSignedIn) return;
      try {
        const api = await getApi();
        const meRes = await api.getMe();
        if (!meRes.data || !active) return;

        const orgsRes = await api.getMyOrganizations();
        if (!active || !orgsRes.data || orgsRes.data.length === 0) return;
        const primaryOrg = orgsRes.data[0];
        setOrgId(primaryOrg.id);

        const projectsRes = await api.getOrganizationProjects(primaryOrg.id);
        if (active && projectsRes.data) {
          const liveProjects = projectsRes.data.map(mapProjectReadToDemo);
          update((curr) => {
            const liveIds = new Set(liveProjects.map((p) => p.id));
            const remaining = curr.projects.filter((p) => !liveIds.has(p.id));
            return {
              ...curr,
              profile: {
                ...curr.profile,
                name: primaryOrg.display_name,
                description: primaryOrg.description,
                verification: primaryOrg.verification_status === "verified" ? "Not verified" : "Pending demo review",
              },
              projects: [...liveProjects, ...remaining],
            };
          });
        }
      } catch {
        // Fallback
      }
    }
    void init();
    return () => {
      active = false;
    };
  }, [isSignedIn, getApi]);

  return (
    <DemoContext.Provider value={{ state, update, notice, announce, refetch: loadData, orgId }}>
      {children}
    </DemoContext.Provider>
  );
}

export function useOrganizationDemo() {
  const context = useContext(DemoContext);
  if (!context) throw new Error("Organization presentation context is missing.");
  return context;
}
