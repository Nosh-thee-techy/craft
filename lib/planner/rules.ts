/**
 * Purpose: Deterministic planner rules. Sizes an emergency buffer from income volatility, then
 * decides where this month's spare cash goes: buffer first, then debt, then long-term investing.
 * Inputs: a cash-flow forecast (from lib/forecast/cashflow.ts), essential expenses, current buffer,
 * debts, and the tax percentage from the creative's split rules. Plain numbers, no database.
 * Outputs: a plan with three steps (each with an amount and a plain-language reason) and one
 * "safe to invest this month" number.
 *
 * WHY plain code: the LLM may explain the plan in words. It never calculates money.
 * WHY the LOW case: "safe" means it still works in a slow month, so spare cash is measured on the
 * low end of the forecast band, not the expected income.
 * Assumptions: essential expenses do NOT include debt minimum payments (those are added here).
 * All amounts are in one currency. Educational planning only, not financial advice.
 */
import type { CashflowForecast } from "@/lib/forecast/cashflow";

/** Pure version of the stored PlannerDebt: the caller converts decimal strings to numbers. */
export type DebtInput = {
  label: string;
  balance: number;
  minMonthly: number;
  /** Annual interest rate in percent. 0 for interest-free (informal) debt. */
  aprPct: number;
};

export type PlannerInput = {
  forecast: CashflowForecast;
  monthlyEssentialExpenses: number;
  currentBuffer: number;
  debts: readonly DebtInput[];
  /** Tax share from split_rules (0 to 100). Tax money is never spare cash. Defaults to 0. */
  taxPct?: number;
};

export type StepKey = "buffer" | "debt" | "invest";

export type PlanStep = {
  key: StepKey;
  label: string;
  /** This month's amount in major units, 2 decimals. */
  amount: number;
  reason: string;
  /** For the debt step: how the amount is split across debts (highest interest first). */
  allocations?: { label: string; amount: number }[];
};

export type Plan =
  | {
      kind: "plan";
      /** "YYYY-MM", the month the plan is for (the forecast's first month). */
      month: string;
      /** Spread of the typical month: (high - low) / mid. Higher means less predictable income. */
      volatility: number;
      bufferMonths: number;
      bufferTarget: number;
      bufferGap: number;
      lowIncome: number;
      taxReserve: number;
      essentialExpenses: number;
      debtMinimums: number;
      /** Spare cash in a slow month after tax, essentials and debt minimums. Can be negative. */
      freeCash: number;
      steps: [PlanStep, PlanStep, PlanStep];
      /** The headline number. Never negative. */
      safeToInvest: number;
      notes: string[];
    }
  | { kind: "insufficient"; reason: string };

/** Volatility tiers: how many months of essentials the buffer should cover. */
export const BUFFER_TIERS: readonly { maxVolatility: number; months: number }[] = [
  { maxVolatility: 0.5, months: 3 },
  { maxVolatility: 1.0, months: 4 },
  { maxVolatility: 1.5, months: 5 },
  { maxVolatility: Infinity, months: 6 },
];

const toCents = (n: number): number => Math.round(n * 100);
const fromCents = (c: number): number => c / 100;
const fmt = (n: number): string => n.toLocaleString("en-US", { maximumFractionDigits: 0 });

/** How unpredictable income is: (high - low) / mid. A zero typical month counts as very volatile. */
export function volatilityOf(baseline: { low: number; mid: number; high: number }): number {
  if (baseline.mid <= 0) return Infinity;
  return (baseline.high - baseline.low) / baseline.mid;
}

/** Months of essential expenses to hold as an emergency buffer, from income volatility. */
export function bufferMonthsFor(volatility: number): number {
  return (BUFFER_TIERS.find((t) => volatility < t.maxVolatility) ?? BUFFER_TIERS[BUFFER_TIERS.length - 1]).months;
}

/**
 * Build this month's plan. Order is fixed: emergency buffer, then debt (highest interest first),
 * then investing. Returns `insufficient` when the forecast does not have enough history.
 * Throws RangeError on invalid numbers.
 */
