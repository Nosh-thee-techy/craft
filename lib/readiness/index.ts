/**
 * Purpose: Public readiness API for dashboard and onboarding.
 */
export { computeReadiness } from "@/lib/readiness/compute";
export { readinessNudges } from "@/lib/readiness/nudges";
export type {
  ReadinessCheck,
  ReadinessResult,
  ReadinessProfile,
  ReadinessEvidence,
} from "@/lib/readiness/types";
