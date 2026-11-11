/**
 * Purpose: Unit tests for the income stability and trust score.
 * Inputs: calls the real `computeStabilityScore` with hand-built records (no database).
 * Outputs: pass/fail. Each expected number is derived in the comment above its assertion.
 */
import { describe, expect, it } from "vitest";
import {
  MAX_POINTS,
  bandFor,
  computeStabilityScore,
  type ComponentKey,
  type ScorePayment,
  type StabilityInput,
} from "@/lib/scoring/stability";

const NOW = new Date(Date.UTC(2026, 10, 15)); // 15 Nov 2026; window is Jun to Nov 2026

function pay(month: number, amount: number, clientKey: string, extra: Partial<ScorePayment> = {}): ScorePayment {
  return {
    clientKey,
    amount,
    receivedAt: new Date(Date.UTC(2026, month, 10)),
    refundedAmount: 0,
    disputeStatus: "none",
    ...extra,
  };
}

/** One 1000 payment per month Jun to Nov, rotating over three clients. */
function steadyPayments(): ScorePayment[] {
  const clients = ["A", "B", "C"];
  return [5, 6, 7, 8, 9, 10].map((m, i) => pay(m, 1000, clients[i % 3]));
}

function input(overrides: Partial<StabilityInput> = {}): StabilityInput {
  return {
    payments: steadyPayments(),
    projects: [{ evidenceCompleteness: 100 }],
    deliverables: [{ deliveredAt: new Date(Date.UTC(2026, 9, 1)), clientConfirmedAt: new Date(Date.UTC(2026, 9, 2)) }],
    now: NOW,
    ...overrides,
  };
}

function points(result: ReturnType<typeof computeStabilityScore>, key: ComponentKey): number {
  const component = result.components.find((c) => c.key === key);
  if (!component) throw new Error(`missing component ${key}`);
  return component.points;
}

