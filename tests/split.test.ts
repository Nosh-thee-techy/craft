/**
 * Purpose: Unit tests for income split proposals and approve/reject transitions.
 * Inputs: calls the real functions in lib/ledger/split.ts with hand-built payments (no database).
 * Outputs: pass/fail. Expected numbers are derived in the comment above each assertion.
 */
import { describe, expect, it } from "vitest";
import {
  approveEntry,
  proposeSplit,
  rejectEntry,
  toMinor,
  validateSplitRules,
  type SplitPayment,
  type SplitRules,
} from "@/lib/ledger/split";

const RULES: SplitRules = { taxPct: 20, savingsPct: 30, expensesPct: 50 };

function payment(amount: number, extra: Partial<SplitPayment> = {}): SplitPayment {
  return { amount, refundedAmount: 0, disputeStatus: "none", ...extra };
}

function sum(entries: { amount: number }[]): number {
  return entries.reduce((s, e) => s + toMinor(e.amount), 0);
}

describe("validateSplitRules", () => {
  it("accepts rules that add to 100", () => {
    expect(validateSplitRules(RULES)).toEqual({ ok: true });
  });
  it("accepts 33.33 + 33.33 + 33.34 exactly", () => {
    expect(validateSplitRules({ taxPct: 33.33, savingsPct: 33.33, expensesPct: 33.34 }).ok).toBe(true);
  });
  it("rejects a total other than 100", () => {
    const r = validateSplitRules({ taxPct: 20, savingsPct: 30, expensesPct: 40 });
    expect(r).toEqual({ ok: false, error: "Tax, savings, and expenses must add up to 100%." });
  });
  it("rejects negative and over-100 values", () => {
    expect(validateSplitRules({ taxPct: -10, savingsPct: 60, expensesPct: 50 }).ok).toBe(false);
    expect(validateSplitRules({ taxPct: 101, savingsPct: 0, expensesPct: -1 }).ok).toBe(false);
  });
  it("rejects more than 2 decimals and NaN", () => {
    expect(validateSplitRules({ taxPct: 33.333, savingsPct: 33.333, expensesPct: 33.334 }).ok).toBe(false);
    expect(validateSplitRules({ taxPct: NaN, savingsPct: 50, expensesPct: 50 }).ok).toBe(false);
  });
});

describe("proposeSplit", () => {
  it("splits a clean amount by the rules", () => {
    // 10000 * 20% = 2000, * 30% = 3000, * 50% = 5000
    const p = proposeSplit(payment(10000), RULES);
    expect(p.kind).toBe("proposed");
    expect(p.entries.map((e) => [e.bucket, e.amount])).toEqual([
      ["tax", 2000],
      ["savings", 3000],
      ["expenses", 5000],
    ]);
  });

  it("copies the percentage, starts as proposed, and gives a reason", () => {
    const [tax] = proposeSplit(payment(10000), RULES).entries;
    expect(tax.pctApplied).toBe(20);
    expect(tax.status).toBe("proposed");
    expect(tax.approvedAt).toBeNull();
    expect(tax.reason).toBe("Tax gets 20% of 10000.00.");
  });

  it("always sums exactly to the amount, even when cents do not divide evenly", () => {
    // 100.01 across 33.33/33.33/33.34: floors are 3333,3333,3334 = 10000, one cent left over
    const rules = { taxPct: 33.33, savingsPct: 33.33, expensesPct: 33.34 };
    const p = proposeSplit(payment(100.01), rules);
    expect(sum(p.entries)).toBe(10001);
  });

  it("gives leftover cents to the largest remainders, tax first on a tie", () => {
    // 0.01 split 34/33/33: exact shares 0.34, 0.33, 0.33 cents. Tax has the biggest remainder.
    const p = proposeSplit(payment(0.01), { taxPct: 34, savingsPct: 33, expensesPct: 33 });
    expect(p.entries.map((e) => e.amount)).toEqual([0.01, 0, 0]);
    // 0.01 split 25/25/50: expenses has the biggest remainder.
    const q = proposeSplit(payment(0.01), { taxPct: 25, savingsPct: 25, expensesPct: 50 });
    expect(q.entries.map((e) => e.amount)).toEqual([0, 0, 0.01]);
  });

  it("does not drift on float-unfriendly amounts", () => {
    for (const amount of [0.1, 0.2, 0.3, 19.99, 1234.57, 99999.99]) {
      const p = proposeSplit(payment(amount), RULES);
      expect(sum(p.entries)).toBe(toMinor(amount));
    }
  });

  it("allows a 100% single-bucket rule", () => {
    const p = proposeSplit(payment(500), { taxPct: 0, savingsPct: 0, expensesPct: 100 });
    expect(p.entries.map((e) => e.amount)).toEqual([0, 0, 500]);
  });

  it("splits the net amount after a partial refund", () => {
    // 10000 - 2000 refunded = 8000; 20% = 1600, 30% = 2400, 50% = 4000
    const p = proposeSplit(payment(10000, { refundedAmount: 2000 }), RULES);
    expect(p.netAmount).toBe(8000);
    expect(p.entries.map((e) => e.amount)).toEqual([1600, 2400, 4000]);
    expect(p.entries[0].reason).toBe("Tax gets 20% of 8000.00 (after refunds).");
  });

  it("skips a fully refunded payment", () => {
    const p = proposeSplit(payment(5000, { refundedAmount: 5000 }), RULES);
    expect(p).toMatchObject({ kind: "skipped", netAmount: 0, entries: [] });
  });

  it("skips while a dispute is open and when it was lost", () => {
    expect(proposeSplit(payment(5000, { disputeStatus: "open" }), RULES).kind).toBe("skipped");
    expect(proposeSplit(payment(5000, { disputeStatus: "lost" }), RULES).kind).toBe("skipped");
  });

  it("splits normally when a dispute was won", () => {
    expect(proposeSplit(payment(5000, { disputeStatus: "won" }), RULES).kind).toBe("proposed");
  });

  it("is idempotent: same inputs, same proposal", () => {
    expect(proposeSplit(payment(777.77), RULES)).toEqual(proposeSplit(payment(777.77), RULES));
  });

  it("throws on invalid rules, negative amounts and over-refunds", () => {
    expect(() => proposeSplit(payment(100), { taxPct: 10, savingsPct: 10, expensesPct: 10 })).toThrow(RangeError);
    expect(() => proposeSplit(payment(-1), RULES)).toThrow(RangeError);
    expect(() => proposeSplit(payment(100, { refundedAmount: 100.01 }), RULES)).toThrow(RangeError);
  });
});

describe("approve and reject", () => {
  const NOW = new Date(Date.UTC(2026, 10, 11));

  it("approving stamps approvedAt", () => {
    expect(approveEntry({ status: "proposed", approvedAt: null }, NOW)).toEqual({ status: "approved", approvedAt: NOW });
  });
  it("rejecting leaves approvedAt empty", () => {
    expect(rejectEntry({ status: "proposed", approvedAt: null })).toEqual({ status: "rejected", approvedAt: null });
  });
  it("cannot change an entry that is already decided", () => {
    const approved = { status: "approved" as const, approvedAt: NOW };
    const rejected = { status: "rejected" as const, approvedAt: null };
    expect(() => approveEntry(approved, NOW)).toThrow();
    expect(() => rejectEntry(approved)).toThrow();
    expect(() => approveEntry(rejected, NOW)).toThrow();
  });
});
