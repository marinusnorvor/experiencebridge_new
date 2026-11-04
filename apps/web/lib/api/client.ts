import { getPublicApiBaseUrl } from "./base-url";
export { getPublicApiBaseUrl } from "./base-url";

import { createApiClient } from "@experiencebridge/api-client";

let apiClient: ReturnType<typeof createApiClient> | undefined;

export function getApiClient() {
  apiClient ??= createApiClient(getPublicApiBaseUrl());
  return apiClient;
}

export function getAuthenticatedApiClient(accessToken: string | null | undefined) {
  return createApiClient(getPublicApiBaseUrl(), { accessToken });
}
