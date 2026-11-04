"use client";

import { createContext, useContext, useCallback } from "react";
import { getAuthenticatedApiClient, getApiClient } from "./client";
import type {
  OrganizationRead,
  OrganizationCreate,
  ProjectRead,
  ProjectCreate,
  TermsRead,
  TermsCreate,
  ApplicationRead,
  ApplicationCreate,
  OfferRead,
  ParticipationRead,
  MentorProfileRead,
  MentorProfileWrite,
  AssignmentRead,
  SubmissionRead,
  ArtifactRead,
  MentorReviewView,
  OrganizationReviewRead,
  ProjectReviewItem,
  UserSelf,
  ApplicationDetail, OfferDetail, ParticipationDetail, SubmissionPatch, AssignmentAccept,
} from "@experiencebridge/api-client";

function generateKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `key-${Math.random().toString(36).slice(2, 11)}-${Date.now()}`;
}

export interface ApiResult<T> {
  data: T | null;
  error: string | null;
  status: number;
}

export interface StudentSelfReportedSkillDTO {
  id: string;
  name: string;
  category: string;
  proficiency: "beginner" | "intermediate" | "advanced";
  notes?: string | null;
}

export interface StudentProfileProjectDTO {
  id: string;
  title: string;
  summary: string;
  role: string;
  link_url?: string | null;
}

export interface StudentProfileUpsertInput {
  display_name: string;
  headline: string;
  bio: string;
  institution: string;
  program_of_study: string;
  graduation_year: number;
  weekly_hours_available: number;
  preferred_domains: string[];
  portfolio_url?: string | null;
  github_url?: string | null;
  linkedin_url?: string | null;
  self_reported_skills: StudentSelfReportedSkillDTO[];
  top_projects: StudentProfileProjectDTO[];
}

export interface StudentProfileDTO extends StudentProfileUpsertInput {
  user_id: string;
  identity_issuer: string;
  identity_subject: string;
  email: string | null;
  updated_at: string;
  row_version: number;
}

export interface AdminDashboardStats {
  organizations: Record<string, number>;
  projects: Record<string, number>;
  mentors: Record<string, number>;
  applications: Record<string, number>;
  participations: Record<string, number>;
  users: Record<string, number>;
  total_audit_events: number;
}

export interface AdminAuditLogItem {
  id: string;
  actor_user_id: string;
  actor_email?: string | null;
  actor_name?: string | null;
  event_type: string;
  entity_id: string;
  request_id: string;
  details: Record<string, unknown>;
  created_at: string;
  row_version: number;
}

export interface AdminUserOversightItem {
  id: string;
  email?: string | null;
  display_name: string;
  roles: string[];
  created_at: string;
}

export interface AdminApplicationOversightItem {
  id: string;
  project_id: string;
  project_title?: string | null;
  student_user_id: string;
  student_email?: string | null;
  student_name?: string | null;
  status: string;
  weekly_minutes_available: number;
  created_at: string;
  row_version: number;
}

export interface AdminParticipationOversightItem {
  id: string;
  project_id: string;
  project_title?: string | null;
  student_user_id: string;
  student_email?: string | null;
  student_name?: string | null;
  status: string;
  started_at?: string | null;
  created_at: string;
  row_version: number;
}

function apiError(payload: unknown, fallback: string): string {
  if (payload && typeof payload === "object" && "error" in payload) {
    const detail = (payload as { error?: { message?: unknown; field_errors?: unknown } }).error;
    if (typeof detail?.message === "string") {
      const fields = detail.field_errors;
      const explanations = fields && typeof fields === "object" && !Array.isArray(fields)
        ? Object.entries(fields).flatMap(([field, messages]) => Array.isArray(messages)
          ? messages.filter((message): message is string => typeof message === "string").map(message => `${field}: ${message}`) : []) : [];
      return `${fallback}: ${detail.message}${explanations.length ? ` ${explanations.join("; ")}` : ""}`;
    }
  }
  return fallback;
}

