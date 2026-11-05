/** Same-origin authentication client. Server-authoritative roles come from /me. */
import type { UserSelf } from "@experiencebridge/api-client";

export class AuthApiError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = "AuthApiError";
    this.status = status;
    this.code = code;
  }
}

let csrfToken: string | undefined;
let csrfPending: Promise<string | undefined> | undefined;
let csrfGeneration = 0;

async function request<T>(path: string, body?: object): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    headers["X-CSRF-Token"] = await bootstrapCsrf();
  }
  let response: Response;
  try {
    response = await fetch(`/api/v1${path}`, {
      method: body === undefined ? "GET" : "POST",
      credentials: "include",
      cache: "no-store",
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new AuthApiError("Authentication service is unavailable.", 0, "TEMPORARY_UNAVAILABLE");
  }
  if (!response.ok) {
    const data = await response.json().catch(() => null) as { error?: { code?: string; message?: string } } | null;
    if (response.status === 401 || response.status === 403) clearCsrf();
    throw new AuthApiError(data?.error?.message ?? "Authentication request failed.", response.status, data?.error?.code ?? "REQUEST_FAILED");
  }
  if (response.status === 204) return undefined as T;
  return await response.json() as T;
}

export function clearCsrf(): void {
  csrfToken = undefined;
  csrfGeneration += 1;
}

export function bootstrapCsrf(): Promise<string> {
  if (csrfToken) return Promise.resolve(csrfToken);
  if (!csrfPending) {
    const generation = csrfGeneration;
    csrfPending = request<{ csrf_token: string }>("/auth/csrf")
      .then(({ csrf_token }) => {
        if (generation === csrfGeneration) csrfToken = csrf_token;
        return generation === csrfGeneration ? csrf_token : undefined;
      })
      .finally(() => { csrfPending = undefined; });
  }
  // Serialize a replacement bootstrap after an invalidated response, so its
  // Set-Cookie cannot arrive later and overwrite the newer context cookie.
  return csrfPending.then(token => token ?? bootstrapCsrf());
}

export async function authenticatedFetch(request: Request): Promise<Response> {
  const headers = new Headers(request.headers);
  if (!["GET", "HEAD", "OPTIONS"].includes(request.method)) headers.set("X-CSRF-Token", await bootstrapCsrf());
  const response = await fetch(new Request(request, { headers, credentials: "include", cache: "no-store" }));
  if (response.status === 401) {
    clearCsrf();
    if (typeof window !== "undefined") window.dispatchEvent(new Event("eb:session-expired"));
  } else if (response.status === 403) clearCsrf();
  return response;
}

type Message = { message: string };
export const authClient = {
  register: (email: string, password: string, display_name: string) => request<Message>("/auth/register", { email, password, display_name }),
  login: async (email: string, password: string) => {
    const result = await request<Message>("/auth/login", { email, password });
    clearCsrf();
    return result;
  },
  logout: async () => {
    try { await request<void>("/auth/logout", {}); } finally { clearCsrf(); }
  },
  forgotPassword: (email: string) => request<Message>("/auth/forgot-password", { email }),
  resetPassword: (token: string, new_password: string) => request<Message>("/auth/reset-password", { token, new_password }),
  currentUser: () => request<UserSelf>("/me"),
};
