/**
 * Purpose: Days-to-pay windows for outstanding invoices (early / expected / late).
 * Inputs: optional paid-history rows (synthetic or live) and an invoice sent date.
 * Outputs: a pay window in days, plus earliest/expected/latest Date for cashflow.
 *
 * WHY defaults 14 / 30 / 45: when history is thin we still give cashflow a band,
 * not a single date. Pure code — the LLM never invents pay dates.
 * Educational / planning only. Not a promise that a client will pay.
 */

/** Default window when a client has no usable history. */
export const DEFAULT_PAY_WINDOW = {
  earlyDays: 14,
  expectedDays: 30,
  lateDays: 45,
} as const;

export type PayWindow = {
  earlyDays: number;
  expectedDays: number;
  lateDays: number;
  /** Where the numbers came from. */
  source: "history" | "default";
  sampleSize: number;
};

/** One completed invoice→pay observation. Synthetic rows are fine when labelled. */
export type PayHistoryRow = {
  clientKey: string;
  invoiceDate: Date;
  paidDate: Date | null;
  isSynthetic?: boolean;
};

/**
 * Days between invoice and pay. Null when unpaid or dates are inverted.
 */
export function daysToPay(invoiceDate: Date, paidDate: Date | null): number | null {
  if (!paidDate) return null;
  const ms = paidDate.getTime() - invoiceDate.getTime();
  if (ms < 0) return null;
  return Math.round(ms / 86_400_000);
}

/**
 * Build a pay window from observed days. Needs at least 2 samples; otherwise defaults.
 * early = 20th percentile, expected = median, late = 80th percentile (clamped ≥ early).
 */
export function windowFromDays(days: readonly number[]): PayWindow {
  const clean = days.filter((d) => Number.isFinite(d) && d >= 0);
  if (clean.length < 2) {
    return { ...DEFAULT_PAY_WINDOW, source: "default", sampleSize: clean.length };
  }
  const sorted = [...clean].sort((a, b) => a - b);
  const earlyDays = Math.max(1, Math.round(percentile(sorted, 0.2)));
  const expectedDays = Math.max(earlyDays, Math.round(percentile(sorted, 0.5)));
  const lateDays = Math.max(expectedDays, Math.round(percentile(sorted, 0.8)));
  return { earlyDays, expectedDays, lateDays, source: "history", sampleSize: sorted.length };
}

/**
 * Pay window for one client. Falls back to the default 14 / 30 / 45 band.
 */
export function payWindowForClient(
  history: readonly PayHistoryRow[],
  clientKey: string,
): PayWindow {
  const key = clientKey.trim().toLowerCase();
  const days = history
    .filter((row) => row.clientKey.trim().toLowerCase() === key)
    .map((row) => daysToPay(row.invoiceDate, row.paidDate))
    .filter((d): d is number => d !== null);
  return windowFromDays(days);
}

/**
 * Overall studio window across all clients (for invoices with no client key).
 */
export function payWindowOverall(history: readonly PayHistoryRow[]): PayWindow {
  const days = history
    .map((row) => daysToPay(row.invoiceDate, row.paidDate))
    .filter((d): d is number => d !== null);
  return windowFromDays(days);
}

/**
 * Map a sent-at date + window onto the three dates cashflow expects.
 */
export function datesFromWindow(
  sentAt: Date,
  window: PayWindow,
): { earliestPay: Date; expectedPay: Date; latestPay: Date } {
  return {
    earliestPay: addDays(sentAt, window.earlyDays),
    expectedPay: addDays(sentAt, window.expectedDays),
    latestPay: addDays(sentAt, window.lateDays),
  };
}

/**
 * Convenience: outstanding invoice shape for `forecastCashflow`.
 */
export function outstandingFromSent(args: {
  amount: number;
  sentAt: Date;
  window: PayWindow;
}): {
  amount: number;
  earliestPay: Date;
  expectedPay: Date;
  latestPay: Date;
} {
  const dates = datesFromWindow(args.sentAt, args.window);
  return { amount: args.amount, ...dates };
}

function addDays(from: Date, days: number): Date {
  return new Date(from.getTime() + days * 86_400_000);
}

/** Linear-interpolated percentile of an ascending-sorted list (p between 0 and 1). */
function percentile(sorted: readonly number[], p: number): number {
  const pos = p * (sorted.length - 1);
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return sorted[lo] ?? 0;
  return (sorted[lo] ?? 0) + ((sorted[hi] ?? 0) - (sorted[lo] ?? 0)) * (pos - lo);
}
