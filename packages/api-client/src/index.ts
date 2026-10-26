import createClient from "openapi-fetch";

import type { paths } from "./generated/schema";

export type HealthResponse = paths["/health"]["get"]["responses"][200]["content"]["application/json"];

export function createApiClient(baseUrl: string) {
  return createClient<paths>({ baseUrl });
}
