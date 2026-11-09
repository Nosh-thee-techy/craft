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
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
