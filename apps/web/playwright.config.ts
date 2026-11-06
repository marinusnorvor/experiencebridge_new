import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end journey tests (PRODUCT-PLAN §9). Run against a local web + API that point at the
 * Neon *development* branch — never production:
 *   npm run dev --workspace apps/web -- --port 3002          (web)
 *   .\apps\api\.venv\Scripts\python.exe apps/api/run_dev.py --port 8001   (api)
 *   $env:E2E_ADMIN_EMAIL=...; $env:E2E_ADMIN_PASSWORD=...;   npm run test:e2e --workspace apps/web
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 20 * 60_000,
  expect: { timeout: 60_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3002",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    actionTimeout: 60_000,
    navigationTimeout: 90_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
