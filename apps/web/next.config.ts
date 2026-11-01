import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type { NextConfig } from "next";

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
