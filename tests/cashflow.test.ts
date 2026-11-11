/**
 * Purpose: Unit tests for the 3-month cash-flow band and lean-month warnings.
 * Inputs: calls the real `forecastCashflow` with hand-built records (no database).
 * Outputs: pass/fail. Each expected number is derived in the comment above its assertion.
 */
import { describe, expect, it } from "vitest";
import {
  forecastCashflow,
  type CashflowInput,
  type CashflowPayment,
  type OutstandingInvoice,
} from "@/lib/forecast/cashflow";

const NOW = new Date(Date.UTC(2026, 10, 12)); // 12 Nov 2026. Window is May to Oct; horizon Nov, Dec, Jan.

const d = (y: number, m: number, day: number) => new Date(Date.UTC(y, m - 1, day));

function pay(month: number, amount: number, extra: Partial<CashflowPayment> = {}): CashflowPayment {
  return { amount, refundedAmount: 0, disputeStatus: "none", receivedAt: d(2026, month, 10), ...extra };
}

/** Jun..Oct = 1000, 2000, 3000, 4000, 5000. Sorted, so p20 = 1800, median = 3000, p80 = 4200. */
function history(): CashflowPayment[] {
  return [pay(6, 1000), pay(7, 2000), pay(8, 3000), pay(9, 4000), pay(10, 5000)];
}

function input(overrides: Partial<CashflowInput> = {}): CashflowInput {
  return { payments: history(), invoices: [], monthlyEssentialExpenses: 2500, currentBuffer: 1000, now: NOW, ...overrides };
}

function run(overrides: Partial<CashflowInput> = {}) {
  const f = forecastCashflow(input(overrides));
  if (f.kind !== "forecast") throw new Error(`expected a forecast, got: ${f.reason}`);
  return f;
}

describe("baseline band (no invoices)", () => {
  it("builds low/mid/high from the 20th percentile, median and 80th percentile", () => {
    // p20: position 0.2*4 = 0.8 -> 1000 + 0.8*(2000-1000) = 1800
    // median: position 2 -> 3000. p80: position 3.2 -> 4000 + 0.2*(5000-4000) = 4200
    const f = run();
    expect(f.baseline).toEqual({ low: 1800, mid: 3000, high: 4200, monthsObserved: 5 });
    expect(f.months.map((m) => m.month)).toEqual(["2026-11", "2026-12", "2027-01"]);
    for (const m of f.months) expect([m.low, m.mid, m.high]).toEqual([1800, 3000, 4200]);
    expect(f.totals).toEqual({ low: 5400, mid: 9000, high: 12600 });
  });

  it("always shows a band, never a single number", () => {
    for (const m of run().months) {
      expect(m.low).toBeLessThan(m.high);
      expect(m.low).toBeLessThanOrEqual(m.mid);
      expect(m.mid).toBeLessThanOrEqual(m.high);
    }
  });

  it("returns plain-language assumptions", () => {
    expect(run().assumptions.length).toBeGreaterThan(0);
  });
});

describe("lean-month warnings", () => {
  it("projects the buffer and warns when it could run out", () => {
    // Expenses 2500, buffer 1000. Low: 1000+1800-2500 = 300, then -400, then -1100.
    // Mid: 1000+3000-2500 = 1500, 2000, 2500.
    const f = run();
    expect(f.months.map((m) => m.endBufferLow)).toEqual([300, -400, -1100]);
    expect(f.months.map((m) => m.endBufferMid)).toEqual([1500, 2000, 2500]);
    // Low income 1800 < 2500 every month, but mid 3000 >= 2500, so "possible" not "likely".
    expect(f.months[0].warnings.map((w) => w.kind)).toEqual(["shortfall_possible"]);
    // Buffer first goes negative in December, warned once.
    expect(f.months[1].warnings.map((w) => w.kind)).toEqual(["shortfall_possible", "buffer_runs_out"]);
    expect(f.months[2].warnings.map((w) => w.kind)).toEqual(["shortfall_possible"]);
    expect(f.months.every((m) => m.lean)).toBe(true);
  });

  it("warns 'likely' when even the expected month misses expenses", () => {
    // Mid 3000 < 4000 expenses.
    const f = run({ monthlyEssentialExpenses: 4000 });
    expect(f.months[0].warnings[0].kind).toBe("shortfall_likely");
  });

  it("raises no warnings when even the low case covers expenses", () => {
    // Low 1800 >= 1500 expenses; buffer only grows.
    const f = run({ monthlyEssentialExpenses: 1500 });
    expect(f.months.every((m) => !m.lean && m.warnings.length === 0)).toBe(true);
  });

  it("warning messages are readable and name the month", () => {
    expect(run().months[0].warnings[0].message).toContain("2026-11");
  });
});

