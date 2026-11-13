/**
 * Purpose: Thresholds for pre-invoice flags (advice only — never a block).
 * Inputs: none (static config shown in the UI).
 * Outputs: median multiplier and first-invoice amount ceiling.
 */

export const INVOICE_CHECK_CONFIG = {
  /** Flag when amount > this × median of recent paid invoices. */
  amountMedianMultiplier: 3,
  /** Flag a first invoice above this amount (USD-equivalent units as stored). */
  firstInvoiceAmount: 500,
  /** Minimum project completeness percent before "low completeness" flag. */
  minProjectCompleteness: 50,
  /** How many recent paid invoices feed the median. */
  recentPaidLimit: 10,
} as const;
