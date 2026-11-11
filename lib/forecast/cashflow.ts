/**
 * Purpose: Deterministic 3-month cash-flow forecast shown as a LOW to HIGH band, with
 * lean-month warnings.
 * Inputs: payment history, outstanding invoices with a pay-date window, monthly essential
 * expenses, current buffer, and `now`. Plain arrays only: no database, so tests need no Postgres.
 * Outputs: per month a low / mid / high income band, projected buffer, and plain-language warnings.
 *
 * WHY a band: income for a freelancer is uncertain, so we never show a single number.
 * WHY plain code: the LLM may explain the forecast in words. It never calculates it.
 * Callers pass payments in ONE currency. Months are calendar months in UTC.
 *
 * How the numbers are built (also returned as `assumptions`, so the UI can show them):
 * 1. Baseline = typical month from the last 6 full months of NET payments (zero months count).
 *    low = 20th percentile, mid = median, high = 80th percentile.
 * 2. Outstanding invoices are placed by their pay-date window: late date for the low case,
 *    expected date for mid, early date for high.
 * 3. A month's income in each case is the larger of (money received or scheduled) and the
 *    baseline for that case, so scheduled invoices count toward a typical month, not on top of it.
 * 4. The band for a month spans all three cases (min to max), so low <= mid <= high always.
 */

export type DisputeStatus = "none" | "open" | "won" | "lost";

export type CashflowPayment = {
  amount: number;
  refundedAmount: number;
  disputeStatus: DisputeStatus;
  receivedAt: Date;
};

/** An invoice not yet paid. The window comes from the payment-timing model (timing.ts). */
export type OutstandingInvoice = {
  amount: number;
  /** Early case: client pays quickly. */
  earliestPay: Date;
  /** Most likely date. */
  expectedPay: Date;
  /** Late case: client pays slowly. */
  latestPay: Date;
};

export type CashflowInput = {
  payments: readonly CashflowPayment[];
  invoices: readonly OutstandingInvoice[];
  /** Essential monthly spending, from planner_inputs. */
  monthlyEssentialExpenses: number;
  /** Savings available now, from planner_inputs. */
  currentBuffer: number;
  now: Date;
};

export type WarningKind = "shortfall_likely" | "shortfall_possible" | "buffer_runs_out";

export type ForecastWarning = { kind: WarningKind; month: string; message: string };

export type ForecastMonth = {
  /** "YYYY-MM". */
  month: string;
  low: number;
  mid: number;
  high: number;
  /** Projected buffer at month end after expenses, in the low and mid cases. */
  endBufferLow: number;
  endBufferMid: number;
  /** True when any warning applies to this month. */
  lean: boolean;
  warnings: ForecastWarning[];
};

export type CashflowForecast =
  | {
      kind: "forecast";
      months: ForecastMonth[];
      totals: { low: number; mid: number; high: number };
      baseline: { low: number; mid: number; high: number; monthsObserved: number };
      assumptions: string[];
    }
  | { kind: "insufficient"; reason: string };

export const HORIZON_MONTHS = 3;
export const WINDOW_MONTHS = 6;
export const MIN_PAYMENTS = 3;
export const MIN_MONTHS_OBSERVED = 2;

const round2 = (n: number): number => Math.round(n * 100) / 100;
const monthIndex = (d: Date): number => d.getUTCFullYear() * 12 + d.getUTCMonth();

/** Index back to "YYYY-MM". */
function monthKey(idx: number): string {
  const year = Math.floor(idx / 12);
  const month = (idx % 12) + 1;
  return `${year}-${String(month).padStart(2, "0")}`;
}

