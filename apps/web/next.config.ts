import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type { NextConfig } from "next";
import { getClerkPublishableKey } from "./lib/auth/clerk-config";
import { getPublicApiBaseUrl } from "./lib/api/base-url";

// Validate deployment configuration before producing a production artifact.
// Secrets are checked here only, never exposed through Next's `env` option.
const appEnv = process.env.NEXT_PUBLIC_APP_ENV?.trim() || process.env.NODE_ENV;
if (process.env.VERCEL_ENV === "production" && appEnv !== "production") {
  throw new Error("Vercel Production requires NEXT_PUBLIC_APP_ENV=production.");
}
if (appEnv === "production") {
  getClerkPublishableKey();
  getPublicApiBaseUrl();
  const secret = process.env.CLERK_SECRET_KEY?.trim();
  if (!secret?.startsWith("sk_live_") || secret.includes("<") || secret.includes(">")) {
    throw new Error("Production requires a configured live CLERK_SECRET_KEY.");
  }
}

const monorepoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const tailwindTurbopackLoader = resolve(
  monorepoRoot,
  "node_modules/@tailwindcss/turbopack/dist/index.js",
);

const nextConfig: NextConfig = {
  /* config options here */
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  transpilePackages: ["@experiencebridge/api-client"],
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    root: monorepoRoot,
    rules: {
      "*.css": {
        condition: { not: { path: "*.module.css" } },
        loaders: [tailwindTurbopackLoader],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
