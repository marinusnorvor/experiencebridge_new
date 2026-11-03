/**
 * Clerk frontend configuration and ExperienceBridge design-system appearance.
 *
 * Connected Clerk application: ExperienceBridge (Development mode)
 * Application ID: app_3LEpoE8O013ojsnjd0xb5GkNWOJ
 */

export const CLERK_APPLICATION_ID = "app_3LEpoE8O013ojsnjd0xb5GkNWOJ" as const;

/**
 * Deterministic syntactically valid test publishable key used only as a non-production
 * build-time fallback when NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY has not yet been pulled.
 */
const BUILD_FALLBACK_PUBLISHABLE_KEY =
  "pk_test_Y2xlcmsuZXhwZXJpZW5jZWJyaWRnZS5kZXYubGNsLmRldiQ";

export function getClerkPublishableKey(): string {
  const configured = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim();
  const appEnv = process.env.NEXT_PUBLIC_APP_ENV?.trim() || process.env.NODE_ENV;

  if (configured && !configured.includes("<") && !configured.includes(">")) {
    if (appEnv === "production" && !configured.startsWith("pk_live_")) {
      throw new Error(
        "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY must use a live key (pk_live_*) in production."
      );
    }
    if (appEnv === "production") {
      try {
        const domain = atob(configured.slice("pk_live_".length));
        if (!/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,}\$$/i.test(domain)) throw new Error();
      } catch {
        throw new Error("Production Clerk publishable key must encode a valid Clerk domain.");
      }
    }
    return configured;
  }

  if (appEnv === "production") {
    throw new Error(
      "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is required in production builds."
    );
  }

  return BUILD_FALLBACK_PUBLISHABLE_KEY;
}

export function isClerkPublishableKeyConfigured(): boolean {
  const configured = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim();
  return Boolean(
    configured &&
      !configured.includes("<") &&
      !configured.includes(">") &&
      configured !== BUILD_FALLBACK_PUBLISHABLE_KEY
  );
}

export const experienceBridgeClerkAppearance = {
  variables: {
    colorPrimary: "#115e59", // teal-800
    colorText: "#17202b",
    colorTextSecondary: "#475569", // slate-600
    colorBackground: "#ffffff",
    colorInputBackground: "#f8fafc",
    colorInputText: "#0f172a",
    borderRadius: "0.75rem",
    fontFamily: "Arial, Helvetica, sans-serif",
  },
  elements: {
    card: "rounded-xl border border-slate-200 bg-white shadow-sm",
    headerTitle: "text-2xl font-semibold tracking-tight text-slate-900",
    headerSubtitle: "text-sm text-slate-600",
    formButtonPrimary:
      "rounded-lg bg-teal-800 text-sm font-medium text-white shadow-none transition hover:bg-teal-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800",
    socialButtonsBlockButton:
      "rounded-lg border border-slate-300 bg-white text-slate-800 transition hover:border-teal-700",
    formFieldInput:
      "rounded-lg border border-slate-300 bg-slate-50 text-slate-900 focus:border-teal-800 focus:ring-teal-800",
    footerActionLink: "font-medium text-teal-800 hover:text-teal-900",
  },
} as const;