describe("computeStabilityScore", () => {
  it("scores 100 for steady, diverse, clean, fully evidenced, fully confirmed work", () => {
    const result = computeStabilityScore(input());
    expect(result.total).toBe(100);
    expect(result.band).toBe("strong");
    expect(result.sufficientData).toBe(true);
  });

  it("component points always add up to the total and never exceed their max", () => {
    const result = computeStabilityScore(
      input({ payments: [pay(5, 900, "A"), pay(7, 100, "A"), pay(10, 300, "B", { refundedAmount: 50 })] }),
    );
    const sum = result.components.reduce((s, c) => s + c.points, 0);
    expect(result.total).toBe(sum);
    for (const c of result.components) {
      expect(c.points).toBeGreaterThanOrEqual(0);
      expect(c.points).toBeLessThanOrEqual(MAX_POINTS[c.key]);
      expect(c.max).toBe(MAX_POINTS[c.key]);
    }
  });

  it("max points across components sum to 100", () => {
    expect(Object.values(MAX_POINTS).reduce((a, b) => a + b, 0)).toBe(100);
  });

  it("gives every component a non-empty reason and never says 'credit score'", () => {
    const result = computeStabilityScore(input());
    expect(result.components).toHaveLength(6);
    for (const c of result.components) {
      expect(c.reason.length).toBeGreaterThan(0);
      expect(`${c.label} ${c.reason}`.toLowerCase()).not.toContain("credit");
    }
  });

  it("returns a null total when there are fewer than 3 payments in the window", () => {
    const result = computeStabilityScore(input({ payments: [pay(9, 500, "A"), pay(10, 500, "B")] }));
    expect(result.total).toBeNull();
    expect(result.band).toBeNull();
    expect(result.sufficientData).toBe(false);
    expect(result.paymentsInWindow).toBe(2);
  });

  it("scores regularity by active months: 3 of 6 months is 12.5, rounded to 13", () => {
    const result = computeStabilityScore(
      input({ payments: [pay(5, 1000, "A"), pay(7, 1000, "B"), pay(9, 1000, "C")] }),
    );
    expect(points(result, "regularity")).toBe(13);
  });

  it("scores zero variance points when all income lands in one month (cv about 2.24 >= 1.5)", () => {
    const result = computeStabilityScore(
      input({ payments: [pay(10, 200, "A"), pay(10, 200, "B"), pay(10, 200, "C")] }),
    );
    expect(points(result, "variance")).toBe(0);
  });

  it("scores full variance points for identical monthly totals", () => {
    expect(points(computeStabilityScore(input()), "variance")).toBe(20);
  });

  it("scores zero diversity points for a single client", () => {
    const result = computeStabilityScore(
      input({ payments: [pay(8, 1000, "A"), pay(9, 1000, "A"), pay(10, 1000, "A")] }),
    );
    expect(points(result, "diversity")).toBe(0);
  });

  it("scores diversity from the top client share: 60% top share gives 15 * (0.4/0.6) = 10", () => {
    const result = computeStabilityScore(
      input({ payments: [pay(8, 600, "A"), pay(9, 200, "B"), pay(10, 200, "C")] }),
    );
    expect(points(result, "diversity")).toBe(10);
  });

  it("penalises refunds: 200 of 2000 is a 10% rate, so 15 * (1 - 0.5) = 7.5, rounded to 8", () => {
    const result = computeStabilityScore(
      input({
        payments: [
          pay(7, 500, "A", { refundedAmount: 200 }),
          pay(8, 500, "B"),
          pay(9, 500, "C"),
          pay(10, 500, "A"),
        ],
      }),
    );
    expect(points(result, "refunds_disputes")).toBe(8);
  });

  it("counts a lost dispute as fully at risk: 500 of 2000 is 25%, which is 0 points", () => {
    const result = computeStabilityScore(
      input({
        payments: [
          pay(7, 500, "A", { disputeStatus: "lost" }),
          pay(8, 500, "B"),
          pay(9, 500, "C"),
          pay(10, 500, "A"),
        ],
      }),
    );
    expect(points(result, "refunds_disputes")).toBe(0);
  });

  it("does not penalise a won dispute", () => {
    const result = computeStabilityScore(
      input({
        payments: [
          pay(8, 500, "A", { disputeStatus: "won" }),
          pay(9, 500, "B"),
          pay(10, 500, "C"),
        ],
      }),
    );
    expect(points(result, "refunds_disputes")).toBe(15);
  });

  it("clamps a refund larger than the payment to the payment amount", () => {
    const clamped = computeStabilityScore(
      input({
        payments: [
          pay(8, 500, "A", { refundedAmount: 9999 }),
          pay(9, 500, "B"),
          pay(10, 500, "C"),
        ],
      }),
    );
    // 500 of 1500 = 33% rate, over the 20% cutoff
    expect(points(clamped, "refunds_disputes")).toBe(0);
  });

  it("averages evidence completeness across projects: (100 + 50) / 2 = 75%, 15 * 0.75 = 11.25, rounded to 11", () => {
    const result = computeStabilityScore(
      input({ projects: [{ evidenceCompleteness: 100 }, { evidenceCompleteness: 50 }] }),
    );
    expect(points(result, "evidence")).toBe(11);
  });

  it("scores zero evidence points with no projects", () => {
    expect(points(computeStabilityScore(input({ projects: [] })), "evidence")).toBe(0);
  });

  it("scores delivery confirmations: 1 of 2 delivered is 10 * 0.5 = 5, ignoring undelivered work", () => {
    const result = computeStabilityScore(
      input({
        deliverables: [
          { deliveredAt: new Date(Date.UTC(2026, 9, 1)), clientConfirmedAt: new Date(Date.UTC(2026, 9, 2)) },
          { deliveredAt: new Date(Date.UTC(2026, 9, 5)), clientConfirmedAt: null },
          { deliveredAt: null, clientConfirmedAt: null },
        ],
      }),
    );
    expect(points(result, "delivery_confirmations")).toBe(5);
  });

  it("scores zero delivery points with no delivered work", () => {
    expect(points(computeStabilityScore(input({ deliverables: [] })), "delivery_confirmations")).toBe(0);
  });

  it("ignores payments before the window, in the future, or with zero amount", () => {
    const result = computeStabilityScore(
      input({
        payments: [
          ...steadyPayments(),
          pay(0, 5000, "OLD"), // Jan 2026, outside the 6-month window
          pay(11, 5000, "FUTURE"), // Dec 2026, after NOW
          pay(10, 0, "ZERO"),
        ],
      }),
    );
    expect(result.paymentsInWindow).toBe(6);
    expect(result.total).toBe(100);
  });

  it("is deterministic: the same input gives the same output", () => {
    expect(computeStabilityScore(input())).toEqual(computeStabilityScore(input()));
  });
});

describe("bandFor", () => {
  it("maps totals to bands at the boundaries", () => {
    expect(bandFor(100)).toBe("strong");
    expect(bandFor(80)).toBe("strong");
    expect(bandFor(79)).toBe("steady");
    expect(bandFor(60)).toBe("steady");
    expect(bandFor(59)).toBe("building");
    expect(bandFor(40)).toBe("building");
    expect(bandFor(39)).toBe("early");
    expect(bandFor(0)).toBe("early");
  });
});