/** Linear-interpolated percentile of an ascending-sorted list (p between 0 and 1). */
function percentile(sorted: readonly number[], p: number): number {
  const pos = p * (sorted.length - 1);
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

/**
 * Money the creative actually kept: payment minus refunds. Open and lost disputes count as
 * zero (at risk or gone), matching the split rules. Returns 0 when nothing counts.
 */
function netAmount(p: CashflowPayment): number {
  if (p.disputeStatus === "open" || p.disputeStatus === "lost") return 0;
  return Math.max(0, p.amount - p.refundedAmount);
}

/** Format an amount for a message, no currency symbol (the caller knows the currency). */
const fmt = (n: number): string => n.toLocaleString("en-US", { maximumFractionDigits: 0 });

/**
 * Build the 3-month forecast band. Returns `insufficient` when there is too little history
 * for an honest baseline (fewer than 3 counted payments or 2 full months).
 * Throws RangeError on invalid numbers or an invoice whose dates are out of order.
 */
export function forecastCashflow(input: CashflowInput): CashflowForecast {
  const { monthlyEssentialExpenses: expenses, currentBuffer, now } = input;
  if (!Number.isFinite(expenses) || expenses < 0) throw new RangeError("Monthly expenses must be zero or more.");
  if (!Number.isFinite(currentBuffer) || currentBuffer < 0) throw new RangeError("Current buffer must be zero or more.");
  for (const inv of input.invoices) {
    if (!(inv.amount > 0)) throw new RangeError("Invoice amount must be more than zero.");
    if (!(inv.earliestPay <= inv.expectedPay && inv.expectedPay <= inv.latestPay)) {
      throw new RangeError("Invoice pay dates must satisfy earliest <= expected <= latest.");
    }
  }

  const cur = monthIndex(now);
  const windowStart = cur - WINDOW_MONTHS;

  // Net payments with a positive amount, bucketed by calendar month.
  const counted = input.payments
    .map((p) => ({ idx: monthIndex(p.receivedAt), net: netAmount(p) }))
    .filter((p) => p.net > 0);

  const history = counted.filter((p) => p.idx >= windowStart && p.idx < cur);
  const receivedThisMonth = counted.filter((p) => p.idx === cur).reduce((s, p) => s + p.net, 0);

  if (history.length < MIN_PAYMENTS) {
    return { kind: "insufficient", reason: `Need at least ${MIN_PAYMENTS} payments in the last ${WINDOW_MONTHS} full months to forecast; found ${history.length}.` };
  }

  // WHY start at the first payment: months before someone started earning are not lean months.
  const firstIdx = Math.min(...history.map((p) => p.idx));
  const monthsObserved = cur - firstIdx;
  if (monthsObserved < MIN_MONTHS_OBSERVED) {
    return { kind: "insufficient", reason: `Need at least ${MIN_MONTHS_OBSERVED} full months of history to forecast; found ${monthsObserved}.` };
  }

  const monthlyTotals: number[] = [];
  for (let idx = firstIdx; idx < cur; idx++) {
    monthlyTotals.push(history.filter((p) => p.idx === idx).reduce((s, p) => s + p.net, 0));
  }
  const sorted = [...monthlyTotals].sort((a, b) => a - b);
  const base = {
    low: round2(percentile(sorted, 0.2)),
    mid: round2(percentile(sorted, 0.5)),
    high: round2(percentile(sorted, 0.8)),
  };

  // Scheduled invoice money per scenario per horizon month. Dates in the past count as "now".
  const scheduled = { low: [0, 0, 0], mid: [0, 0, 0], high: [0, 0, 0] };
  for (const inv of input.invoices) {
    const placements: [keyof typeof scheduled, Date][] = [
      ["low", inv.latestPay],
      ["mid", inv.expectedPay],
      ["high", inv.earliestPay],
    ];
    for (const [scenario, date] of placements) {
      const offset = monthIndex(date < now ? now : date) - cur;
      if (offset >= 0 && offset < HORIZON_MONTHS) scheduled[scenario][offset] += inv.amount;
    }
  }

  const months: ForecastMonth[] = [];
  let bufLow = currentBuffer;
  let bufMid = currentBuffer;
  let crossedZero = false;

  for (let offset = 0; offset < HORIZON_MONTHS; offset++) {
    const received = offset === 0 ? receivedThisMonth : 0;
    const key = monthKey(cur + offset);
    const income = {
      low: Math.max(received + scheduled.low[offset], base.low),
      mid: Math.max(received + scheduled.mid[offset], base.mid),
      high: Math.max(received + scheduled.high[offset], base.high),
    };
    // Band spans every scenario, so low <= mid <= high even when invoices reorder them.
    const low = round2(Math.min(income.low, income.mid, income.high));
    const high = round2(Math.max(income.low, income.mid, income.high));
    const mid = round2(income.mid);

    bufLow = round2(bufLow + low - expenses);
    bufMid = round2(bufMid + mid - expenses);

    const warnings: ForecastWarning[] = [];
    if (mid < expenses) {
      warnings.push({ kind: "shortfall_likely", month: key, message: `${key}: expected income (${fmt(mid)}) is below your essential expenses (${fmt(expenses)}).` });
    } else if (low < expenses) {
      warnings.push({ kind: "shortfall_possible", month: key, message: `${key}: in a slow month income could be ${fmt(low)}, below your essential expenses (${fmt(expenses)}).` });
    }
    // WHY first crossing only: one warning for "when it runs out" is enough.
    if (bufLow < 0 && !crossedZero) {
      crossedZero = true;
      warnings.push({ kind: "buffer_runs_out", month: key, message: `${key}: in a slow run your buffer could run out.` });
    } else if (bufLow >= 0) {
      crossedZero = false;
    }

    months.push({ month: key, low, mid, high, endBufferLow: bufLow, endBufferMid: bufMid, lean: warnings.length > 0, warnings });
  }

  const totals = {
    low: round2(months.reduce((s, m) => s + m.low, 0)),
    mid: round2(months.reduce((s, m) => s + m.mid, 0)),
    high: round2(months.reduce((s, m) => s + m.high, 0)),
  };

  const assumptions = [
    `A typical month is estimated from your last ${monthsObserved} full months of payments (after refunds; open or lost disputes count as zero).`,
    "The low case is a slow month (20th percentile), the high case a strong month (80th percentile).",
    "Unpaid invoices are placed using each client's likely pay date: late for low, expected for mid, early for high.",
    "Scheduled invoices count toward a typical month, not on top of it.",
    "This is a projection, not a promise.",
  ];

  return { kind: "forecast", months, totals, baseline: { ...base, monthsObserved }, assumptions };
}
