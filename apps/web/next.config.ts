import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type { NextConfig } from "next";

// Validate deployment configuration before producing a production artifact.
// Secrets are checked here only, never exposed through Next's `env` option.
const appEnv = process.env.NEXT_PUBLIC_APP_ENV?.trim() || process.env.NODE_ENV;
if (process.env.VERCEL_ENV === "production" && appEnv !== "production") {
  throw new Error("Vercel Production requires NEXT_PUBLIC_APP_ENV=production.");
}
if (appEnv === "production") {
  if (!process.env.API_UPSTREAM_ORIGIN || !process.env.API_UPSTREAM_ALLOWED_HOST) throw new Error("Production requires an explicit API upstream origin and allowed host.");
  const proxySecret = process.env.AUTH_PROXY_SECRET ?? "";
  if (Buffer.byteLength(proxySecret) < 32 || proxySecret.includes("<") || proxySecret.includes(">")) throw new Error("Production requires a non-placeholder AUTH_PROXY_SECRET of at least 32 bytes.");
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
