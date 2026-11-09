/**
 * Purpose: Drizzle Kit config for generating and applying migrations.
 * Inputs: DATABASE_URL from the environment.
 * Outputs: SQL migrations under ./drizzle.
 */
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://craft:craft@localhost:5432/craft",
  },
  verbose: true,
  strict: true,
});
