/**
 * Purpose: Unit tests for the educational investing range simulation.
 * Inputs: hand-built contribution / horizon numbers (no database).
 * Outputs: pass/fail — always a band, never a single promised return.
 */
import { describe, expect, it } from "vitest";
import { simulateInvesting } from "@/lib/planner/simulate";

describe("simulateInvesting", () => {
  it("projects a low / mid / high band for positive contributions", () => {
    const sim = simulateInvesting({ monthlyContribution: 1000, months: 12 });
    expect(sim.kind).toBe("simulation");
    if (sim.kind !== "simulation") return;
    expect(sim.totals.endLow).toBeLessThan(sim.totals.endMid);
    expect(sim.totals.endMid).toBeLessThan(sim.totals.endHigh);
    expect(sim.totals.contributed).toBe(12000);
    expect(sim.months).toHaveLength(12);
    expect(sim.disclaimer.toLowerCase()).toContain("educational");
  });

  it("skips when there is nothing to contribute", () => {
    const sim = simulateInvesting({ monthlyContribution: 0, months: 6 });
    expect(sim).toEqual({
      kind: "skipped",
      reason: "Nothing to simulate — safe-to-invest is zero and there is no starting balance.",
    });
  });

  it("rejects invalid bands and horizons", () => {
    expect(() => simulateInvesting({ monthlyContribution: -1, months: 3 })).toThrow(RangeError);
    expect(() => simulateInvesting({ monthlyContribution: 10, months: 0 })).toThrow(RangeError);
    expect(() =>
      simulateInvesting({
        monthlyContribution: 10,
        months: 3,
        lowAprPct: 8,
        midAprPct: 5,
        highAprPct: 2,
      }),
    ).toThrow(RangeError);
  });

  it("is deterministic for the same inputs", () => {
    const a = simulateInvesting({ monthlyContribution: 2500, months: 6, startingBalance: 100 });
    const b = simulateInvesting({ monthlyContribution: 2500, months: 6, startingBalance: 100 });
    expect(a).toEqual(b);
  });
});
