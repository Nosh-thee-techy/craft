/**
 * Purpose: Single typed source of environment variables for CRAFT.
 * Inputs: `process.env` (never hardcoded secrets).
 * Outputs: a validated `env` object, or a thrown error if required values are missing.
 *
 * WHY one module: every feature must read secrets through here so we cannot
 * accidentally ship a key in source, and so Zod documents the contract.
 */
import "server-only";
import { z } from "zod";

/** Treat blank strings from `.env.example` copies as "not set". */
const optionalString = z
  .string()
  .optional()
  .transform((value) => (value === "" ? undefined : value));

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  AUTH_SECRET: z.string().min(16, "AUTH_SECRET must be at least 16 characters"),
  APP_URL: z.url(),
  PAYPAL_ENV: z.enum(["sandbox", "live"]).default("sandbox"),
  PAYPAL_CLIENT_ID: optionalString,
  PAYPAL_CLIENT_SECRET: optionalString,
  PAYPAL_WEBHOOK_ID: optionalString,
  LLM_API_KEY: optionalString,
  LLM_MODEL: optionalString,
  LLM_BASE_URL: optionalString,
  STORAGE_ENDPOINT: optionalString,
  STORAGE_BUCKET: optionalString,
  STORAGE_ACCESS_KEY: optionalString,
  STORAGE_SECRET_KEY: optionalString,
  GITHUB_TOKEN: optionalString,
  YOUTUBE_API_KEY: optionalString,
});

export type Env = z.infer<typeof envSchema>;

/**
 * Parse and freeze environment variables.
 * Skips hard failure when SKIP_ENV_VALIDATION=1 so `next build` can run
 * before Render injects runtime secrets. Runtime requests still need real values.
 */
function loadEnv(): Env {
  const skip = process.env.SKIP_ENV_VALIDATION === "1";
  if (skip) {
    const parsed = envSchema.partial().safeParse(process.env);
    return {
      NODE_ENV: process.env.NODE_ENV === "production" ? "production" : "development",
      DATABASE_URL: process.env.DATABASE_URL ?? "",
      AUTH_SECRET: process.env.AUTH_SECRET ?? "build-time-placeholder-not-for-runtime",
      APP_URL: process.env.APP_URL ?? "http://localhost:3000",
      PAYPAL_ENV: process.env.PAYPAL_ENV === "live" ? "live" : "sandbox",
      ...parsed.data,
    } as Env;
  }

  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid environment variables: ${issues}`);
  }

  if (parsed.data.PAYPAL_ENV === "live") {
    throw new Error("CRAFT is sandbox-only. Set PAYPAL_ENV=sandbox.");
  }

  return parsed.data;
}

export const env = loadEnv();
