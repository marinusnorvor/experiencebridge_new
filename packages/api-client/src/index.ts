import createClient from "openapi-fetch";

import type { components, paths } from "./generated/schema";

export type HealthResponse = paths["/health"]["get"]["responses"][200]["content"]["application/json"];
export type UserSelf = components["schemas"]["UserSelf"];
export type GlobalRole = NonNullable<UserSelf["role_grants"]>[number];
export type PortalContext = NonNullable<UserSelf["effective_contexts"]>[number];

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
