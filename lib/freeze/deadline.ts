/**
 * Purpose: Days-left helpers for limitation notice deadlines (Phase 2 E).
 * Inputs: deadline date + today; case status string.
 * Outputs: days remaining and reminder flags (3-day and 1-day).
 */

export const CASE_STATUSES = [
  "exported",
  "sent",
  "waiting",
  "resolved",
  "rejected",
] as const;

export type CaseStatus = (typeof CASE_STATUSES)[number];

/**
 * Whole days from today (UTC date) until deadline. Negative if past.
 */
export function daysUntilDeadline(deadlineAt: Date, today = new Date()): number {
  const start = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const end = Date.UTC(
    deadlineAt.getUTCFullYear(),
    deadlineAt.getUTCMonth(),
    deadlineAt.getUTCDate(),
  );
  return Math.round((end - start) / (24 * 60 * 60 * 1000));
}

/**
 * True when the user should see a 3-day or 1-day reminder (in-app; email is cut-line).
 */
export function deadlineReminderDue(
  deadlineAt: Date,
  today = new Date(),
): { due: boolean; kind: "3d" | "1d" | null; daysLeft: number } {
  const daysLeft = daysUntilDeadline(deadlineAt, today);
  if (daysLeft === 3) return { due: true, kind: "3d", daysLeft };
  if (daysLeft === 1) return { due: true, kind: "1d", daysLeft };
  return { due: false, kind: null, daysLeft };
}
