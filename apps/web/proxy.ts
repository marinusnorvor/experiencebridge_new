import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest, type NextFetchEvent } from "next/server";

import { getClerkPublishableKey } from "@/lib/auth/clerk-config";
import { isPortalPresentationMode } from "@/lib/auth/portal-presentation";

const PROTECTED_PORTAL_PREFIXES = [
  "/student",
  "/organization",
  "/mentor",
  "/admin",
] as const;

function isProtectedPortalRoute(pathname: string): boolean {
  return PROTECTED_PORTAL_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

const authenticatedProxy = clerkMiddleware(
  async (auth, request) => {
    if (isProtectedPortalRoute(request.nextUrl.pathname)) {
      await auth.protect();
    }
  },
  {
    publishableKey: getClerkPublishableKey(),
    signInUrl: "/sign-in",
    signUpUrl: "/sign-up",
  }
);

export default function proxy(request: NextRequest, event: NextFetchEvent) {
  const pathname = request.nextUrl.pathname;
  // Only audited presentation routes skip Clerk. API and authentication routes
  // still use the existing middleware, even during local development.
  if (
    isPortalPresentationMode() &&
    (pathname === "/" || isProtectedPortalRoute(pathname))
  ) {
    return NextResponse.next();
  }
  return authenticatedProxy(request, event);
}

export const config = {
  matcher: [
    "/__clerk/:path*",
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
