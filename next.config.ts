/**
 * Purpose: Next.js app config for CRAFT.
 * Inputs: none (build-time configuration only).
 * Outputs: NextConfig consumed by `next build` / `next dev`.
 *
 * WHY cacheComponents is off: PayPal webhooks, Auth.js cookies, and
 * per-user dashboards are request-dynamic. Enabling Cache Components
 * during Phase 0 would force Suspense/private-cache plumbing on every
 * authenticated page before features exist.
 */
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: false,
  turbopack: {
    // WHY: a package-lock.json exists in the parent home directory; pin the
    // workspace root so Next does not walk outside this repo.
    root: process.cwd(),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
