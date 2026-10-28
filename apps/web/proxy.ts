import { clerkMiddleware } from "@clerk/nextjs/server";

import { getClerkPublishableKey } from "@/lib/auth/clerk-config";

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

export default clerkMiddleware(
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

export const config = {
  matcher: [
    "/__clerk/:path*",
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
