import { defineConfig, devices } from "@playwright/test";

// E2E tests target the locally-running Vite dev server by default.
//   BASE_URL=https://abeallin.github.io/stags/  npx playwright test  → run against prod
// Read-only tests are safe against any URL; write tests should only run locally.
//
// You must start Vite + PocketBase yourself before running tests:
//   pocketbase/pocketbase.exe serve         (terminal A)
//   cd web && npm run dev                   (terminal B)
//   cd web && npm run e2e                   (terminal C)
const baseURL = process.env.BASE_URL ?? "http://localhost:5173/";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,             // mutations to shared PB → keep sequential
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  timeout: 30_000,
  expect: { timeout: 6_000 },
  use: {
    baseURL,
    trace: "retain-on-failure",
    actionTimeout: 6_000,
    navigationTimeout: 15_000,
    viewport: { width: 1280, height: 900 },
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  // Vite must already be running (see comment at top of this file). Skipping
  // webServer auto-start because mixing it with PocketBase, hot reload, and
  // port-reuse is fiddly. One less surprise than the alternative.
});
