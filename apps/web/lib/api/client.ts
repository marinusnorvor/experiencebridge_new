import { createApiClient } from "@experiencebridge/api-client";

let apiClient: ReturnType<typeof createApiClient> | undefined;

export function getPublicApiBaseUrl(): string {
  const configuredUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!configuredUrl) {
    throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured for this web build.");
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(configuredUrl);
  } catch {
    throw new Error("NEXT_PUBLIC_API_BASE_URL must be a valid public HTTP(S) origin.");
  }

  if (
    !["http:", "https:"].includes(parsedUrl.protocol) ||
    parsedUrl.username ||
    parsedUrl.password ||
    parsedUrl.pathname !== "/" ||
    parsedUrl.search ||
    parsedUrl.hash
  ) {
    throw new Error("NEXT_PUBLIC_API_BASE_URL must be a public HTTP(S) origin without credentials.");
  }

  return parsedUrl.origin;
}

export function getApiClient() {
  apiClient ??= createApiClient(getPublicApiBaseUrl());
  return apiClient;
}

export function getAuthenticatedApiClient(accessToken: string | null | undefined) {
  return createApiClient(getPublicApiBaseUrl(), { accessToken });
}
