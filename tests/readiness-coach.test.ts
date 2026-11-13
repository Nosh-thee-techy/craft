/**
 * Purpose: F5 readiness coach — plan from failed checks only.
 */
import { describe, expect, it, vi } from "vitest";
import { coachReadiness } from "@/lib/ai/readiness-coach-core";
import { computeReadiness } from "@/lib/readiness";

describe("coachReadiness", () => {
  it("lists failed checks deterministically", async () => {
    const result = computeReadiness({ profile: {}, evidence: [] });
    const plan = await coachReadiness(result);
    expect(plan.source).toBe("deterministic");
    expect(plan.steps.length).toBeGreaterThan(0);
    // Forbid freeze-prediction / safety claims (same contract as readiness UI).
    expect(JSON.stringify(plan).toLowerCase()).not.toMatch(/\bsafe\b|guaranteed/);
  });

  it("falls back when the LLM fails", async () => {
    const result = computeReadiness({
      profile: { legalName: "Amina" },
      evidence: [],
    });
    const llm = vi.fn().mockRejectedValue(new Error("down"));
    const plan = await coachReadiness(result, llm);
    expect(plan.source).toBe("deterministic");
    expect(plan.headline).toMatch(/ready/i);
  });

  it("accepts an LLM rewrite of the same checks", async () => {
    const result = computeReadiness({ profile: {}, evidence: [] });
    const llm = vi.fn().mockResolvedValue({
      headline: "Three things to do next",
      steps: ["Add your legal name", "Upload ID", "Verify a link"],
    });
    const plan = await coachReadiness(result, llm);
    expect(plan.source).toBe("llm");
    expect(plan.steps).toHaveLength(3);
  });
});
