/**
 * Purpose: Unit tests for the composed Money view model.
 * Inputs: sample fixtures from `lib/money/sample.ts` (no database).
 * Outputs: pass/fail for score, forecast band, plan, sim, and pending splits.
 */
import { describe, expect, it } from "vitest";
import { buildMoneyView } from "@/lib/money/build-view";
import { SAMPLE_NOW, sampleMoneyInput, sampleMoneyView } from "@/lib/money/sample";

describe("buildMoneyView (sample)", () => {
  it("returns a score, forecast band, plan, simulation, and pending splits", () => {
    const view = sampleMoneyView(SAMPLE_NOW);
    expect(view.currency).toBe("KES");
    expect(view.score.sufficientData).toBe(true);
    expect(view.score.total).not.toBeNull();
    expect(view.forecast.kind).toBe("forecast");
    if (view.forecast.kind === "forecast") {
      expect(view.forecast.months).toHaveLength(3);
      for (const m of view.forecast.months) {
        expect(m.low).toBeLessThanOrEqual(m.mid);
        expect(m.mid).toBeLessThanOrEqual(m.high);
      }
    }
    expect(view.plan.kind).toBe("plan");
    if (view.plan.kind === "plan") {
      expect(view.safeToInvest).toBe(view.plan.safeToInvest);
      expect(view.plan.steps).toHaveLength(3);
    }
    expect(view.simulation.kind).toBe("simulation");
    expect(view.pendingSplits.length).toBeGreaterThan(0);
    expect(view.payWindowDefault.earlyDays).toBeGreaterThan(0);
  });

  it("notes missing planner / rules without throwing", () => {
    const input = sampleMoneyInput(SAMPLE_NOW);
    const view = buildMoneyView({
      ...input,
      planner: null,
      splitRules: null,
      ledger: [],
    });
    expect(view.notes.some((n) => n.toLowerCase().includes("buffer"))).toBe(true);
    expect(view.notes.some((n) => n.toLowerCase().includes("split"))).toBe(true);
  });

  it("never invents a credit-score label in the sample path", () => {
    const view = sampleMoneyView();
    expect(JSON.stringify(view).toLowerCase()).not.toContain("credit score");
  });
});
