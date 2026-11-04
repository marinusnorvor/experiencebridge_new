import type { createPortalApi } from "@/lib/api/portal-api";
import type { Brief, DemoProject } from "../types/portal";
import type { ProjectRead, ProjectCreate } from "@experiencebridge/api-client";
import { validateApiBrief } from "./brief-validation";
import { emptyBrief } from "../data/portal-fixtures";

export function mapBackendStatusToDemo(status: string): DemoProject["status"] {
  const statuses: Record<string, DemoProject["status"]> = { draft: "Draft", changes_requested: "Draft", rejected: "Closed", pending_review: "In review", open: "Recruiting", in_progress: "Active", completed: "Completed", cancelled: "Closed" };
  return statuses[status] ?? "Closed";
}

export function mapProjectReadToDemo(p: ProjectRead): DemoProject {
  const scope = p.scope as Partial<ProjectCreate>;
  return { ...emptyBrief, id: p.id, title: p.title, problem: p.description,
    seats: p.capacity, hours: Number(scope.estimated_minutes ?? 0) / 60,
    start: scope.start_on ?? "", due: scope.due_on ?? "",
    deliverables: scope.scope_in ?? "", exclusions: scope.scope_out ?? "",
    criteria: scope.milestones?.flatMap(m => m.acceptance_criteria).join("\n") ?? "",
    milestonePlan: scope.milestones?.map(m => m.title).join("\n") ?? "",
    reviewer: p.org_reviewer_user_id ?? "", status: mapBackendStatusToDemo(p.status), backendStatus: p.status,
    termsVersion: p.published_terms_version ?? p.submitted_terms_version ?? 0,
    members: [], milestones: (scope.milestones ?? []).map((m, i) => ({
      id: (m as typeof m & { id?: string }).id ?? `${p.id}-${i}`, title: m.title, due: m.due_on, done: false, blocker: "",
    })),
  };
}

/** Each result is checked. Partial persistence retains the backend ID for a safe retry. */
export async function syncProjectToBackend(
  api: ReturnType<typeof createPortalApi>, orgId: string, brief: Brief, submit: boolean,
  existingId?: string,
): Promise<{ projectId: string; error?: string; fieldErrors?: Partial<Record<keyof Brief, string>> }> {
  let projectId = existingId ?? "";
  const fieldErrors = validateApiBrief(brief, submit);
  if (Object.keys(fieldErrors).length) return { projectId, error: "Review the highlighted fields before saving.", fieldErrors };
  try {
    const me = await api.getMe();
    if (!me.data) throw new Error(me.error ?? "Identity unavailable.");
    const orgs = await api.getMyOrganizations();
    if (!orgs.data) throw new Error(orgs.error ?? "Membership unavailable.");
    const org = orgs.data.find(o => o.id === orgId);
    if (!org) throw new Error("Organization membership is unavailable.");
    const previous = existingId ? await api.getProject(existingId) : null;
    if (previous && !previous.data) throw new Error(previous.error ?? "Draft unavailable.");
    const body: ProjectCreate = {
      title: brief.title, description: brief.problem, capacity: Number(brief.seats),
      org_reviewer_user_id: previous?.data?.org_reviewer_user_id ?? me.data.id,
      scope_in: brief.deliverables, scope_out: brief.exclusions,
      estimated_minutes: Math.round(Number(brief.hours) * 60), start_on: brief.start, due_on: brief.due,
      milestones: [{ title: brief.milestonePlan, acceptance_criteria: brief.criteria.split("\n").map(value => value.trim()).filter(Boolean), due_on: brief.due }],
    };
    const saved = previous?.data
      ? await api.updateProject(projectId, body, previous.data.row_version)
      : await api.createProject(orgId, body, org.row_version);
    if (!saved.data) throw new Error(saved.error ?? "Draft save failed.");
    projectId = saved.data.id;
    if (submit) {
      if (org.verification_status !== "verified") throw new Error("Draft saved. Submit your organization for verification in Settings and wait for an independent Admin approval before submitting this project.");
      if (!/^\d+(\.\d{1,2})?$/.test(brief.fee.trim()) || Number(brief.fee) <= 0) throw new Error("Draft saved. Enter a positive fixed fee with at most two decimal places.");
      const terms = await api.createTermsVersion(projectId, {
        compensation_type: "paid_fixed", currency: "GHS", fee_amount: Number(brief.fee).toFixed(2),
        payment_terms: brief.paymentTerms, ip_ownership_terms: brief.ipTerms,
        confidentiality_terms: brief.privacyTerms, mentor_plan: brief.mentorPlan,
      }, saved.data.row_version);
      if (!terms.data) throw new Error(`Draft saved. ${terms.error ?? "Terms could not be saved."}`);
      const current = await api.getProject(projectId);
      if (!current.data) throw new Error(current.error ?? "Cannot retrieve saved draft.");
      const submitted = await api.submitProjectReview(projectId, terms.data.id, current.data.row_version);
      if (!submitted.data) throw new Error(`Draft and terms saved. ${submitted.error ?? "Moderation submission failed."}`);
    }
    const retrieved = await api.getProject(projectId);
    if (!retrieved.data || retrieved.data.id !== projectId || (submit && retrieved.data.status !== "pending_review")) throw new Error(retrieved.error ?? "Saved record could not be confirmed through the API.");
    return { projectId };
  } catch (e) { return { projectId, error: e instanceof Error ? e.message : "API request failed." }; }
}
