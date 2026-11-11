/**
 * Purpose: Unit tests for the planner rules (buffer, then debt, then investing).
 * Inputs: real forecasts from `forecastCashflow` plus hand-built debts (no database).
 * Outputs: pass/fail. Each expected number is derived in the comment above its assertion.
 */
import { describe, expect, it } from "vitest";
import { forecastCashflow, type CashflowPayment } from "@/lib/forecast/cashflow";
import { buildPlan, bufferMonthsFor, volatilityOf, type DebtInput } from "@/lib/planner/rules";

const NOW = new Date(Date.UTC(2026, 10, 12)); // 12 Nov 2026

function pay(month: number, amount: number): CashflowPayment {
  return { amount, refundedAmount: 0, disputeStatus: "none", receivedAt: new Date(Date.UTC(2026, month - 1, 10)) };
}

/**
 * Jun..Oct = 2000, 4000, 6000, 8000, 10000.
 * p20 = 2000 + 0.8*2000 = 3600. median = 6000. p80 = 8000 + 0.2*2000 = 8400.
 * Volatility = (8400 - 3600) / 6000 = 0.8, so the buffer target is 4 months of essentials.
 */
const HISTORY = [pay(6, 2000), pay(7, 4000), pay(8, 6000), pay(9, 8000), pay(10, 10000)];

function forecast(expenses: number, buffer: number, payments = HISTORY) {
  return forecastCashflow({ payments, invoices: [], monthlyEssentialExpenses: expenses, currentBuffer: buffer, now: NOW });
}

function plan(opts: { expenses?: number; buffer?: number; debts?: DebtInput[]; taxPct?: number } = {}) {
  const expenses = opts.expenses ?? 2500;
  const buffer = opts.buffer ?? 10000;
  const p = buildPlan({
    forecast: forecast(expenses, buffer),
    monthlyEssentialExpenses: expenses,
    currentBuffer: buffer,
    debts: opts.debts ?? [],
    taxPct: opts.taxPct,
  });
  if (p.kind !== "plan") throw new Error(`expected a plan, got: ${p.reason}`);
  return p;
}

const debt = (label: string, balance: number, minMonthly: number, aprPct: number): DebtInput => ({ label, balance, minMonthly, aprPct });

describe("buffer sizing", () => {
  it("measures volatility as (high - low) / mid", () => {
    expect(volatilityOf({ low: 3600, mid: 6000, high: 8400 })).toBeCloseTo(0.8, 10);
    expect(volatilityOf({ low: 0, mid: 0, high: 0 })).toBe(Infinity);
  });

  it("maps volatility to months of essentials", () => {
    expect(bufferMonthsFor(0.2)).toBe(3);
    expect(bufferMonthsFor(0.5)).toBe(4); // tier edges move up, not down
    expect(bufferMonthsFor(0.99)).toBe(4);
    expect(bufferMonthsFor(1.2)).toBe(5);
    expect(bufferMonthsFor(2)).toBe(6);
    expect(bufferMonthsFor(Infinity)).toBe(6);
  });

  it("sizes the target from the forecast: 4 months x 2500 = 10000", () => {
    const p = plan({ buffer: 4000 });
    expect(p.volatility).toBeCloseTo(0.8, 10);
    expect(p.bufferMonths).toBe(4);
    expect(p.bufferTarget).toBe(10000);
    expect(p.bufferGap).toBe(6000);
  });
});

