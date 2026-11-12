/**
 * Purpose: Guard the demo seed against the currency mismatch that once made /money show a
 * nonsense forecast (USD payments read against KES expenses).
 * Inputs: data/seed/demo-creative.json, plus the real `buildMoneyView`. No database.
 * Outputs: pass/fail. Fails if project and planner currencies differ, or if the seeded demo creative
 * would see a shortfall warning or a zero safe-to-invest on the demo day or when judges open it later.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildMoneyView } from "@/lib/money/build-view";

type SeedProject = { clientName: string; clientEmail: string; currency: string; amount: string; status: string; payment: { amount: string; monthsAgo: number } | null };
type Seed = {
  plannerInputs: { currency: string; monthlyEssentialExpenses: string; currentBuffer: string; debtsJson: { label: string; balance: string; minMonthly: string; aprPct: number }[] };
  splitRules: { taxPct: string; savingsPct: string; expensesPct: string };
  projects: SeedProject[];
  syntheticPaymentHistory: { clientName: string; invoiceDaysAgo: number; paidDaysAfter: number | null }[];
};

const seed = JSON.parse(readFileSync("data/seed/demo-creative.json", "utf8")) as Seed;

/** The moment the seed script runs. Payments and history are dated relative to it. */
const SEED_TIME = new Date(Date.UTC(2026, 10, 12, 12, 0, 0));
const DAY = 86_400_000;
const monthsAgo = (m: number) => new Date(Date.UTC(SEED_TIME.getUTCFullYear(), SEED_TIME.getUTCMonth() - m, 12, 10, 0, 0));

/** The money view as the live page would build it, `now` days after the seed ran. */
function viewAt(now: Date) {
  const payments = seed.projects
    .filter((p) => p.payment)
    .map((p, i) => ({
      id: `p${i}`,
      amount: Number(p.payment!.amount),
      refundedAmount: 0,
      disputeStatus: "none" as const,
      receivedAt: monthsAgo(p.payment!.monthsAgo),
      clientEmail: p.clientEmail,
      clientName: p.clientName,
      currency: p.currency,
    }));
  const outstandingInvoices = seed.projects
    .filter((p) => p.status === "invoiced" && !p.payment)
    .map((p) => ({ id: p.clientName, amount: Number(p.amount), sentAt: SEED_TIME, clientEmail: p.clientEmail, clientName: p.clientName, currency: p.currency }));
  const payHistory = seed.syntheticPaymentHistory.map((h) => {
    const invoiceDate = new Date(SEED_TIME.getTime() - h.invoiceDaysAgo * DAY);
    return {
      clientKey: h.clientName.toLowerCase(),
      invoiceDate,
      paidDate: h.paidDaysAfter === null ? null : new Date(invoiceDate.getTime() + h.paidDaysAfter * DAY),
      isSynthetic: true,
    };
  });
  const p = seed.plannerInputs;
  return buildMoneyView({
    now,
    currency: p.currency,
    payments,
    projects: [{ id: "a", evidenceCompleteness: 60 }],
    deliverables: [],
    outstandingInvoices,
    payHistory,
    planner: {
      monthlyEssentialExpenses: Number(p.monthlyEssentialExpenses),
      currentBuffer: Number(p.currentBuffer),
      debts: p.debtsJson.map((d) => ({ label: d.label, balance: Number(d.balance), minMonthly: Number(d.minMonthly), aprPct: d.aprPct })),
    },
    splitRules: { taxPct: Number(seed.splitRules.taxPct), savingsPct: Number(seed.splitRules.savingsPct), expensesPct: Number(seed.splitRules.expensesPct) },
    ledger: [],
  });
}

describe("demo seed currency", () => {
  it("uses one currency for every project and the planner inputs", () => {
    const currencies = new Set([seed.plannerInputs.currency, ...seed.projects.map((p) => p.currency)]);
    expect([...currencies]).toHaveLength(1);
  });
});

describe("demo creative on /money", () => {
  // Demo day, end of the seed month, and the last day before judging closes (15 Dec).
  const VIEW_DATES = [new Date(Date.UTC(2026, 10, 12, 12)), new Date(Date.UTC(2026, 10, 30, 12)), new Date(Date.UTC(2026, 11, 15, 12))];

  it.each(VIEW_DATES.map((d) => [d.toISOString().slice(0, 10), d] as const))("shows a sensible plan on %s", (_label, now) => {
    const v = viewAt(now);
    if (v.forecast.kind !== "forecast") throw new Error("expected a forecast");
    if (v.plan.kind !== "plan") throw new Error("expected a plan");

    // No unit-mismatch symptoms: no "shortfall likely", no "buffer runs out".
    const kinds = v.forecast.months.flatMap((m) => m.warnings.map((w) => w.kind));
    expect(kinds).not.toContain("shortfall_likely");
    expect(kinds).not.toContain("buffer_runs_out");

    // There is something safe to invest, so the demo scene has a number and a range to show.
    expect(v.safeToInvest).toBeGreaterThan(0);
    expect(v.simulation.kind).not.toBe("skipped");
  });

  it("on demo day: 400 essentials, buffer already at target, 60 extra to the camera loan, 403 safe to invest", () => {
    // Nov low case: 510 received + 780 Kanga invoice (client pays in 5 to 6 days) = 1290.
    // Spare = 1290 - 387 tax (30%) - 400 essentials - 40 loan minimum = 463.
    // Buffer target 5 months x 400 = 2000, already met. Loan room = 100 - 40 = 60. Invest 463 - 60 = 403.
    const v = viewAt(VIEW_DATES[0]);
    if (v.plan.kind !== "plan") throw new Error("expected a plan");
    expect(v.plan.freeCash).toBe(463);
    expect(v.plan.steps.map((s) => s.amount)).toEqual([0, 60, 403]);
    expect(v.safeToInvest).toBe(403);
  });
});