describe("outstanding invoices", () => {
  const invoice: OutstandingInvoice = {
    amount: 5000,
    earliestPay: d(2026, 11, 20),
    expectedPay: d(2026, 12, 5),
    latestPay: d(2027, 1, 10),
  };

  it("places the invoice by pay window and spans the scenarios", () => {
    // Early -> Nov, expected -> Dec, late -> Jan. Income per case is max(scheduled, baseline):
    // Nov: low 1800, mid 3000, high 5000  -> band 1800 / 3000 / 5000
    // Dec: low 1800, mid 5000, high 4200  -> band 1800 / 5000 / 5000 (spans all cases)
    // Jan: low 5000, mid 3000, high 4200  -> band 3000 / 3000 / 5000
    const f = run({ invoices: [invoice] });
    expect(f.months.map((m) => [m.low, m.mid, m.high])).toEqual([
      [1800, 3000, 5000],
      [1800, 5000, 5000],
      [3000, 3000, 5000],
    ]);
    // Low buffer: 1000+1800-2500 = 300, then -400, then -400+3000-2500 = 100.
    expect(f.months.map((m) => m.endBufferLow)).toEqual([300, -400, 100]);
    // The warning clears in January once low income covers expenses.
    expect(f.months[2].warnings).toEqual([]);
  });

  it("treats an overdue invoice as arriving this month", () => {
    const overdue = { amount: 5000, earliestPay: d(2026, 10, 1), expectedPay: d(2026, 10, 1), latestPay: d(2026, 10, 1) };
    const f = run({ invoices: [overdue] });
    expect([f.months[0].low, f.months[0].mid, f.months[0].high]).toEqual([5000, 5000, 5000]);
    expect(f.months[1].mid).toBe(3000);
  });

  it("ignores invoices expected beyond the 3-month horizon", () => {
    const far = { amount: 9999, earliestPay: d(2027, 3, 1), expectedPay: d(2027, 3, 1), latestPay: d(2027, 3, 1) };
    expect(run({ invoices: [far] }).months).toEqual(run().months);
  });

  it("counts money already received this month toward this month only", () => {
    // 2500 received 3 Nov: Nov = max(2500, baseline) -> low 2500, mid 3000, high 4200. Dec unchanged.
    const f = run({ payments: [...history(), pay(11, 2500, { receivedAt: d(2026, 11, 3) })] });
    expect([f.months[0].low, f.months[0].mid, f.months[0].high]).toEqual([2500, 3000, 4200]);
    expect([f.months[1].low, f.months[1].mid, f.months[1].high]).toEqual([1800, 3000, 4200]);
    // The current partial month must not change the baseline.
    expect(f.baseline.mid).toBe(3000);
  });
});

describe("refunds and disputes", () => {
  it("uses net amounts and skips a fully refunded payment", () => {
    // June fully refunded -> not counted; baseline starts July: 2000, 3000, 4000, 5000 (4 months).
    // p20: 0.6 -> 2000+0.6*1000 = 2600. median: 1.5 -> 3500. p80: 2.4 -> 4000+0.4*1000 = 4400.
    const f = run({ payments: [pay(6, 1000, { refundedAmount: 1000 }), ...history().slice(1)] });
    expect(f.baseline).toEqual({ low: 2600, mid: 3500, high: 4400, monthsObserved: 4 });
  });

  it("counts open and lost disputes as zero", () => {
    // October (5000) is under an open dispute, so October counts as 0: totals 1000,2000,3000,4000,0 ... 4 counted payments, 5 months.
    // Sorted: 0, 1000, 2000, 3000, 4000. p20 = 0.8 -> 800. median = 2000. p80 = 3.2 -> 3200.
    const f = run({ payments: [...history().slice(0, 4), pay(10, 5000, { disputeStatus: "open" })] });
    expect(f.baseline).toEqual({ low: 800, mid: 2000, high: 3200, monthsObserved: 5 });
  });
});

describe("not enough history", () => {
  it("is insufficient with fewer than 3 payments", () => {
    const f = forecastCashflow(input({ payments: [pay(9, 1000), pay(10, 2000)] }));
    expect(f.kind).toBe("insufficient");
  });

  it("is insufficient when all history is in the current month", () => {
    const f = forecastCashflow(input({ payments: [pay(11, 1000, { receivedAt: d(2026, 11, 1) })] }));
    expect(f.kind).toBe("insufficient");
  });

  it("is insufficient with 3 payments but under 2 full months", () => {
    // Three October payments: only 1 full month observed.
    const f = forecastCashflow(input({ payments: [pay(10, 100), pay(10, 200), pay(10, 300)] }));
    expect(f).toMatchObject({ kind: "insufficient" });
  });

  it("is insufficient with no payments", () => {
    expect(forecastCashflow(input({ payments: [] })).kind).toBe("insufficient");
  });
});

describe("invalid input", () => {
  it("throws on out-of-order invoice dates", () => {
    const bad = { amount: 100, earliestPay: d(2026, 12, 1), expectedPay: d(2026, 11, 1), latestPay: d(2027, 1, 1) };
    expect(() => forecastCashflow(input({ invoices: [bad] }))).toThrow(RangeError);
  });
  it("throws on negative expenses, negative buffer and zero-amount invoices", () => {
    expect(() => forecastCashflow(input({ monthlyEssentialExpenses: -1 }))).toThrow(RangeError);
    expect(() => forecastCashflow(input({ currentBuffer: -1 }))).toThrow(RangeError);
    const zero = { amount: 0, earliestPay: NOW, expectedPay: NOW, latestPay: NOW };
    expect(() => forecastCashflow(input({ invoices: [zero] }))).toThrow(RangeError);
  });
});