export function createPortalApi(token?: string | null) {
  const client = token ? getAuthenticatedApiClient(token) : getApiClient();

  function headers(rowVersion?: number): Record<string, string> {
    const h: Record<string, string> = {
      "Idempotency-Key": generateKey(),
    };
    if (typeof rowVersion === "number") {
      h["If-Match"] = `"${rowVersion}"`;
    }
    return h;
  }

  return {
    async getMentorProfilesForAdmin(): Promise<ApiResult<MentorProfileRead[]>> {
      try {
        const res = await client.GET("/api/v1/admin/mentors", { cache: "no-store" });
        if (!res.response.ok || !res.data) return { data: null, error: apiError(res.error, `Load failed (${res.response.status})`), status: res.response.status };
        return { data: res.data.items, error: null, status: res.response.status };
      } catch (e) { return { data: null, error: e instanceof Error ? e.message : "Network error", status: 0 }; }
    },
    async getOrganizationMentors(orgId: string): Promise<ApiResult<MentorProfileRead[]>> {
      try {
        const res = await client.GET("/api/v1/organizations/{org_id}/mentors", { cache: "no-store", params: { path: { org_id: orgId } } });
        if (!res.response.ok || !res.data) return { data: null, error: apiError(res.error, `Load failed (${res.response.status})`), status: res.response.status };
        return { data: res.data.items, error: null, status: res.response.status };
      } catch (e) { return { data: null, error: e instanceof Error ? e.message : "Network error", status: 0 }; }
    },
    async getParticipationAssignments(participationId: string): Promise<ApiResult<AssignmentRead[]>> {
      try {
        const res = await client.GET("/api/v1/participations/{participation_id}/mentor-assignments", { cache: "no-store", params: { path: { participation_id: participationId } } });
        if (!res.response.ok || !res.data) return { data: null, error: apiError(res.error, `Load failed (${res.response.status})`), status: res.response.status };
        return { data: res.data.items, error: null, status: res.response.status };
      } catch (e) { return { data: null, error: e instanceof Error ? e.message : "Network error", status: 0 }; }
    },
    async endMentorAssignment(assignmentId: string, rowVersion: number, explanation: string): Promise<ApiResult<AssignmentRead>> {
      try {
        const res = await client.POST("/api/v1/mentor-assignments/{assignment_id}/end", { params: { path: { assignment_id: assignmentId } }, body: { explanation }, headers: headers(rowVersion) });
        if (!res.response.ok || !res.data) return { data: null, error: apiError(res.error, `Action failed (${res.response.status})`), status: res.response.status };
        return { data: res.data, error: null, status: res.response.status };
      } catch (e) { return { data: null, error: e instanceof Error ? e.message : "Network error", status: 0 }; }
    },
    async withdrawParticipation(participationId: string, rowVersion: number, explanation: string): Promise<ApiResult<ParticipationRead>> {
      try {
        const res = await client.POST("/api/v1/participations/{participation_id}/withdraw", { params: { path: { participation_id: participationId } }, body: { explanation }, headers: headers(rowVersion) });
        if (!res.response.ok || !res.data) return { data: null, error: apiError(res.error, `Action failed (${res.response.status})`), status: res.response.status };
        return { data: res.data, error: null, status: res.response.status };
      } catch (e) { return { data: null, error: e instanceof Error ? e.message : "Network error", status: 0 }; }
    },
    async revokeOffer(offerId: string, rowVersion: number, explanation: string): Promise<ApiResult<OfferRead>> {
      try {
        const res = await client.POST("/api/v1/offers/{offer_id}/revoke", { params: { path: { offer_id: offerId } }, body: { explanation }, headers: headers(rowVersion) });
        if (!res.response.ok || !res.data) return { data: null, error: apiError(res.error, `Action failed (${res.response.status})`), status: res.response.status };
        return { data: res.data, error: null, status: res.response.status };
      } catch (e) { return { data: null, error: e instanceof Error ? e.message : "Network error", status: 0 }; }
    },
    async getApplication(applicationId: string): Promise<ApiResult<ApplicationDetail>> {
      try {
        const res = await client.GET("/api/v1/applications/{application_id}", { params: { path: { application_id: applicationId } } });
        if (!res.response.ok || !res.data) return { data: null, error: apiError(res.error, `Request failed (${res.response.status})`), status: res.response.status };
        return { data: res.data, error: null, status: res.response.status };
      } catch (e) { return { data: null, error: e instanceof Error ? e.message : "Network error", status: 0 }; }
    },
    async getOffer(offerId: string): Promise<ApiResult<OfferDetail>> {
      try {
        const res = await client.GET("/api/v1/offers/{offer_id}", { params: { path: { offer_id: offerId } } });
        if (!res.response.ok || !res.data) return { data: null, error: apiError(res.error, `Request failed (${res.response.status})`), status: res.response.status };
        return { data: res.data, error: null, status: res.response.status };
      } catch (e) { return { data: null, error: e instanceof Error ? e.message : "Network error", status: 0 }; }
    },
    async getParticipation(participationId: string): Promise<ApiResult<ParticipationDetail>> {
      try {
        const res = await client.GET("/api/v1/participations/{participation_id}", { params: { path: { participation_id: participationId } } });
        if (!res.response.ok || !res.data) return { data: null, error: apiError(res.error, `Request failed (${res.response.status})`), status: res.response.status };
        return { data: res.data, error: null, status: res.response.status };
      } catch (e) { return { data: null, error: e instanceof Error ? e.message : "Network error", status: 0 }; }
    },
    async getMentorAssignment(assignmentId: string): Promise<ApiResult<AssignmentRead>> {
      try {
        const res = await client.GET("/api/v1/mentor-assignments/{assignment_id}", { params: { path: { assignment_id: assignmentId } } });
        if (!res.response.ok || !res.data) return { data: null, error: apiError(res.error, `Request failed (${res.response.status})`), status: res.response.status };
        return { data: res.data, error: null, status: res.response.status };
      } catch (e) { return { data: null, error: e instanceof Error ? e.message : "Network error", status: 0 }; }
    },
    async getSubmission(submissionId: string): Promise<ApiResult<SubmissionRead>> {
      try {
        const res = await client.GET("/api/v1/submissions/{submission_id}", { params: { path: { submission_id: submissionId } } });
        if (!res.response.ok || !res.data) return { data: null, error: apiError(res.error, `Request failed (${res.response.status})`), status: res.response.status };
        return { data: res.data, error: null, status: res.response.status };
      } catch (e) { return { data: null, error: e instanceof Error ? e.message : "Network error", status: 0 }; }
    },
    async getSubmissions(participationId: string): Promise<ApiResult<SubmissionRead[]>> {
      try {
        const res = await client.GET("/api/v1/participations/{participation_id}/submissions", { params: { path: { participation_id: participationId } } });
        if (!res.response.ok || !res.data) return { data: null, error: apiError(res.error, `Request failed (${res.response.status})`), status: res.response.status };
        return { data: res.data.items, error: null, status: res.response.status };
      } catch (e) { return { data: null, error: e instanceof Error ? e.message : "Network error", status: 0 }; }
    },
    async getMentorReviews(submissionId: string): Promise<ApiResult<MentorReviewView[]>> {
      try {
        const res = await client.GET("/api/v1/submissions/{submission_id}/mentor-reviews", { params: { path: { submission_id: submissionId } } });
        if (!res.response.ok || !res.data) return { data: null, error: apiError(res.error, `Request failed (${res.response.status})`), status: res.response.status };
        return { data: res.data.items, error: null, status: res.response.status };
      } catch (e) { return { data: null, error: e instanceof Error ? e.message : "Network error", status: 0 }; }
    },
    async getOrganizationReviews(submissionId: string): Promise<ApiResult<OrganizationReviewRead[]>> {
      try {
        const res = await client.GET("/api/v1/submissions/{submission_id}/organization-reviews", { params: { path: { submission_id: submissionId } } });
        if (!res.response.ok || !res.data) return { data: null, error: apiError(res.error, `Request failed (${res.response.status})`), status: res.response.status };
        return { data: res.data.items, error: null, status: res.response.status };
      } catch (e) { return { data: null, error: e instanceof Error ? e.message : "Network error", status: 0 }; }
    },
    async updateSubmission(submissionId: string, body: SubmissionPatch, rowVersion: number): Promise<ApiResult<SubmissionRead>> {
      try {
        const res = await client.PATCH("/api/v1/submissions/{submission_id}", { params: { path: { submission_id: submissionId } }, body, headers: headers(rowVersion) });
        if (!res.response.ok || !res.data) return { data: null, error: apiError(res.error, `Update failed (${res.response.status})`), status: res.response.status };
        return { data: res.data, error: null, status: res.response.status };
      } catch (e) { return { data: null, error: e instanceof Error ? e.message : "Network error", status: 0 }; }
    },

    // Identity
    async getMe(): Promise<ApiResult<UserSelf>> {
      try {
        const res = await client.GET("/api/v1/me");
        if (!res.response.ok || !res.data) {
          return { data: null, error: apiError(res.error, `Failed to fetch profile (${res.response.status})`), status: res.response.status };
        }
        return { data: res.data as UserSelf, error: null, status: res.response.status };
      } catch (e) {
        return { data: null, error: e instanceof Error ? e.message : "Network error", status: 0 };
      }
    },

    async getStudentProfile(): Promise<ApiResult<StudentProfileDTO>> {
      try {
        const rawClient = client as unknown as {
          GET: (path: string, init?: Record<string, unknown>) => Promise<{ response: Response; data?: unknown; error?: unknown }>;
        };
        const res = await rawClient.GET("/api/v1/me/student-profile", { cache: "no-store" });
        if (!res.response.ok || !res.data) {
          return { data: null, error: apiError(res.error, `Failed to fetch student profile (${res.response.status})`), status: res.response.status };
        }
        return { data: res.data as StudentProfileDTO, error: null, status: res.response.status };
      } catch (e) {
        return { data: null, error: e instanceof Error ? e.message : "Network error", status: 0 };
      }
    },

    async upsertStudentProfile(body: StudentProfileUpsertInput, rowVersion?: number): Promise<ApiResult<StudentProfileDTO>> {
      try {
        const rawClient = client as unknown as {
          PUT: (path: string, init?: Record<string, unknown>) => Promise<{ response: Response; data?: unknown; error?: unknown }>;
        };
        const res = await rawClient.PUT("/api/v1/me/student-profile", {
          body,
          headers: headers(rowVersion),
        });
        if (!res.response.ok || !res.data) {
          return { data: null, error: apiError(res.error, `Save student profile failed (${res.response.status})`), status: res.response.status };
        }
        return { data: res.data as StudentProfileDTO, error: null, status: res.response.status };
      } catch (e) {
        return { data: null, error: e instanceof Error ? e.message : "Network error", status: 0 };
      }
    },

    // Organizations
    async getMyOrganizations(): Promise<ApiResult<OrganizationRead[]>> {
      try {
        const res = await client.GET("/api/v1/me/organizations");
        if (!res.response.ok || !res.data) {
          return { data: null, error: apiError(res.error, `Failed to fetch organizations (${res.response.status})`), status: res.response.status };
        }
        const items = (res.data as { items: OrganizationRead[] }).items ?? [];
        return { data: items, error: null, status: res.response.status };
      } catch (e) {
        return { data: null, error: e instanceof Error ? e.message : "Network error", status: 0 };
      }
    },

    async createOrganization(body: OrganizationCreate): Promise<ApiResult<OrganizationRead>> {
      try {
        const res = await client.POST("/api/v1/organizations", {
          body,
          headers: headers(),
        });
        if (!res.response.ok || !res.data) {
          return { data: null, error: apiError(res.error, `Failed to create organization (${res.response.status})`), status: res.response.status };
        }
        return { data: res.data as OrganizationRead, error: null, status: res.response.status };
      } catch (e) {
        return { data: null, error: e instanceof Error ? e.message : "Network error", status: 0 };
      }
    },

    async submitOrganizationVerification(orgId: string, rowVersion: number): Promise<ApiResult<OrganizationRead>> {
      try {
        const res = await client.POST("/api/v1/organizations/{org_id}/submit-verification", {
          params: { path: { org_id: orgId } },
          body: {},
          headers: headers(rowVersion),
        });
        if (!res.response.ok || !res.data) {
          return { data: null, error: apiError(res.error, `Verification submit failed (${res.response.status})`), status: res.response.status };
        }
        return { data: res.data as OrganizationRead, error: null, status: res.response.status };
      } catch (e) {
        return { data: null, error: e instanceof Error ? e.message : "Network error", status: 0 };
      }
    },

    // Projects
    async getPublishedProjects(): Promise<ApiResult<ProjectRead[]>> {
      try {
        const items = new Map<string, ProjectRead>();
        let offset = 0;
        while (true) {
          const res = await client.GET("/api/v1/projects", { params: { query: { limit: 100, offset } }, cache: "no-store" });
          if (!res.response.ok || !res.data) {
            return { data: null, error: apiError(res.error, `Failed to fetch projects (${res.response.status})`), status: res.response.status };
          }
          for (const project of res.data.items) items.set(project.id, project);
          const next = res.data.next_offset;
          if (next == null) return { data: [...items.values()], error: null, status: res.response.status };
          if (next <= offset) throw new Error("The project list returned an invalid next page. Refresh to retry.");
          offset = next;
        }
      } catch (e) {
        return { data: null, error: e instanceof Error ? e.message : "Network error", status: 0 };
      }
    },

    async getProject(projectId: string): Promise<ApiResult<ProjectRead>> {
      try {
        const res = await client.GET("/api/v1/projects/{project_id}", {
          params: { path: { project_id: projectId } },
        });
        if (!res.response.ok || !res.data) {
          return { data: null, error: apiError(res.error, `Failed to fetch project (${res.response.status})`), status: res.response.status };
        }
        return { data: res.data as ProjectRead, error: null, status: res.response.status };
      } catch (e) {
        return { data: null, error: e instanceof Error ? e.message : "Network error", status: 0 };
      }
    },

    async getOrganizationProjects(orgId: string): Promise<ApiResult<ProjectRead[]>> {
      try {
        const res = await client.GET("/api/v1/organizations/{org_id}/projects", {
          params: { path: { org_id: orgId } },
        });
        if (!res.response.ok || !res.data) {
          return { data: null, error: apiError(res.error, `Failed to fetch org projects (${res.response.status})`), status: res.response.status };
        }
        const items = (res.data as { items: ProjectRead[] }).items ?? [];
        return { data: items, error: null, status: res.response.status };
      } catch (e) {
        return { data: null, error: e instanceof Error ? e.message : "Network error", status: 0 };
      }
    },

    async createProject(orgId: string, body: ProjectCreate, rowVersion: number): Promise<ApiResult<ProjectRead>> {
      try {
        const res = await client.POST("/api/v1/organizations/{org_id}/projects", {
          params: { path: { org_id: orgId } },
          body,
          headers: headers(rowVersion),
        });
        if (!res.response.ok || !res.data) {
          return { data: null, error: apiError(res.error, `Failed to create project (${res.response.status})`), status: res.response.status };
        }
        return { data: res.data as ProjectRead, error: null, status: res.response.status };
      } catch (e) {
        return { data: null, error: e instanceof Error ? e.message : "Network error", status: 0 };
      }
    },

    async updateProject(projectId: string, body: ProjectCreate, rowVersion: number): Promise<ApiResult<ProjectRead>> {
      const res = await client.PATCH("/api/v1/projects/{project_id}", {
        params: { path: { project_id: projectId } }, body, headers: headers(rowVersion),
      });
      return { data: res.data ?? null, error: res.response.ok ? null : `Draft update failed (${res.response.status})`, status: res.response.status };
    },

    async createTermsVersion(projectId: string, body: TermsCreate, rowVersion: number): Promise<ApiResult<TermsRead>> {
      try {
        const res = await client.POST("/api/v1/projects/{project_id}/terms-versions", {
          params: { path: { project_id: projectId } },
          body,
          headers: headers(rowVersion),
        });
        if (!res.response.ok || !res.data) {
          return { data: null, error: apiError(res.error, `Failed to create terms (${res.response.status})`), status: res.response.status };
        }
        return { data: res.data as TermsRead, error: null, status: res.response.status };
      } catch (e) {
        return { data: null, error: e instanceof Error ? e.message : "Network error", status: 0 };
      }
    },

    async getTermsVersion(projectId: string, versionId: string): Promise<ApiResult<TermsRead>> {
      try {
        const res = await client.GET("/api/v1/projects/{project_id}/terms-versions/{version_id}", {
          params: { path: { project_id: projectId, version_id: versionId } },
        });
        if (!res.response.ok || !res.data) {
          return { data: null, error: apiError(res.error, `Failed to fetch terms version (${res.response.status})`), status: res.response.status };
        }
        return { data: res.data as TermsRead, error: null, status: res.response.status };
      } catch (e) {
        return { data: null, error: e instanceof Error ? e.message : "Network error", status: 0 };
      }
    },

    async submitProjectReview(projectId: string, termsVersionId: string, rowVersion: number): Promise<ApiResult<ProjectRead>> {
      try {
        const res = await client.POST("/api/v1/projects/{project_id}/submit-review", {
          params: { path: { project_id: projectId } },
          body: { terms_version_id: termsVersionId },
          headers: headers(rowVersion),
        });
        if (!res.response.ok || !res.data) {
          return { data: null, error: apiError(res.error, `Failed to submit review (${res.response.status})`), status: res.response.status };
        }
        return { data: res.data as ProjectRead, error: null, status: res.response.status };
      } catch (e) {
        return { data: null, error: e instanceof Error ? e.message : "Network error", status: 0 };
      }
    },

    async startProject(projectId: string, rowVersion: number): Promise<ApiResult<ProjectRead>> {
      try {
        const res = await client.POST("/api/v1/projects/{project_id}/start", {
          params: { path: { project_id: projectId } },
          body: {},
          headers: headers(rowVersion),
        });
        if (!res.response.ok || !res.data) {
          return { data: null, error: apiError(res.error, `Failed to start project (${res.response.status})`), status: res.response.status };
        }
        return { data: res.data as ProjectRead, error: null, status: res.response.status };
      } catch (e) {
        return { data: null, error: e instanceof Error ? e.message : "Network error", status: 0 };
      }
    },

    async completeProject(projectId: string, explanation: string, rowVersion: number): Promise<ApiResult<ProjectRead>> {
      try {
        const res = await client.POST("/api/v1/projects/{project_id}/complete", {
          params: { path: { project_id: projectId } },
          body: { explanation },
          headers: headers(rowVersion),
        });
        if (!res.response.ok || !res.data) {
          return { data: null, error: apiError(res.error, `Failed to complete project (${res.response.status})`), status: res.response.status };
        }
        return { data: res.data as ProjectRead, error: null, status: res.response.status };
      } catch (e) {
        return { data: null, error: e instanceof Error ? e.message : "Network error", status: 0 };
      }
    },

    // Applications & Offers
    async getMyApplications(): Promise<ApiResult<ApplicationRead[]>> {
      try {
        const res = await client.GET("/api/v1/me/applications");
        if (!res.response.ok || !res.data) {
          return { data: null, error: apiError(res.error, `Failed to fetch applications (${res.response.status})`), status: res.response.status };
        }
        const items = (res.data as { items: ApplicationRead[] }).items ?? [];
        return { data: items, error: null, status: res.response.status };
      } catch (e) {
        return { data: null, error: e instanceof Error ? e.message : "Network error", status: 0 };
      }
    },

    async getProjectApplications(projectId: string): Promise<ApiResult<ApplicationRead[]>> {
      try {
        const res = await client.GET("/api/v1/projects/{project_id}/applications", {
          params: { path: { project_id: projectId } },
        });
        if (!res.response.ok || !res.data) {
          return { data: null, error: apiError(res.error, `Failed to fetch project applications (${res.response.status})`), status: res.response.status };
        }
        const items = (res.data as { items: ApplicationRead[] }).items ?? [];
        return { data: items, error: null, status: res.response.status };
      } catch (e) {
        return { data: null, error: e instanceof Error ? e.message : "Network error", status: 0 };
      }
    },

    async submitApplication(projectId: string, body: ApplicationCreate, rowVersion: number): Promise<ApiResult<ApplicationRead>> {
      try {
        const res = await client.POST("/api/v1/projects/{project_id}/applications", {
          params: { path: { project_id: projectId } },
          body,
          headers: headers(rowVersion),
        });
        if (!res.response.ok || !res.data) {
          return { data: null, error: apiError(res.error, `Application failed (${res.response.status})`), status: res.response.status };
        }
        return { data: res.data as ApplicationRead, error: null, status: res.response.status };
      } catch (e) {
        return { data: null, error: e instanceof Error ? e.message : "Network error", status: 0 };
      }
    },

    async shortlistApplication(applicationId: string, rowVersion: number): Promise<ApiResult<ApplicationRead>> {
      try {
        const res = await client.POST("/api/v1/applications/{application_id}/shortlist", {
          params: { path: { application_id: applicationId } },
          body: {},
          headers: headers(rowVersion),
        });
        if (!res.response.ok || !res.data) {
          return { data: null, error: apiError(res.error, `Shortlist failed (${res.response.status})`), status: res.response.status };
        }
        return { data: res.data as ApplicationRead, error: null, status: res.response.status };
      } catch (e) {
        return { data: null, error: e instanceof Error ? e.message : "Network error", status: 0 };
      }
    },

    async rejectApplication(applicationId: string, rowVersion: number, explanation: string): Promise<ApiResult<ApplicationRead>> {
      try {
        const res = await client.POST("/api/v1/applications/{application_id}/reject", {
          params: { path: { application_id: applicationId } },
          body: { explanation },
          headers: headers(rowVersion),
        });
        if (!res.response.ok || !res.data) {
          return { data: null, error: apiError(res.error, `Decline failed (${res.response.status})`), status: res.response.status };
        }
        return { data: res.data as ApplicationRead, error: null, status: res.response.status };
      } catch (e) {
        return { data: null, error: e instanceof Error ? e.message : "Network error", status: 0 };
      }
    },

    async withdrawApplication(applicationId: string, rowVersion: number, explanation: string): Promise<ApiResult<ApplicationRead>> {
      try {
        const res = await client.POST("/api/v1/applications/{application_id}/withdraw", {
          params: { path: { application_id: applicationId } },
          body: { explanation },
          headers: headers(rowVersion),
        });
        if (!res.response.ok || !res.data) {
          return { data: null, error: apiError(res.error, `Withdraw failed (${res.response.status})`), status: res.response.status };
        }
        return { data: res.data as ApplicationRead, error: null, status: res.response.status };
      } catch (e) {
        return { data: null, error: e instanceof Error ? e.message : "Network error", status: 0 };
      }
    },

    async issueOffer(applicationId: string, termsVersionId: string, expiresAt: string, rowVersion: number): Promise<ApiResult<OfferRead>> {
      try {
        const res = await client.POST("/api/v1/applications/{application_id}/offer", {
          params: { path: { application_id: applicationId } },
          body: { terms_version_id: termsVersionId, expires_at: expiresAt },
          headers: headers(rowVersion),
        });
        if (!res.response.ok || !res.data) {
          return { data: null, error: apiError(res.error, `Offer failed (${res.response.status})`), status: res.response.status };
        }
        return { data: res.data as OfferRead, error: null, status: res.response.status };
      } catch (e) {
        return { data: null, error: e instanceof Error ? e.message : "Network error", status: 0 };
      }
    },

    async getMyOffers(): Promise<ApiResult<OfferRead[]>> {
      try {
        const res = await client.GET("/api/v1/me/offers");
        if (!res.response.ok || !res.data) {
          return { data: null, error: apiError(res.error, `Failed to fetch offers (${res.response.status})`), status: res.response.status };
        }
        const items = (res.data as { items: OfferRead[] }).items ?? [];
        return { data: items, error: null, status: res.response.status };
      } catch (e) {
        return { data: null, error: e instanceof Error ? e.message : "Network error", status: 0 };
      }
    },

    async acceptOffer(offerId: string, rowVersion: number, termsVersionId: string, termsHash: string): Promise<ApiResult<ParticipationRead>> {
      try {
        const res = await client.POST("/api/v1/offers/{offer_id}/accept", {
          params: { path: { offer_id: offerId } },
          body: {
            terms_version_id: termsVersionId,
            terms_hash: termsHash,
            consent_statement_version: "supervisor-v1",
            explicitly_accepted: true,
          },
          headers: headers(rowVersion),
        });
        if (!res.response.ok || !res.data) {
          return { data: null, error: apiError(res.error, `Accept offer failed (${res.response.status})`), status: res.response.status };
        }
        return { data: res.data as ParticipationRead, error: null, status: res.response.status };
      } catch (e) {
        return { data: null, error: e instanceof Error ? e.message : "Network error", status: 0 };
      }
    },

    async declineOffer(offerId: string, rowVersion: number, explanation?: string): Promise<ApiResult<OfferRead>> {
      try {
        const res = await client.POST("/api/v1/offers/{offer_id}/decline", {
          params: { path: { offer_id: offerId } },
          body: { explanation: explanation || undefined },
          headers: headers(rowVersion),
        });
        if (!res.response.ok || !res.data) {
          return { data: null, error: apiError(res.error, `Decline offer failed (${res.response.status})`), status: res.response.status };
        }
        return { data: res.data as OfferRead, error: null, status: res.response.status };
      } catch (e) {
        return { data: null, error: e instanceof Error ? e.message : "Network error", status: 0 };
      }
    },

    // Participations
    async getMyParticipations(): Promise<ApiResult<ParticipationRead[]>> {
      try {
        const res = await client.GET("/api/v1/me/participations");
        if (!res.response.ok || !res.data) {
          return { data: null, error: apiError(res.error, `Failed to fetch participations (${res.response.status})`), status: res.response.status };
        }
        const items = (res.data as { items: ParticipationRead[] }).items ?? [];
        return { data: items, error: null, status: res.response.status };
      } catch (e) {
        return { data: null, error: e instanceof Error ? e.message : "Network error", status: 0 };
      }
    },

    async getProjectParticipations(projectId: string): Promise<ApiResult<ParticipationRead[]>> {
      try {
        const res = await client.GET("/api/v1/projects/{project_id}/participations", {
          params: { path: { project_id: projectId } },
        });
        if (!res.response.ok || !res.data) {
          return { data: null, error: apiError(res.error, `Failed to fetch participations (${res.response.status})`), status: res.response.status };
        }
        const items = (res.data as { items: ParticipationRead[] }).items ?? [];
        return { data: items, error: null, status: res.response.status };
      } catch (e) {
        return { data: null, error: e instanceof Error ? e.message : "Network error", status: 0 };
      }
    },

    async markParticipationReady(participationId: string, rowVersion: number, explanation: string, requestedOutcome: "completed" | "partially_completed" = "completed"): Promise<ApiResult<ParticipationRead>> {
      try {
        const res = await client.POST("/api/v1/participations/{participation_id}/mark-ready-for-review", {
          params: { path: { participation_id: participationId } },
          body: { explanation, requested_outcome: requestedOutcome },
          headers: headers(rowVersion),
        });
        if (!res.response.ok || !res.data) {
          return { data: null, error: apiError(res.error, `Mark ready failed (${res.response.status})`), status: res.response.status };
        }
        return { data: res.data as ParticipationRead, error: null, status: res.response.status };
      } catch (e) {
        return { data: null, error: e instanceof Error ? e.message : "Network error", status: 0 };
      }
    },

    async finalizeParticipation(participationId: string, rowVersion: number, explanation: string, outcome: "completed" | "partially_completed" = "completed"): Promise<ApiResult<ParticipationRead>> {
      try {
        const res = await client.POST("/api/v1/participations/{participation_id}/finalize", {
          params: { path: { participation_id: participationId } },
          body: { explanation, outcome },
          headers: headers(rowVersion),
        });
        if (!res.response.ok || !res.data) {
          return { data: null, error: apiError(res.error, `Finalize failed (${res.response.status})`), status: res.response.status };
        }
        return { data: res.data as ParticipationRead, error: null, status: res.response.status };
      } catch (e) {
        return { data: null, error: e instanceof Error ? e.message : "Network error", status: 0 };
      }
    },

    // Mentorship
    async getMentorProfile(): Promise<ApiResult<MentorProfileRead>> {
      try {
        const res = await client.GET("/api/v1/me/mentor-profile");
        if (!res.response.ok || !res.data) {
          return { data: null, error: apiError(res.error, `Failed to fetch mentor profile (${res.response.status})`), status: res.response.status };
        }
        return { data: res.data as MentorProfileRead, error: null, status: res.response.status };
      } catch (e) {
        return { data: null, error: e instanceof Error ? e.message : "Network error", status: 0 };
      }
    },
    async upsertMentorProfile(body: MentorProfileWrite, rowVersion?: number): Promise<ApiResult<MentorProfileRead>> {
      try {
        const res = await client.PUT("/api/v1/me/mentor-profile", {
          body,
          headers: headers(rowVersion),
        });
        if (!res.response.ok || !res.data) {
          return { data: null, error: apiError(res.error, `Save mentor profile failed (${res.response.status})`), status: res.response.status };
        }
        return { data: res.data as MentorProfileRead, error: null, status: res.response.status };
      } catch (e) {
        return { data: null, error: e instanceof Error ? e.message : "Network error", status: 0 };
      }
    },
    async inviteMentor(participationId: string, mentorUserId: string, context: string, expiresAt: string, rowVersion: number): Promise<ApiResult<AssignmentRead>> {
      try {
        const res = await client.POST("/api/v1/participations/{participation_id}/mentor-assignments", {
          params: { path: { participation_id: participationId } },
          body: { mentor_user_id: mentorUserId, context, expires_at: expiresAt },
          headers: headers(rowVersion),
        });
        if (!res.response.ok || !res.data) {
          return { data: null, error: apiError(res.error, `Mentor invitation failed (${res.response.status})`), status: res.response.status };
        }
        return { data: res.data as AssignmentRead, error: null, status: res.response.status };
      } catch (e) {
        return { data: null, error: e instanceof Error ? e.message : "Network error", status: 0 };
      }
    },

    async getMyMentorAssignments(): Promise<ApiResult<AssignmentRead[]>> {
      try {
        const res = await client.GET("/api/v1/me/mentor-assignments");
        if (!res.response.ok || !res.data) {
          return { data: null, error: apiError(res.error, `Failed to fetch mentor assignments (${res.response.status})`), status: res.response.status };
        }
        const items = (res.data as { items: AssignmentRead[] }).items ?? [];
        return { data: items, error: null, status: res.response.status };
      } catch (e) {
        return { data: null, error: e instanceof Error ? e.message : "Network error", status: 0 };
      }
    },

    async acceptMentorAssignment(assignmentId: string, rowVersion: number, declaration: AssignmentAccept): Promise<ApiResult<AssignmentRead>> {
      try {
        const res = await client.POST("/api/v1/mentor-assignments/{assignment_id}/accept", {
          params: { path: { assignment_id: assignmentId } },
          body: declaration,
          headers: headers(rowVersion),
        });
        if (!res.response.ok || !res.data) {
          return { data: null, error: apiError(res.error, `Accept assignment failed (${res.response.status})`), status: res.response.status };
        }
        return { data: res.data as AssignmentRead, error: null, status: res.response.status };
      } catch (e) {
        return { data: null, error: e instanceof Error ? e.message : "Network error", status: 0 };
      }
    },

    async declineMentorAssignment(assignmentId: string, rowVersion: number, explanation: string): Promise<ApiResult<AssignmentRead>> {
      try {
        const res = await client.POST("/api/v1/mentor-assignments/{assignment_id}/decline", {
          params: { path: { assignment_id: assignmentId } },
          body: { explanation },
          headers: headers(rowVersion),
        });
        if (!res.response.ok || !res.data) {
          return { data: null, error: apiError(res.error, `Decline assignment failed (${res.response.status})`), status: res.response.status };
        }
        return { data: res.data as AssignmentRead, error: null, status: res.response.status };
      } catch (e) {
        return { data: null, error: e instanceof Error ? e.message : "Network error", status: 0 };
      }
    },

    // Submissions & Reviews
    async deleteArtifact(submissionId: string, artifactId: string): Promise<ApiResult<{ deleted: true }>> {
      try {
        const res = await client.DELETE("/api/v1/submissions/{submission_id}/external-artifacts/{artifact_id}", {
          params: { path: { submission_id: submissionId, artifact_id: artifactId } },
        });
        if (!res.response.ok) return { data: null, error: apiError(res.error, `Remove evidence failed (${res.response.status})`), status: res.response.status };
        return { data: { deleted: true }, error: null, status: res.response.status };
      } catch (e) { return { data: null, error: e instanceof Error ? e.message : "Network error", status: 0 }; }
    },

    async createSubmission(participationId: string, rowVersion: number, milestoneIndex: number, summary: string, contributionStatement: string): Promise<ApiResult<SubmissionRead>> {
      try {
        const res = await client.POST("/api/v1/participations/{participation_id}/submissions", {
          params: { path: { participation_id: participationId } },
          body: { milestone_index: milestoneIndex, summary, contribution_statement: contributionStatement },
          headers: headers(rowVersion),
        });
        if (!res.response.ok || !res.data) {
          return { data: null, error: apiError(res.error, `Create submission failed (${res.response.status})`), status: res.response.status };
        }
        return { data: res.data as SubmissionRead, error: null, status: res.response.status };
      } catch (e) {
        return { data: null, error: e instanceof Error ? e.message : "Network error", status: 0 };
      }
    },

    async attachArtifact(submissionId: string, label: string, url: string): Promise<ApiResult<ArtifactRead>> {
      try {
        const res = await client.POST("/api/v1/submissions/{submission_id}/external-artifacts", {
          params: { path: { submission_id: submissionId } },
          body: { kind: "external_url", label, url },
          headers: headers(),
        });
        if (!res.response.ok || !res.data) {
          return { data: null, error: apiError(res.error, `Attach artifact failed (${res.response.status})`), status: res.response.status };
        }
        return { data: res.data as ArtifactRead, error: null, status: res.response.status };
      } catch (e) {
        return { data: null, error: e instanceof Error ? e.message : "Network error", status: 0 };
      }
    },

    async submitDeliverable(submissionId: string, rowVersion: number): Promise<ApiResult<SubmissionRead>> {
      try {
        const res = await client.POST("/api/v1/submissions/{submission_id}/submit", {
          params: { path: { submission_id: submissionId } },
          body: {},
          headers: headers(rowVersion),
        });
        if (!res.response.ok || !res.data) {
          return { data: null, error: apiError(res.error, `Submit deliverable failed (${res.response.status})`), status: res.response.status };
        }
        return { data: res.data as SubmissionRead, error: null, status: res.response.status };
      } catch (e) {
        return { data: null, error: e instanceof Error ? e.message : "Network error", status: 0 };
      }
    },

    async submitMentorReview(submissionId: string, rowVersion: number, decision: "reviewed" | "revision_requested" | "unable_to_assess", participantFeedback: string, observations?: { criterion_text: string; observation: string; score?: number | null }[], managerSummary?: string): Promise<ApiResult<MentorReviewView>> {
      try {
        const res = await client.POST("/api/v1/submissions/{submission_id}/mentor-reviews", {
          params: { path: { submission_id: submissionId } },
          body: {
            decision,
            participant_feedback: participantFeedback,
            observations,
            manager_summary: managerSummary ?? null,
          },
          headers: headers(rowVersion),
        });
        if (!res.response.ok || !res.data) {
          return { data: null, error: apiError(res.error, `Mentor review failed (${res.response.status})`), status: res.response.status };
        }
        return { data: res.data as MentorReviewView, error: null, status: res.response.status };
      } catch (e) {
        return { data: null, error: e instanceof Error ? e.message : "Network error", status: 0 };
      }
    },

    async submitOrganizationReview(submissionId: string, rowVersion: number, decision: "accepted" | "revisions_requested" | "rejected", criteriaResults: { criterion_text: string; met: boolean; explanation: string }[], explanation: string): Promise<ApiResult<OrganizationReviewRead>> {
      try {
        const res = await client.POST("/api/v1/submissions/{submission_id}/organization-reviews", {
          params: { path: { submission_id: submissionId } },
          body: { decision, criteria_results: criteriaResults, explanation },
          headers: headers(rowVersion),
        });
        if (!res.response.ok || !res.data) {
          return { data: null, error: apiError(res.error, `Organization review failed (${res.response.status})`), status: res.response.status };
        }
        return { data: res.data as OrganizationReviewRead, error: null, status: res.response.status };
      } catch (e) {
        return { data: null, error: e instanceof Error ? e.message : "Network error", status: 0 };
      }
    },

    // Admin
    async getPendingOrganizations(): Promise<ApiResult<OrganizationRead[]>> {
      try {
        const res = await client.GET("/api/v1/admin/organizations/pending");
        if (!res.response.ok || !res.data) {
          return { data: null, error: apiError(res.error, `Failed to fetch pending orgs (${res.response.status})`), status: res.response.status };
        }
        const items = (res.data as { items: OrganizationRead[] }).items ?? [];
        return { data: items, error: null, status: res.response.status };
      } catch (e) {
        return { data: null, error: e instanceof Error ? e.message : "Network error", status: 0 };
      }
    },

    async decideOrganization(orgId: string, rowVersion: number, decision: "verify" | "reject" | "request_changes", explanation: string): Promise<ApiResult<OrganizationRead>> {
      try {
        const res = await client.POST("/api/v1/admin/organizations/{org_id}/decisions", {
          params: { path: { org_id: orgId } },
          body: { decision, explanation },
          headers: headers(rowVersion),
        });
        if (!res.response.ok || !res.data) {
          return { data: null, error: apiError(res.error, `Org decision failed (${res.response.status})`), status: res.response.status };
        }
        return { data: res.data as OrganizationRead, error: null, status: res.response.status };
      } catch (e) {
        return { data: null, error: e instanceof Error ? e.message : "Network error", status: 0 };
      }
    },

    async getPendingProjects(): Promise<ApiResult<ProjectReviewItem[]>> {
      try {
        const res = await client.GET("/api/v1/admin/projects/pending");
        if (!res.response.ok || !res.data) {
          return { data: null, error: apiError(res.error, `Failed to fetch pending projects (${res.response.status})`), status: res.response.status };
        }
        const items = (res.data as { items: ProjectReviewItem[] }).items ?? [];
        return { data: items, error: null, status: res.response.status };
      } catch (e) {
        return { data: null, error: e instanceof Error ? e.message : "Network error", status: 0 };
      }
    },

    async decideProject(projectId: string, rowVersion: number, decision: "approve" | "reject" | "request_changes", explanation: string, termsVersionId: string, snapshotHash: string): Promise<ApiResult<ProjectRead>> {
      try {
        const res = await client.POST("/api/v1/admin/projects/{project_id}/decisions", {
          params: { path: { project_id: projectId } },
          body: { decision, explanation, terms_version_id: termsVersionId, snapshot_hash: snapshotHash },
          headers: headers(rowVersion),
        });
        if (!res.response.ok || !res.data) {
          return { data: null, error: apiError(res.error, `Project decision failed (${res.response.status})`), status: res.response.status };
        }
        return { data: res.data as ProjectRead, error: null, status: res.response.status };
      } catch (e) {
        return { data: null, error: e instanceof Error ? e.message : "Network error", status: 0 };
      }
    },



    async decideMentorEligibility(mentorUserId: string, rowVersion: number, decision: "approve" | "reject" | "suspend", explanation: string): Promise<ApiResult<MentorProfileRead>> {
      try {
        const res = await client.POST("/api/v1/admin/mentors/{mentor_user_id}/eligibility", {
          params: { path: { mentor_user_id: mentorUserId } },
          body: { decision, explanation },
          headers: headers(rowVersion),
        });
        if (!res.response.ok || !res.data) {
          return { data: null, error: apiError(res.error, `Mentor eligibility decision failed (${res.response.status})`), status: res.response.status };
        }
        return { data: res.data as MentorProfileRead, error: null, status: res.response.status };
      } catch (e) {
        return { data: null, error: e instanceof Error ? e.message : "Network error", status: 0 };
      }
    },

    async getAdminStats(): Promise<ApiResult<AdminDashboardStats>> {
      try {
        const raw = client as unknown as { GET: (p: string, init?: Record<string, unknown>) => Promise<{ response: Response; data?: unknown; error?: unknown }> };
        const res = await raw.GET("/api/v1/admin/stats", { cache: "no-store" });
        if (!res.response.ok || !res.data) {
          return { data: null, error: apiError(res.error, `Failed to fetch admin stats (${res.response.status})`), status: res.response.status };
        }
        return { data: res.data as AdminDashboardStats, error: null, status: res.response.status };
      } catch (e) {
        return { data: null, error: e instanceof Error ? e.message : "Network error", status: 0 };
      }
    },

    async getAdminAuditLogs(options?: { limit?: number; offset?: number; event_type?: string }): Promise<ApiResult<{ items: AdminAuditLogItem[]; total: number }>> {
      try {
        const raw = client as unknown as { GET: (p: string, init?: Record<string, unknown>) => Promise<{ response: Response; data?: unknown; error?: unknown }> };
        const res = await raw.GET("/api/v1/admin/audit-logs", { params: { query: options }, cache: "no-store" });
        if (!res.response.ok || !res.data) {
          return { data: null, error: apiError(res.error, `Failed to fetch audit logs (${res.response.status})`), status: res.response.status };
        }
        return { data: res.data as { items: AdminAuditLogItem[]; total: number }, error: null, status: res.response.status };
      } catch (e) {
        return { data: null, error: e instanceof Error ? e.message : "Network error", status: 0 };
      }
    },

    async getAllOrganizations(status?: string): Promise<ApiResult<OrganizationRead[]>> {
      try {
        const raw = client as unknown as { GET: (p: string, init?: Record<string, unknown>) => Promise<{ response: Response; data?: unknown; error?: unknown }> };
        const res = await raw.GET("/api/v1/admin/organizations", { params: { query: status ? { status } : undefined }, cache: "no-store" });
        if (!res.response.ok || !res.data) {
          return { data: null, error: apiError(res.error, `Failed to fetch organizations (${res.response.status})`), status: res.response.status };
        }
        const items = (res.data as { items: OrganizationRead[] }).items ?? [];
        return { data: items, error: null, status: res.response.status };
      } catch (e) {
        return { data: null, error: e instanceof Error ? e.message : "Network error", status: 0 };
      }
    },

    async getAllProjects(status?: string): Promise<ApiResult<ProjectReviewItem[]>> {
      try {
        const raw = client as unknown as { GET: (p: string, init?: Record<string, unknown>) => Promise<{ response: Response; data?: unknown; error?: unknown }> };
        const res = await raw.GET("/api/v1/admin/projects", { params: { query: status ? { status } : undefined }, cache: "no-store" });
        if (!res.response.ok || !res.data) {
          return { data: null, error: apiError(res.error, `Failed to fetch admin projects (${res.response.status})`), status: res.response.status };
        }
        const items = (res.data as { items: ProjectReviewItem[] }).items ?? [];
        return { data: items, error: null, status: res.response.status };
      } catch (e) {
        return { data: null, error: e instanceof Error ? e.message : "Network error", status: 0 };
      }
    },

    async getAdminOversightUsers(role?: string): Promise<ApiResult<AdminUserOversightItem[]>> {
      try {
        const raw = client as unknown as { GET: (p: string, init?: Record<string, unknown>) => Promise<{ response: Response; data?: unknown; error?: unknown }> };
        const res = await raw.GET("/api/v1/admin/oversight/users", { params: { query: role ? { role } : undefined }, cache: "no-store" });
        if (!res.response.ok || !res.data) {
          return { data: null, error: apiError(res.error, `Failed to fetch user oversight (${res.response.status})`), status: res.response.status };
        }
        const items = (res.data as { items: AdminUserOversightItem[] }).items ?? [];
        return { data: items, error: null, status: res.response.status };
      } catch (e) {
        return { data: null, error: e instanceof Error ? e.message : "Network error", status: 0 };
      }
    },

    async getAdminOversightApplications(status?: string): Promise<ApiResult<AdminApplicationOversightItem[]>> {
      try {
        const raw = client as unknown as { GET: (p: string, init?: Record<string, unknown>) => Promise<{ response: Response; data?: unknown; error?: unknown }> };
        const res = await raw.GET("/api/v1/admin/oversight/applications", { params: { query: status ? { status } : undefined }, cache: "no-store" });
        if (!res.response.ok || !res.data) {
          return { data: null, error: apiError(res.error, `Failed to fetch application oversight (${res.response.status})`), status: res.response.status };
        }
        const items = (res.data as { items: AdminApplicationOversightItem[] }).items ?? [];
        return { data: items, error: null, status: res.response.status };
      } catch (e) {
        return { data: null, error: e instanceof Error ? e.message : "Network error", status: 0 };
      }
    },

    async getAdminOversightParticipations(status?: string): Promise<ApiResult<AdminParticipationOversightItem[]>> {
      try {
        const raw = client as unknown as { GET: (p: string, init?: Record<string, unknown>) => Promise<{ response: Response; data?: unknown; error?: unknown }> };
        const res = await raw.GET("/api/v1/admin/oversight/participations", { params: { query: status ? { status } : undefined }, cache: "no-store" });
        if (!res.response.ok || !res.data) {
          return { data: null, error: apiError(res.error, `Failed to fetch participation oversight (${res.response.status})`), status: res.response.status };
        }
        const items = (res.data as { items: AdminParticipationOversightItem[] }).items ?? [];
        return { data: items, error: null, status: res.response.status };
      } catch (e) {
        return { data: null, error: e instanceof Error ? e.message : "Network error", status: 0 };
      }
    },
  };
}

export interface PortalAuthContextValue {
  isLoaded: boolean;
  isSignedIn: boolean;
  getToken: () => Promise<string | null>;
}

const defaultPortalAuth: PortalAuthContextValue = {
  isLoaded: true,
  isSignedIn: false,
  getToken: async () => null,
};

export const PortalAuthContext = createContext<PortalAuthContextValue>(defaultPortalAuth);

export function usePortalApi() {
  const { getToken, isSignedIn, isLoaded } = useContext(PortalAuthContext);

  const getApi = useCallback(async () => {
    if (!isLoaded || !isSignedIn) throw new Error("Sign in with Clerk before using the live API.");
    const token = await getToken();
    if (!token) throw new Error("Clerk did not provide an access token. Sign in again.");
    return createPortalApi(token);
  }, [getToken, isSignedIn, isLoaded]);

  return { getApi, isSignedIn, isLoaded };
}