export function buildPlan(input: PlannerInput): Plan {
  const { forecast, monthlyEssentialExpenses: expenses, currentBuffer, debts } = input;
  const taxPct = input.taxPct ?? 0;
  if (!Number.isFinite(expenses) || expenses < 0) throw new RangeError("Monthly expenses must be zero or more.");
  if (!Number.isFinite(currentBuffer) || currentBuffer < 0) throw new RangeError("Current buffer must be zero or more.");
  if (!Number.isFinite(taxPct) || taxPct < 0 || taxPct > 100) throw new RangeError("Tax percentage must be between 0 and 100.");
  for (const d of debts) {
    if (!(d.balance >= 0) || !(d.minMonthly >= 0) || !(d.aprPct >= 0)) {
      throw new RangeError(`Debt "${d.label}" must have a balance, minimum payment and interest rate of zero or more.`);
    }
  }

  if (forecast.kind === "insufficient") {
    return { kind: "insufficient", reason: `A plan needs a forecast first. ${forecast.reason}` };
  }

  const first = forecast.months[0];
  const volatility = volatilityOf(forecast.baseline);
  const bufferMonths = bufferMonthsFor(volatility);
  const bufferTargetC = toCents(expenses) * bufferMonths;
  const bufferGapC = Math.max(0, bufferTargetC - toCents(currentBuffer));

  // Spare cash in a slow month. Debt minimums cannot exceed what is owed.
  const lowC = toCents(first.low);
  const taxC = Math.round((lowC * taxPct) / 100);
  const minimumsC = debts.reduce((s, d) => s + Math.min(toCents(d.minMonthly), toCents(d.balance)), 0);
  const freeC = lowC - taxC - toCents(expenses) - minimumsC;
  let remainingC = Math.max(0, freeC);

  const notes: string[] = [];

  // Step 1: buffer.
  const bufferC = Math.min(remainingC, bufferGapC);
  remainingC -= bufferC;

  // Step 2: debt above the minimums, highest interest first. Each debt's room is balance minus
  // this month's minimum, because the minimum is already paid out of the spare-cash calculation.
  const allocations: { label: string; amount: number }[] = [];
  let debtC = 0;
  const byInterest = [...debts].sort((a, b) => b.aprPct - a.aprPct);
  for (const d of byInterest) {
    const room = toCents(d.balance) - Math.min(toCents(d.minMonthly), toCents(d.balance));
    const pay = Math.min(remainingC, room);
    if (pay > 0) {
      allocations.push({ label: d.label, amount: fromCents(pay) });
      debtC += pay;
      remainingC -= pay;
    }
  }

  // Step 3: investing, only if nothing earlier is unfinished and the forecast never runs dry.
  const bufferWillRunOut = forecast.months.some((m) => m.warnings.some((w) => w.kind === "buffer_runs_out"));
  let investC = 0;
  if (remainingC > 0) {
    if (bufferWillRunOut) {
      notes.push("Investing is held back because the forecast shows your buffer could run out in a slow run.");
    } else {
      investC = remainingC;
    }
  }
  const heldBackC = remainingC - investC;
  if (heldBackC > 0) notes.push(`${fmt(fromCents(heldBackC))} is left as spare cash for now.`);
  if (freeC < 0) notes.push("In a slow month your income does not cover tax, essentials and debt minimums, so nothing is set aside.");

  const bufferStepReason =
    bufferGapC === 0
      ? `Your buffer of ${fmt(currentBuffer)} already meets the target of ${fmt(fromCents(bufferTargetC))} (${bufferMonths} months of essentials).`
      : `Income swings ${volatility === Infinity ? "a lot" : `by about ${Math.round(volatility * 100)}% around a typical month`}, so the target is ${bufferMonths} months of essentials: ${fmt(fromCents(bufferTargetC))}. You are ${fmt(fromCents(bufferGapC))} short, and this month ${fmt(fromCents(bufferC))} goes there.`;

  const totalDebtC = debts.reduce((s, d) => s + toCents(d.balance), 0);
  const debtStepReason =
    debts.length === 0
      ? "You listed no debts."
      : bufferGapC > 0 && debtC === 0
        ? "Debt extra payments wait until the buffer is full. Minimum payments are still counted."
        : debtC === 0
          ? `Nothing left over for extra payments this month. Minimums of ${fmt(fromCents(minimumsC))} are counted. Total owed: ${fmt(fromCents(totalDebtC))}.`
          : `Extra payments go to the highest interest rate first, ${fmt(fromCents(debtC))} this month.`;

  const investReason =
    investC > 0
      ? `Once buffer and debt are covered, ${fmt(fromCents(investC))} is left that still works in a slow month.`
      : bufferGapC > 0
        ? "Investing comes after the buffer is full."
        : debtC > 0 || totalDebtC > 0
          ? "Investing comes after debt is cleared."
          : "No spare cash to invest this month, even in the slow case.";

  return {
    kind: "plan",
    month: first.month,
    volatility,
    bufferMonths,
    bufferTarget: fromCents(bufferTargetC),
    bufferGap: fromCents(bufferGapC),
    lowIncome: first.low,
    taxReserve: fromCents(taxC),
    essentialExpenses: expenses,
    debtMinimums: fromCents(minimumsC),
    freeCash: fromCents(freeC),
    steps: [
      { key: "buffer", label: "Emergency buffer", amount: fromCents(bufferC), reason: bufferStepReason },
      { key: "debt", label: "Pay down debt", amount: fromCents(debtC), reason: debtStepReason, allocations },
      { key: "invest", label: "Long-term investing (educational)", amount: fromCents(investC), reason: investReason },
    ],
    safeToInvest: fromCents(investC),
    notes,
  };
}
