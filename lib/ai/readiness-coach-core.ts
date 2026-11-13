/**
 * Purpose: Phase 2 F5 — turn failed readiness checks into a short plan.
 * Inputs: ReadinessResult from computeReadiness; optional LLM for wording only.
 * Outputs: plan steps. Facts come from checks; LLM cannot invent new checks.
 */
import type { ReadinessCheck, ReadinessResult } from "@/lib/readiness/types";
import { z } from "zod";

export const READINESS_COACH_TIMEOUT_MS = 20_000;

const planSchema = z.object({
  headline: z.string().min(1),
  steps: z.array(z.string().min(1)).min(1).max(8),
});

export type ReadinessPlan = z.infer<typeof planSchema> & {
  source: "llm" | "deterministic";
};

export type CoachLlm = <T>(input: {
  system: string;
  user: string;
  schema: z.ZodType<T>;
  timeoutMs?: number;
}) => Promise<T>;

/**
 * Build a short plan from failed checks only.
 */
export async function coachReadiness(
  result: ReadinessResult,
  llm?: CoachLlm,
): Promise<ReadinessPlan> {
  const failed = result.checks.filter((check) => check.state !== "ok");
  const deterministic = deterministicPlan(result.summary, failed);

  if (!llm || failed.length === 0) {
    return { ...deterministic, source: "deterministic" };
  }

  try {
    const drafted = await llm({
      system:
        "You are a readiness coach. Rewrite the failed checks into a short plan. Use only the checks provided. Do not invent a freeze prediction, safety score, or credit score. Do not add new checklist items.",
      user: JSON.stringify({
        summary: result.summary,
        failed: failed.map((check) => ({
          id: check.id,
          label: check.label,
          state: check.state,
          detail: check.detail,
        })),
        seed: deterministic,
      }),
      schema: planSchema,
      timeoutMs: READINESS_COACH_TIMEOUT_MS,
    });

    // Guard: steps must still mention failed labels or ids somehow — keep seed if empty.
    if (drafted.steps.length === 0) {
      return { ...deterministic, source: "deterministic" };
    }
    return { ...drafted, source: "llm" };
  } catch {
    return { ...deterministic, source: "deterministic" };
  }
}

function deterministicPlan(
  summary: string,
  failed: ReadinessCheck[],
): Omit<ReadinessPlan, "source"> {
  if (failed.length === 0) {
    return {
      headline: `${summary}. Keep evidence fresh.`,
      steps: ["Re-check address proof before it hits 90 days (reported)."],
    };
  }
  return {
    headline: `${summary}. Finish these next:`,
    steps: failed.map((check) => `${check.label}: ${check.detail}`),
  };
}
