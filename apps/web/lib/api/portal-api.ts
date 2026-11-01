"use client";

import { useAuth } from "@clerk/nextjs";
import { useCallback } from "react";
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
    // Identity
    async getMe(): Promise<ApiResult<UserSelf>> {
      try {
        const res = await client.GET("/api/v1/me");
        if (!res.response.ok || !res.data) {
          return { data: null, error: `Failed to fetch profile (${res.response.status})`, status: res.response.status };
        }
        return { data: res.data as UserSelf, error: null, status: res.response.status };
      } catch (e) {
        return { data: null, error: e instanceof Error ? e.message : "Network error", status: 0 };
      }
    },

    // Organizations
    async getMyOrganizations(): Promise<ApiResult<OrganizationRead[]>> {
      try {
        const res = await client.GET("/api/v1/me/organizations");
        if (!res.response.ok || !res.data) {
          return { data: null, error: `Failed to fetch organizations (${res.response.status})`, status: res.response.status };
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
          return { data: null, error: `Failed to create organization (${res.response.status})`, status: res.response.status };
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
          return { data: null, error: `Verification submit failed (${res.response.status})`, status: res.response.status };
        }
        return { data: res.data as OrganizationRead, error: null, status: res.response.status };
      } catch (e) {
        return { data: null, error: e instanceof Error ? e.message : "Network error", status: 0 };
      }
    },

    // Projects
    async getPublishedProjects(): Promise<ApiResult<ProjectRead[]>> {
      try {
        const res = await client.GET("/api/v1/projects");
        if (!res.response.ok || !res.data) {
          return { data: null, error: `Failed to fetch projects (${res.response.status})`, status: res.response.status };
        }
        const items = (res.data as { items: ProjectRead[] }).items ?? [];
        return { data: items, error: null, status: res.response.status };
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
          return { data: null, error: `Failed to fetch project (${res.response.status})`, status: res.response.status };
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
          return { data: null, error: `Failed to fetch org projects (${res.response.status})`, status: res.response.status };
        }
        const items = (res.data as { items: ProjectRead[] }).items ?? [];
        return { data: items, error: null, status: res.response.status };
      } catch (e) {
        return { data: null, error: e instanceof Error ? e.message : "Network error", status: 0 };
      }
    },

    async createProject(orgId: string, body: ProjectCreate): Promise<ApiResult<ProjectRead>> {
      try {
        const res = await client.POST("/api/v1/organizations/{org_id}/projects", {
          params: { path: { org_id: orgId } },
          body,
          headers: headers(),
        });
        if (!res.response.ok || !res.data) {
          return { data: null, error: `Failed to create project (${res.response.status})`, status: res.response.status };
        }
        return { data: res.data as ProjectRead, error: null, status: res.response.status };
      } catch (e) {
        return { data: null, error: e instanceof Error ? e.message : "Network error", status: 0 };
      }
    },

    async createTermsVersion(projectId: string, body: TermsCreate): Promise<ApiResult<TermsRead>> {
      try {
        const res = await client.POST("/api/v1/projects/{project_id}/terms-versions", {
          params: { path: { project_id: projectId } },
          body,
          headers: headers(),
        });
        if (!res.response.ok || !res.data) {
          return { data: null, error: `Failed to create terms (${res.response.status})`, status: res.response.status };
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
          return { data: null, error: `Failed to fetch terms version (${res.response.status})`, status: res.response.status };
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
          return { data: null, error: `Failed to submit review (${res.response.status})`, status: res.response.status };
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
          return { data: null, error: `Failed to start project (${res.response.status})`, status: res.response.status };
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
          return { data: null, error: `Failed to complete project (${res.response.status})`, status: res.response.status };
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
          return { data: null, error: `Failed to fetch applications (${res.response.status})`, status: res.response.status };
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
          return { data: null, error: `Failed to fetch project applications (${res.response.status})`, status: res.response.status };
        }
        const items = (res.data as { items: ApplicationRead[] }).items ?? [];
        return { data: items, error: null, status: res.response.status };
      } catch (e) {
        return { data: null, error: e instanceof Error ? e.message : "Network error", status: 0 };
      }
    },

    async submitApplication(projectId: string, body: ApplicationCreate): Promise<ApiResult<ApplicationRead>> {
      try {
        const res = await client.POST("/api/v1/projects/{project_id}/applications", {
          params: { path: { project_id: projectId } },
          body,
          headers: headers(),
        });
        if (!res.response.ok || !res.data) {
          return { data: null, error: `Application failed (${res.response.status})`, status: res.response.status };
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
          return { data: null, error: `Shortlist failed (${res.response.status})`, status: res.response.status };
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
          return { data: null, error: `Decline failed (${res.response.status})`, status: res.response.status };
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
          return { data: null, error: `Withdraw failed (${res.response.status})`, status: res.response.status };
        }
        return { data: res.data as ApplicationRead, error: null, status: res.response.status };
      } catch (e) {
        return { data: null, error: e instanceof Error ? e.message : "Network error", status: 0 };
      }
    },

    async issueOffer(applicationId: string, termsVersionId: string, expiresAt: string): Promise<ApiResult<OfferRead>> {
      try {
        const res = await client.POST("/api/v1/applications/{application_id}/offer", {
          params: { path: { application_id: applicationId } },
          body: { terms_version_id: termsVersionId, expires_at: expiresAt },
          headers: headers(),
        });
        if (!res.response.ok || !res.data) {
          return { data: null, error: `Offer failed (${res.response.status})`, status: res.response.status };
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
          return { data: null, error: `Failed to fetch offers (${res.response.status})`, status: res.response.status };
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
          return { data: null, error: `Accept offer failed (${res.response.status})`, status: res.response.status };
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
          return { data: null, error: `Decline offer failed (${res.response.status})`, status: res.response.status };
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
          return { data: null, error: `Failed to fetch participations (${res.response.status})`, status: res.response.status };
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
          return { data: null, error: `Failed to fetch participations (${res.response.status})`, status: res.response.status };
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
          return { data: null, error: `Mark ready failed (${res.response.status})`, status: res.response.status };
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
          return { data: null, error: `Finalize failed (${res.response.status})`, status: res.response.status };
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
          return { data: null, error: `Failed to fetch mentor profile (${res.response.status})`, status: res.response.status };
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
          return { data: null, error: `Save mentor profile failed (${res.response.status})`, status: res.response.status };
        }
        return { data: res.data as MentorProfileRead, error: null, status: res.response.status };
      } catch (e) {
        return { data: null, error: e instanceof Error ? e.message : "Network error", status: 0 };
      }
    },

    async inviteMentor(participationId: string, mentorUserId: string, context: string, expiresAt: string): Promise<ApiResult<AssignmentRead>> {
      try {
        const res = await client.POST("/api/v1/participations/{participation_id}/mentor-assignments", {
          params: { path: { participation_id: participationId } },
          body: { mentor_user_id: mentorUserId, context, expires_at: expiresAt },
          headers: headers(),
        });
        if (!res.response.ok || !res.data) {
          return { data: null, error: `Mentor invitation failed (${res.response.status})`, status: res.response.status };
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
          return { data: null, error: `Failed to fetch mentor assignments (${res.response.status})`, status: res.response.status };
        }
        const items = (res.data as { items: AssignmentRead[] }).items ?? [];
        return { data: items, error: null, status: res.response.status };
      } catch (e) {
        return { data: null, error: e instanceof Error ? e.message : "Network error", status: 0 };
      }
    },

    async acceptMentorAssignment(assignmentId: string, rowVersion: number): Promise<ApiResult<AssignmentRead>> {
      try {
        const res = await client.POST("/api/v1/mentor-assignments/{assignment_id}/accept", {
          params: { path: { assignment_id: assignmentId } },
          body: { conflict_declared: false, confidentiality_acknowledged: true },
          headers: headers(rowVersion),
        });
        if (!res.response.ok || !res.data) {
          return { data: null, error: `Accept assignment failed (${res.response.status})`, status: res.response.status };
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
          return { data: null, error: `Decline assignment failed (${res.response.status})`, status: res.response.status };
        }
        return { data: res.data as AssignmentRead, error: null, status: res.response.status };
      } catch (e) {
        return { data: null, error: e instanceof Error ? e.message : "Network error", status: 0 };
      }
    },

    // Submissions & Reviews
    async createSubmission(participationId: string, rowVersion: number, milestoneIndex: number, summary: string, contributionStatement: string): Promise<ApiResult<SubmissionRead>> {
      try {
        const res = await client.POST("/api/v1/participations/{participation_id}/submissions", {
          params: { path: { participation_id: participationId } },
          body: { milestone_index: milestoneIndex, summary, contribution_statement: contributionStatement },
          headers: headers(rowVersion),
        });
        if (!res.response.ok || !res.data) {
          return { data: null, error: `Create submission failed (${res.response.status})`, status: res.response.status };
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
          return { data: null, error: `Attach artifact failed (${res.response.status})`, status: res.response.status };
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
          return { data: null, error: `Submit deliverable failed (${res.response.status})`, status: res.response.status };
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
          return { data: null, error: `Mentor review failed (${res.response.status})`, status: res.response.status };
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
          return { data: null, error: `Organization review failed (${res.response.status})`, status: res.response.status };
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
          return { data: null, error: `Failed to fetch pending orgs (${res.response.status})`, status: res.response.status };
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
          return { data: null, error: `Org decision failed (${res.response.status})`, status: res.response.status };
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
          return { data: null, error: `Failed to fetch pending projects (${res.response.status})`, status: res.response.status };
        }
        const items = (res.data as { items: ProjectReviewItem[] }).items ?? [];
        return { data: items, error: null, status: res.response.status };
      } catch (e) {
        return { data: null, error: e instanceof Error ? e.message : "Network error", status: 0 };
      }
    },

    async decideProject(projectId: string, rowVersion: number, decision: "verify" | "reject" | "request_changes", explanation: string): Promise<ApiResult<ProjectRead>> {
      try {
        const res = await client.POST("/api/v1/admin/projects/{project_id}/decisions", {
          params: { path: { project_id: projectId } },
          body: { decision, explanation },
          headers: headers(rowVersion),
        });
        if (!res.response.ok || !res.data) {
          return { data: null, error: `Project decision failed (${res.response.status})`, status: res.response.status };
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
          return { data: null, error: `Mentor eligibility decision failed (${res.response.status})`, status: res.response.status };
        }
        return { data: res.data as MentorProfileRead, error: null, status: res.response.status };
      } catch (e) {
        return { data: null, error: e instanceof Error ? e.message : "Network error", status: 0 };
      }
    },
  };
}

export function usePortalApi() {
  const { getToken, isSignedIn } = useAuth();

  const getApi = useCallback(async () => {
    const token = isSignedIn ? await getToken() : null;
    return createPortalApi(token);
  }, [getToken, isSignedIn]);

  return { getApi, isSignedIn };
}
