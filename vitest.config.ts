/**
 * Purpose: Vitest config so pure CRAFT logic can be unit tested without Next.js or a database.
 * Inputs: files matching tests/**\/*.test.ts.
 * Outputs: a node test environment with the app's "@/" alias and a `server-only` stub.
 *
 * Rule for Phase 6: put maths and scoring in pure functions (no db import) so
 * tests stay fast; the `server-only` stub is a safety net, not a licence to
 * hit Postgres from unit tests.
 */
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": root,
      "server-only": fileURLToPath(new URL("./tests/stubs/server-only.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
