import { NextResponse, type NextRequest } from "next/server";

/**
 * Unlisted admin URL (PRODUCT-PLAN §6).
 * - `/{ADMIN_PATH_SECRET}/*` is rewritten to the internal `/admin/*` routes.
 * - Direct requests to `/admin/*` get a 404 so the internal path isn't advertised.
 * The hidden path is NOT the security boundary: every admin API endpoint keeps its
 * server-side platform_admin check. Without ADMIN_PATH_SECRET (local dev) `/admin` works as before.
 */
export default function proxy(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.delete("x-eb-admin-base"); // never trust a client-supplied value
  const secret = process.env.ADMIN_PATH_SECRET?.trim() ?? "";
  const { pathname } = request.nextUrl;

  if (secret.length >= 16 && /^[A-Za-z0-9_-]+$/.test(secret)) {
    const base = `/${secret}`;
    if (pathname === base || pathname.startsWith(`${base}/`)) {
      const url = request.nextUrl.clone();
      url.pathname = `/admin${pathname.slice(base.length) || "/dashboard"}`;
      headers.set("x-eb-admin-base", base);
      return NextResponse.rewrite(url, { request: { headers } });
    }
    if (pathname === "/admin" || pathname.startsWith("/admin/")) {
      const url = request.nextUrl.clone();
      url.pathname = "/not-found-admin";
      return NextResponse.rewrite(url, { status: 404 });
    }
  }
  return NextResponse.next({ request: { headers } });
}

export const config = { matcher: ["/((?!api/|_next/|favicon.ico|.*\.[a-z0-9]+$).*)"] };
