import { createApiClient } from "@experiencebridge/api-client";
import { authenticatedFetch } from "../auth/client";

export function getApiClient() {
  const baseUrl = typeof window === "undefined" ? "http://localhost" : window.location.origin;
  return createApiClient(baseUrl, { fetch: authenticatedFetch as typeof fetch });
}
export function getAuthenticatedApiClient() { return getApiClient(); }