describe("waterfall: buffer, then debt, then investing", () => {
  it("sends spare cash to the buffer first", () => {
    // Slow-month income 3600 - expenses 2500 = 1100 spare. Buffer gap is 6000, so all 1100 goes there.
    const p = plan({ buffer: 4000 });
    expect(p.freeCash).toBe(1100);
    expect(p.steps.map((s) => s.amount)).toEqual([1100, 0, 0]);
    expect(p.safeToInvest).toBe(0);
  });

  it("invests the spare cash once the buffer is full and there is no debt", () => {
    const p = plan({ buffer: 10000 });
    expect(p.steps.map((s) => [s.key, s.amount])).toEqual([["buffer", 0], ["debt", 0], ["invest", 1100]]);
    expect(p.safeToInvest).toBe(1100);
  });

  it("pays minimums first, then extra to the highest interest debt", () => {
    // Minimums 200 + 100 = 300. Spare = 3600 - 2500 - 300 = 800, all extra to the 24% debt.
    const p = plan({ debts: [debt("Loan B", 3000, 100, 10), debt("Loan A", 5000, 200, 24)] });
    expect(p.debtMinimums).toBe(300);
    expect(p.freeCash).toBe(800);
    expect(p.steps[1].amount).toBe(800);
    expect(p.steps[1].allocations).toEqual([{ label: "Loan A", amount: 800 }]);
    expect(p.safeToInvest).toBe(0);
  });

  it("spills to the next debt when the first is cleared, then invests the rest", () => {
    // A owes 200 (min 30), B owes 100 (min 20). Minimums 50, spare = 3600 - 2500 - 50 = 1050.
    // Extra room: A 170, B 80 = 250. Invest 1050 - 250 = 800.
    const p = plan({ debts: [debt("A", 200, 30, 24), debt("B", 100, 20, 10)] });
    expect(p.steps[1].allocations).toEqual([{ label: "A", amount: 170 }, { label: "B", amount: 80 }]);
    expect(p.steps[1].amount).toBe(250);
    expect(p.safeToInvest).toBe(800);
  });

  it("does not pay extra on debt until the buffer is full", () => {
    // Spare = 3600 - 2500 - 200 minimum = 900. The buffer gap is 6000, so all 900 goes to the buffer.
    const p = plan({ buffer: 4000, debts: [debt("A", 5000, 200, 24)] });
    expect(p.steps.map((s) => s.amount)).toEqual([900, 0, 0]);
  });

  it("amounts across the three steps never exceed spare cash", () => {
    for (const buffer of [0, 4000, 9000, 10000, 50000]) {
      for (const debts of [[], [debt("A", 700, 50, 20)], [debt("A", 9000, 300, 30)]]) {
        const p = plan({ buffer, debts });
        const spent = p.steps.reduce((s, x) => s + x.amount, 0);
        expect(spent).toBeLessThanOrEqual(Math.max(0, p.freeCash) + 1e-9);
      }
    }
  });
});

describe("tax and shortfalls", () => {
  it("keeps the tax share out of spare cash", () => {
    // Tax 20% of 3600 = 720. Spare = 3600 - 720 - 2500 = 380.
    const p = plan({ taxPct: 20 });
    expect(p.taxReserve).toBe(720);
    expect(p.freeCash).toBe(380);
    expect(p.safeToInvest).toBe(380);
  });

  it("allocates nothing when a slow month does not cover essentials", () => {
    // Expenses 7000 > slow income 3600: spare is negative, everything is zero, with a note.
    const p = plan({ expenses: 7000, buffer: 0 });
    expect(p.freeCash).toBeLessThan(0);
    expect(p.steps.map((s) => s.amount)).toEqual([0, 0, 0]);
    expect(p.safeToInvest).toBe(0);
    expect(p.notes.join(" ")).toContain("does not cover");
  });

  it("holds investing back when the forecast says the buffer could run out", () => {
    // The real forecast never dips here, so flag a later month by hand to test the guard.
    // Buffer is full and spare cash is 1100, so investing would normally get all of it.
    const f = forecast(2500, 10000);
    if (f.kind !== "forecast") throw new Error("expected a forecast");
    const flagged = { ...f, months: f.months.map((m, i) => (i === 1 ? { ...m, warnings: [{ kind: "buffer_runs_out" as const, month: m.month, message: "x" }] } : m)) };
    const p = buildPlan({ forecast: flagged, monthlyEssentialExpenses: 2500, currentBuffer: 10000, debts: [] });
    if (p.kind !== "plan") throw new Error("expected a plan");
    expect(p.safeToInvest).toBe(0);
    expect(p.notes.join(" ")).toContain("held back");
  });
});

describe("explanations and edge cases", () => {
  it("gives every step a plain-language reason", () => {
    for (const s of plan({ buffer: 4000 }).steps) expect(s.reason.length).toBeGreaterThan(10);
  });

  it("returns insufficient when the forecast has no history", () => {
    const p = buildPlan({
      forecast: forecast(2500, 1000, []),
      monthlyEssentialExpenses: 2500,
      currentBuffer: 1000,
      debts: [],
    });
    expect(p.kind).toBe("insufficient");
  });

  it("names the month from the forecast", () => {
    expect(plan().month).toBe("2026-11");
  });

  it("throws on invalid numbers", () => {
    const f = forecast(2500, 1000);
    const base = { forecast: f, monthlyEssentialExpenses: 2500, currentBuffer: 1000, debts: [] as DebtInput[] };
    expect(() => buildPlan({ ...base, monthlyEssentialExpenses: -1 })).toThrow(RangeError);
    expect(() => buildPlan({ ...base, currentBuffer: -1 })).toThrow(RangeError);
    expect(() => buildPlan({ ...base, taxPct: 101 })).toThrow(RangeError);
    expect(() => buildPlan({ ...base, debts: [debt("bad", -5, 0, 10)] })).toThrow(RangeError);
  });

  it("is deterministic", () => {
    expect(plan({ buffer: 4000 })).toEqual(plan({ buffer: 4000 }));
  });
});
