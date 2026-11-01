import createClient from "openapi-fetch";

import type { components, paths } from "./generated/schema";

export type { components, paths };

// Existing identity and health exports (strictly preserved for backward compatibility)
export type HealthResponse = paths["/health"]["get"]["responses"][200]["content"]["application/json"];
export type UserSelf = components["schemas"]["UserSelf"];
export type GlobalRole = NonNullable<UserSelf["role_grants"]>[number];
export type PortalContext = NonNullable<UserSelf["effective_contexts"]>[number];

// Organizations & Projects
export type OrganizationRead = components["schemas"]["OrganizationRead"];
export type OrganizationPage = components["schemas"]["OrganizationPage"];
export type OrganizationCreate = components["schemas"]["OrganizationCreate"];
export type ProjectRead = components["schemas"]["ProjectRead"];
export type ProjectPage = components["schemas"]["ProjectPage"];
export type ProjectCreate = components["schemas"]["ProjectCreate"];
export type ProjectReviewItem = components["schemas"]["ProjectReviewItem"];
export type TermsRead = components["schemas"]["TermsRead"];
export type TermsCreate = components["schemas"]["TermsCreate"];
export type DecisionInput = components["schemas"]["DecisionInput"];
export type SubmitProject = components["schemas"]["SubmitProject"];

// Applications, Offers & Participations
export type ApplicationRead = components["schemas"]["ApplicationRead"];
export type ApplicationPage = components["schemas"]["ApplicationPage"];
export type ApplicationDetail = components["schemas"]["ApplicationDetail"];
export type ApplicationCreate = components["schemas"]["ApplicationCreate"];
export type ApplicationLink = components["schemas"]["ApplicationLink"];
export type OfferRead = components["schemas"]["OfferRead"];
export type OfferPage = components["schemas"]["OfferPage"];
export type OfferDetail = components["schemas"]["OfferDetail"];
export type OfferCreate = components["schemas"]["OfferCreate"];
export type OfferAccept = components["schemas"]["OfferAccept"];
export type ParticipationRead = components["schemas"]["ParticipationRead"];
export type ParticipationPage = components["schemas"]["ParticipationPage"];
export type ParticipationDetail = components["schemas"]["ParticipationDetail"];
export type AcceptanceRead = components["schemas"]["AcceptanceRead"];
export type ReadyRequest = components["schemas"]["ReadyRequest"];
export type FinalizeRequest = components["schemas"]["FinalizeRequest"];

// Mentorship
export type MentorProfileRead = components["schemas"]["MentorProfileRead"];
export type MentorProfileWrite = components["schemas"]["MentorProfileWrite"];
export type MentorEligibilityInput = components["schemas"]["MentorEligibilityInput"];
export type AssignmentRead = components["schemas"]["AssignmentRead"];
export type AssignmentPage = components["schemas"]["AssignmentPage"];
export type AssignmentCreate = components["schemas"]["AssignmentCreate"];
export type AssignmentAccept = components["schemas"]["AssignmentAccept"];

// Submissions & Reviews
export type SubmissionRead = components["schemas"]["SubmissionRead"];
export type SubmissionPage = components["schemas"]["SubmissionPage"];
export type SubmissionCreate = components["schemas"]["SubmissionCreate"];
export type SubmissionPatch = components["schemas"]["SubmissionPatch"];
export type ArtifactRead = components["schemas"]["ArtifactRead"];
export type ArtifactCreate = components["schemas"]["ArtifactCreate"];
export type MentorReviewView = components["schemas"]["MentorReviewView"];
export type MentorReviewCreate = components["schemas"]["MentorReviewCreate"];
export type MentorReviewPage = components["schemas"]["MentorReviewPage"];
export type MentorObservation = components["schemas"]["MentorObservation"];
export type OrganizationReviewRead = components["schemas"]["OrganizationReviewRead"];
export type OrganizationReviewCreate = components["schemas"]["OrganizationReviewCreate"];
export type OrganizationReviewPage = components["schemas"]["OrganizationReviewPage"];
export type OrganizationCriterionResult = components["schemas"]["OrganizationCriterionResult"];

// Shared reason / validation schemas
export type RequiredReason = components["schemas"]["RequiredReason"];
export type OptionalReason = components["schemas"]["OptionalReason"];
export type Empty = components["schemas"]["Empty"];
export type ValidationError = components["schemas"]["ValidationError"];
export type HTTPValidationError = components["schemas"]["HTTPValidationError"];

export interface ApiClientOptions {
  accessToken?: string | null;
}

export function createApiClient(baseUrl: string, options?: ApiClientOptions) {
  const headers: Record<string, string> = {};
  if (options?.accessToken) {
    headers.Authorization = `Bearer ${options.accessToken}`;
  }

  return createClient<paths>({
    baseUrl,
    headers: Object.keys(headers).length > 0 ? headers : undefined,
  });
}
