import { NextResponse, type NextRequest } from "next/server";

/**
 * `/app` smart redirect: sends a signed-in user to the right home, server-side.
 * `?to=admin|organization|mentor|student` picks a workspace when the user has it.
 * Admins are sent to the unlisted admin path, which never appears in client code.
 */
export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const go = (path: string) => NextResponse.redirect(new URL(path, origin), { headers: { "Cache-Control": "no-store" } });
  let contexts: string[] = [];
  try {
    const response = await fetch(new URL("/api/v1/me", origin), { headers: { cookie: request.headers.get("cookie") ?? "", accept: "application/json" }, cache: "no-store" });
    if (response.status === 401) return go("/sign-in?next=/app");
    if (!response.ok) return go("/sign-in");
    contexts = ((await response.json()) as { effective_contexts?: string[] }).effective_contexts ?? [];
  } catch {
    return go("/sign-in");
  }
  const secret = process.env.ADMIN_PATH_SECRET?.trim() ?? "";
  const adminHome = secret.length >= 16 && /^[A-Za-z0-9_-]+$/.test(secret) ? `/${secret}/dashboard` : "/admin/dashboard";
  const homes: Record<string, string> = { admin: adminHome, organization: "/organization/dashboard", mentor: "/mentor/dashboard", student: "/student/dashboard" };
  const wanted = request.nextUrl.searchParams.get("to");
  if (wanted && homes[wanted] && (wanted === "student" || contexts.includes(wanted))) return go(homes[wanted]);
  for (const context of ["admin", "organization", "mentor"]) if (contexts.includes(context)) return go(homes[context]);
  return go(homes.student);
}
