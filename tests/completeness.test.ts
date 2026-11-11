/**
 * Purpose: Real unit tests for the evidence completeness score.
 * Inputs: calls the actual `completenessFromTypes` (no copied formulas).
 * Outputs: pass/fail. Also proves the harness imports `server-only` modules safely.
 *
 * Replaces the old stub that asserted `3 / 6 === 0.5` without importing any code.
 */
import { describe, expect, it } from "vitest";
import { completenessFromTypes } from "@/lib/evidence/completeness";
import { EVIDENCE_TYPES } from "@/lib/evidence/schemas";

describe("completenessFromTypes", () => {
  it("scores an empty vault 0 and lists every type as missing", () => {
    const result = completenessFromTypes([]);
    expect(result.score).toBe(0);
    expect(result.present).toEqual([]);
    expect(result.missing).toEqual([...EVIDENCE_TYPES]);
    expect(result.total).toBe(EVIDENCE_TYPES.length);
  });

  it("scores 3 of 6 checklist types as 50", () => {
    const result = completenessFromTypes(["contract", "invoice", "payment"]);
    expect(result.score).toBe(50);
    expect(result.present).toEqual(["contract", "invoice", "payment"]);
    expect(result.missing).toEqual(["deliverable", "comms", "portfolio_link"]);
  });

  it("scores a full checklist 100 with nothing missing", () => {
    const result = completenessFromTypes([...EVIDENCE_TYPES]);
    expect(result.score).toBe(100);
    expect(result.missing).toEqual([]);
  });

  it("does not raise the score for duplicate items of the same type", () => {
    const once = completenessFromTypes(["contract"]);
    const many = completenessFromTypes(["contract", "contract", "contract"]);
    expect(many.score).toBe(once.score);
  });

  it("ignores strings that are not checklist types", () => {
    const result = completenessFromTypes(["contract", "selfie", ""]);
    expect(result.score).toBe(17);
    expect(result.present).toEqual(["contract"]);
  });

  it("rounds to the nearest whole percent", () => {
    const scoreFor = (count: number) =>
      completenessFromTypes(EVIDENCE_TYPES.slice(0, count)).score;
    expect([1, 2, 4, 5].map(scoreFor)).toEqual([17, 33, 67, 83]);
  });

  it("reports present and missing in checklist order, not input order", () => {
    const result = completenessFromTypes(["portfolio_link", "contract"]);
    expect(result.present).toEqual(["contract", "portfolio_link"]);
  });
});
