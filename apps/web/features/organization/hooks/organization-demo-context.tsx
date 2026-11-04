"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createDemoState } from "../data/portal-fixtures";
import type { DemoState } from "../types/portal";
import type { OrganizationRead } from "@experiencebridge/api-client";
import { usePortalApi } from "@/lib/api/portal-api";
import { isPortalPresentationMode } from "@/lib/auth/portal-presentation";
import { requireData } from "@/lib/api/use-portal-resource";
import { termsSnapshot } from "../../student/lib/api-records";
import { useVisibleRefresh } from "@/lib/api/use-visible-refresh";
import { loadOrganizationRecords } from "../lib/live-records";
import { mapProjectReadToDemo } from "../lib/organization-api-sync";

function emptyLiveState(): DemoState {
  return { revision: 0, projects: [], applications: [], mentors: [], invitations: [], submissions: [], messages: [], events: [],
    profile: { name: "Organization workspace", description: "", email: "", website: "", country: "", representative: "", digest: false, verification: "Not verified" } };
}
interface DemoContextValue {
  state: DemoState; update: (change: (current: DemoState) => DemoState) => void;
  notice: string; announce: (message: string) => void; refetch: () => Promise<void>;
  organizations: OrganizationRead[]; selectOrganization: (id: string) => void;
  orgId: string | null; organization: OrganizationRead | null; preview: boolean; loading?: boolean;
}
const DemoContext = createContext<DemoContextValue | null>(null);
export function OrganizationDemoProvider({ children }: { children: ReactNode }) {
  const preview = isPortalPresentationMode();
  const pathname = usePathname();
  const [state, setState] = useState(() => preview ? createDemoState() : emptyLiveState());
  const current = useRef(state);
  const [notice, announce] = useState("");
  const [organizations, setOrganizations] = useState<OrganizationRead[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(() => {
    if (preview || typeof window === "undefined") return null;
    try { return window.sessionStorage.getItem("experiencebridge:selected-org-id"); } catch { return null; }
  });
  const [organization, setOrganization] = useState<OrganizationRead | null>(null);
  const [loading, setLoading] = useState(!preview);
  const [error, setError] = useState("");
  const { getApi, isLoaded, isSignedIn } = usePortalApi();
  const generation = useRef(0);
  function update(change: (value: DemoState) => DemoState) {
    if (!preview) throw new Error("This action has no live API integration. No database change was made.");
    current.current = change(current.current); setState(current.current);
  }
  const loadData = useCallback(async () => {
    if (preview) return;
    const run = ++generation.current;
    try {
      const api = await getApi();
      setError("");
      const me = await api.getMe();
      if (!me.data) throw new Error(me.error ?? "Identity verification failed.");
      const orgs = await api.getMyOrganizations();
      if (!orgs.data) throw new Error(orgs.error ?? "Organizations unavailable.");
      const org = orgs.data.find(o => o.id === selectedOrgId) ?? orgs.data[0] ?? null;
      const projects = org ? await api.getOrganizationProjects(org.id) : null;
      if (projects && !projects.data) throw new Error(projects.error ?? "Projects unavailable.");
      const records = await loadOrganizationRecords(api, projects?.data ?? []);
      const projectViews = await Promise.all((projects?.data ?? []).map(async project => {
        const baseView = mapProjectReadToDemo(project);
        const acceptedSet = new Set(records.acceptedMilestones[project.id] ?? []);
        const view = {
          ...baseView,
          members: records.participants[project.id] ?? [],
          milestones: baseView.milestones.map((m, idx) => ({ ...m, done: acceptedSet.has(idx) })),
        };
        let versionId = project.published_terms_version_id ?? project.submitted_terms_version_id;
        if (!versionId && (project.published_terms_version || project.submitted_terms_version)) {
          const detail = requireData(await api.getProject(project.id));
          versionId = detail.published_terms_version_id ?? detail.submitted_terms_version_id;
        }
        if (!versionId) return view;
        const terms = termsSnapshot(requireData(await api.getTermsVersion(project.id, versionId))).terms;
        return { ...view, fee: String(terms.fee_amount), paymentTerms: terms.payment_terms, ipTerms: terms.ip_ownership_terms,
          privacyTerms: terms.confidentiality_terms, mentorPlan: terms.mentor_plan };
      }));
      if (run !== generation.current) return;
      setOrganizations(orgs.data);
      setOrganization(org);
      const next = emptyLiveState();
      if (org) { next.profile.name = org.display_name; next.profile.description = org.description; }
      next.projects = projectViews;
      next.applications = records.applications;
      next.submissions = records.submissions;
      next.invitations = records.invitations;
      next.mentors = records.mentors;
      next.events = records.events;
      current.current = next; setState(next);
    } catch (e) {
      if (run === generation.current) { setOrganization(null); setState(emptyLiveState()); setError(e instanceof Error ? e.message : "API connection failed."); }
      throw e;
    } finally { if (run === generation.current) setLoading(false); }
  }, [preview, getApi, selectedOrgId]);
  useEffect(() => {
    const timer = window.setTimeout(() => { if (!preview && isLoaded) void loadData().catch(() => {}); }, 0);
    const requestGeneration = generation;
    return () => { window.clearTimeout(timer); requestGeneration.current++; };
  }, [preview, isLoaded, isSignedIn, loadData]);
  useVisibleRefresh(loadData, !preview && isLoaded && isSignedIn && ["/organization/applications", "/organization/reviews", "/organization/dashboard", "/organization/projects"].includes(pathname));
  return <DemoContext.Provider value={{ organizations, selectOrganization: id => { if (organizations.some(o => o.id === id)) { setLoading(true); setSelectedOrgId(id); try { window.sessionStorage.setItem("experiencebridge:selected-org-id", id); } catch { /* Ignore storage errors */ } } }, state, update, notice, announce, refetch: loadData, orgId: organization?.id ?? null, organization, preview, loading }}>
    {!preview && (loading || !isLoaded) ? <p role="status" className="p-8">Loading authenticated organization records...</p>
      : error ? <div role="alert" className="p-8"><p>{error}</p><button type="button" onClick={() => void loadData().catch(() => {})} className="mt-4 underline">Retry</button> | <Link href="/sign-in">Sign in</Link></div>
      : children}
  </DemoContext.Provider>;
}
export function useOrganizationDemo() {
  const context = useContext(DemoContext);
  if (!context) throw new Error("Organization context is missing.");
  return context;
}
