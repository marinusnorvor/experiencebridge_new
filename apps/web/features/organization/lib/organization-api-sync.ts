"use client";

import type { createPortalApi } from "@/lib/api/portal-api";
import type { Brief, DemoProject } from "../types/portal";
import type { ProjectRead } from "@experiencebridge/api-client";

export function mapBackendStatusToDemo(status: string): DemoProject["status"] {
  switch (status) {
    case "draft":
      return "Draft";
    case "pending_review":
      return "In review";
    case "open":
      return "Recruiting";
    case "in_progress":
      return "Active";
    case "completed":
      return "Completed";
    case "cancelled":
      return "Closed";
    default:
      return "Published";
  }
}

export function mapProjectReadToDemo(p: ProjectRead): DemoProject {
  const scope = (p.scope ?? {}) as Record<string, unknown>;
  return {
    id: p.id,
    title: p.title,
    problem: typeof scope.problem === "string" ? scope.problem : p.description,
    audience: typeof scope.audience === "string" ? scope.audience : "All participants",
    outcome: typeof scope.outcome === "string" ? scope.outcome : "Demonstrated outcomes",
    skills: Array.isArray(scope.skills) ? (scope.skills as string[]).join(", ") : "General",
    difficulty: typeof scope.difficulty === "string" ? scope.difficulty : "Intermediate",
    seats: p.capacity,
    hours: typeof scope.hours === "number" ? scope.hours : 10,
    eligibility: typeof scope.eligibility === "string" ? scope.eligibility : "Open",
    deliverables: typeof scope.deliverables === "string" ? scope.deliverables : "Project repository",
    criteria: typeof scope.criteria === "string" ? scope.criteria : "Meets functional requirements",
    evidence: typeof scope.evidence === "string" ? scope.evidence : "Working demonstration",
    exclusions: typeof scope.exclusions === "string" ? scope.exclusions : "None",
    start: typeof scope.start === "string" ? scope.start : new Date().toISOString().slice(0, 10),
    due: typeof scope.due === "string" ? scope.due : new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    milestonePlan: typeof scope.milestonePlan === "string" ? scope.milestonePlan : "Standard plan",
    mentorPlan: typeof scope.mentorPlan === "string" ? scope.mentorPlan : "Weekly mentorship",
    fee: typeof scope.fee === "string" ? scope.fee : "0",
    paymentTerms: typeof scope.paymentTerms === "string" ? scope.paymentTerms : "Upon completion",
    ipTerms: typeof scope.ipTerms === "string" ? scope.ipTerms : "Open source",
    privacyTerms: typeof scope.privacyTerms === "string" ? scope.privacyTerms : "Private by default",
    reviewer: "Assigned Organization Reviewer",
    status: mapBackendStatusToDemo(p.status),
    termsVersion: p.published_terms_version ?? p.submitted_terms_version ?? 1,
    members: [],
    milestones: [
      { id: "m1", title: "Milestone 1: Project Setup & Initial Sprint", due: "Sprint 1", done: false, blocker: "" },
      { id: "m2", title: "Milestone 2: Final Deliverable & Handover", due: "Sprint 2", done: false, blocker: "" },
    ],
  };
}

export async function syncProjectToBackend(
  api: ReturnType<typeof createPortalApi>,
  orgId: string,
  brief: Brief,
  submit: boolean,
  orgReviewerUserId?: string
): Promise<{ projectId: string; error?: string }> {
  try {
    const meRes = await api.getMe();
    const reviewerId = orgReviewerUserId || meRes.data?.id;
    if (!reviewerId) {
      return { projectId: "", error: "Organization reviewer ID unavailable." };
    }

    const startDate = brief.start && /^\d{4}-\d{2}-\d{2}$/.test(brief.start)
      ? brief.start
      : new Date().toISOString().slice(0, 10);
    const dueDate = brief.due && /^\d{4}-\d{2}-\d{2}$/.test(brief.due)
      ? brief.due
      : new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

    const projRes = await api.createProject(orgId, {
      title: brief.title,
      description: brief.problem && brief.problem.length >= 10 ? brief.problem : "Comprehensive challenge brief for student participants.",
      capacity: Number(brief.seats) || 1,
      org_reviewer_user_id: reviewerId,
      scope_in: brief.deliverables && brief.deliverables.length >= 10 ? brief.deliverables : "Implementation of core application features and tests.",
      scope_out: brief.exclusions && brief.exclusions.length >= 10 ? brief.exclusions : "Production infrastructure provisioning is out of scope.",
      estimated_minutes: (Number(brief.hours) || 10) * 60,
      start_on: startDate,
      due_on: dueDate,
      milestones: [
        {
          title: "Milestone 1: Prototype and Core Features",
          acceptance_criteria: [brief.criteria && brief.criteria.length >= 5 ? brief.criteria : "Meets functional criteria and automated tests"],
          due_on: dueDate,
        },
      ],
    });

    if (!projRes.data) {
      return { projectId: "", error: projRes.error || "Project creation failed" };
    }

    const projectId = projRes.data.id;

    // Create terms version
    const feeNum = parseFloat(brief.fee.replace(/[^0-9.]/g, "")) || 100;
    const termsRes = await api.createTermsVersion(projectId, {
      compensation_type: "paid_fixed",
      currency: "GHS",
      fee_amount: feeNum > 0 ? feeNum : 100,
      payment_terms: brief.paymentTerms?.trim()?.length >= 10 ? brief.paymentTerms : "Payment released upon approved completion of all milestones.",
      ip_ownership_terms: brief.ipTerms?.trim()?.length >= 10 ? brief.ipTerms : "Organization retains ownership of project deliverables and IP.",
      confidentiality_terms: brief.privacyTerms?.trim()?.length >= 10 ? brief.privacyTerms : "Standard confidentiality and private-by-default evidence protections apply.",
      mentor_plan: brief.mentorPlan?.trim()?.length >= 10 ? brief.mentorPlan : "Weekly mentorship check-ins and independent rubric evaluation.",
    });

    if (submit && termsRes.data) {
      await api.submitProjectReview(projectId, termsRes.data.id, projRes.data.row_version);
    }

    return { projectId };
  } catch (e) {
    return { projectId: "", error: e instanceof Error ? e.message : "Sync error" };
  }
}
