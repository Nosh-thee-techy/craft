/**
 * Purpose: Deterministic income stability and trust score (0–100) with per-component points.
 * Inputs: plain arrays of payments, per-project evidence completeness, deliverables, and `now`.
 * Outputs: total score (or null when history is too thin), six components, each with a reason.
 *
 * WHY plain code: the LLM may explain the score in words. It never calculates it.
 * WHY no db import: callers map database rows to these shapes, so tests need no Postgres.
 * Wording: this is an "income stability and trust score", never a "credit score".
 */

export type DisputeStatus = "none" | "open" | "won" | "lost";

export type ScorePayment = {
  /** Stable key for the paying client (client id, or normalised client name). */
  clientKey: string;
  amount: number;
  receivedAt: Date;
  refundedAmount: number;
  disputeStatus: DisputeStatus;
};

export type ScoreProject = {
  /** 0–100, from `completenessFromTypes(...).score`. */
  evidenceCompleteness: number;
};

export type ScoreDeliverable = {
  deliveredAt: Date | null;
  clientConfirmedAt: Date | null;
};

export type StabilityInput = {
  payments: readonly ScorePayment[];
  projects: readonly ScoreProject[];
  deliverables: readonly ScoreDeliverable[];
  now: Date;
};

export type ComponentKey =
  | "regularity"
  | "variance"
  | "diversity"
  | "refunds_disputes"
  | "evidence"
  | "delivery_confirmations";

export type ScoreComponent = {
  key: ComponentKey;
  label: string;
  points: number;
  max: number;
  reason: string;
};

export type StabilityBand = "strong" | "steady" | "building" | "early";

export type StabilityScore = {
  /** Sum of component points, or null when there is not enough payment history. */
  total: number | null;
  band: StabilityBand | null;
  sufficientData: boolean;
  components: ScoreComponent[];
  windowMonths: number;
  paymentsInWindow: number;
};

export const WINDOW_MONTHS = 6;
export const MIN_PAYMENTS = 3;

export const MAX_POINTS: Record<ComponentKey, number> = {
  regularity: 25,
  variance: 20,
  diversity: 15,
  refunds_disputes: 15,
  evidence: 15,
  delivery_confirmations: 10,
};

/** Variance: a coefficient of variation at or above this earns 0 points. */
const CV_ZERO_POINTS = 1.5;
/** Diversity: a top-client share at or below this earns full points. */
const TOP_SHARE_FULL_POINTS = 0.4;
/** Refunds and disputes: an at-risk share at or above this earns 0 points. */
const AT_RISK_ZERO_POINTS = 0.2;

/**
 * Compute the income stability and trust score.
 */
export function computeStabilityScore(input: StabilityInput): StabilityScore {
  const windowStart = windowStartUtc(input.now, WINDOW_MONTHS);
  const payments = input.payments.filter(
    (p) => p.receivedAt >= windowStart && p.receivedAt <= input.now && p.amount > 0,
  );

  const components: ScoreComponent[] = [
    regularityComponent(payments, input.now),
    varianceComponent(payments, input.now),
    diversityComponent(payments),
    refundsDisputesComponent(payments),
    evidenceComponent(input.projects),
    deliveryComponent(input.deliverables, input.now),
  ];

  const sufficientData = payments.length >= MIN_PAYMENTS;
  const total = sufficientData ? components.reduce((sum, c) => sum + c.points, 0) : null;

  return {
    total,
    band: total === null ? null : bandFor(total),
    sufficientData,
    components,
    windowMonths: WINDOW_MONTHS,
    paymentsInWindow: payments.length,
  };
}

/**
 * Map a total to a plain-language band.
 */
export function bandFor(total: number): StabilityBand {
  if (total >= 80) return "strong";
  if (total >= 60) return "steady";
  if (total >= 40) return "building";
  return "early";
}

/**
 * Payment regularity: share of window months that had at least one payment.
 */
function regularityComponent(payments: readonly ScorePayment[], now: Date): ScoreComponent {
  const totals = monthlyTotals(payments, now);
  const active = totals.filter((t) => t > 0).length;
  const points = Math.round(MAX_POINTS.regularity * (active / WINDOW_MONTHS));
  return {
    key: "regularity",
    label: "Payment regularity",
    points,
    max: MAX_POINTS.regularity,
    reason: `Money arrived in ${active} of the last ${WINDOW_MONTHS} months.`,
  };
}

/**
 * Income variance: lower month-to-month swings (coefficient of variation) earn more points.
 */
function varianceComponent(payments: readonly ScorePayment[], now: Date): ScoreComponent {
  const totals = monthlyTotals(payments, now);
  const mean = totals.reduce((a, b) => a + b, 0) / totals.length;
  if (mean === 0) {
    return {
      key: "variance",
      label: "Income steadiness",
      points: 0,
      max: MAX_POINTS.variance,
      reason: "No income recorded in the window, so steadiness cannot be shown.",
    };
  }
  const variance = totals.reduce((sum, t) => sum + (t - mean) ** 2, 0) / totals.length;
  const cv = Math.sqrt(variance) / mean;
  const points = Math.round(MAX_POINTS.variance * (1 - clamp01(cv / CV_ZERO_POINTS)));
  return {
    key: "variance",
    label: "Income steadiness",
    points,
    max: MAX_POINTS.variance,
    reason: `Monthly income swings by about ${Math.round(cv * 100)}% around its average.`,
  };
}

/**
 * Client diversity: income spread across clients; reliance on one client costs points.
 */
function diversityComponent(payments: readonly ScorePayment[]): ScoreComponent {
  const byClient = new Map<string, number>();
  let gross = 0;
  for (const p of payments) {
    byClient.set(p.clientKey, (byClient.get(p.clientKey) ?? 0) + p.amount);
    gross += p.amount;
  }
  if (gross === 0) {
    return {
      key: "diversity",
      label: "Client diversity",
      points: 0,
      max: MAX_POINTS.diversity,
      reason: "No paying clients in the window.",
    };
  }
  const topShare = Math.max(...byClient.values()) / gross;
  const points = Math.round(
    MAX_POINTS.diversity * clamp01((1 - topShare) / (1 - TOP_SHARE_FULL_POINTS)),
  );
  return {
    key: "diversity",
    label: "Client diversity",
    points,
    max: MAX_POINTS.diversity,
    reason: `${byClient.size} paying client${byClient.size === 1 ? "" : "s"}; the largest accounts for ${Math.round(topShare * 100)}% of income.`,
  };
}

/**
 * Refunds and disputes: share of income refunded or tied up in open or lost disputes.
 */
function refundsDisputesComponent(payments: readonly ScorePayment[]): ScoreComponent {
  let gross = 0;
  let atRisk = 0;
  for (const p of payments) {
    gross += p.amount;
    const refunded = Math.min(Math.max(p.refundedAmount, 0), p.amount);
    const disputed = p.disputeStatus === "open" || p.disputeStatus === "lost";
    atRisk += disputed ? p.amount : refunded;
  }
  if (gross === 0) {
    return {
      key: "refunds_disputes",
      label: "Refunds and disputes",
      points: 0,
      max: MAX_POINTS.refunds_disputes,
      reason: "No payments in the window to assess.",
    };
  }
  const rate = atRisk / gross;
  const points = Math.round(MAX_POINTS.refunds_disputes * (1 - clamp01(rate / AT_RISK_ZERO_POINTS)));
  return {
    key: "refunds_disputes",
    label: "Refunds and disputes",
    points,
    max: MAX_POINTS.refunds_disputes,
    reason:
      rate === 0
        ? "No refunds or open or lost disputes."
        : `${Math.round(rate * 100)}% of income was refunded or is in an open or lost dispute.`,
  };
}

/**
 * Evidence completeness: average checklist score across projects.
 */
function evidenceComponent(projects: readonly ScoreProject[]): ScoreComponent {
  if (projects.length === 0) {
    return {
      key: "evidence",
      label: "Evidence completeness",
      points: 0,
      max: MAX_POINTS.evidence,
      reason: "No projects with evidence yet.",
    };
  }
  const avg =
    projects.reduce((sum, p) => sum + clamp(p.evidenceCompleteness, 0, 100), 0) / projects.length;
  const points = Math.round(MAX_POINTS.evidence * (avg / 100));
  return {
    key: "evidence",
    label: "Evidence completeness",
    points,
    max: MAX_POINTS.evidence,
    reason: `Projects have ${Math.round(avg)}% of the evidence checklist on average.`,
  };
}

/**
 * Delivery confirmations: share of delivered work the client confirmed.
 */
function deliveryComponent(deliverables: readonly ScoreDeliverable[], now: Date): ScoreComponent {
  const delivered = deliverables.filter((d) => d.deliveredAt !== null && d.deliveredAt <= now);
  const confirmed = delivered.filter((d) => d.clientConfirmedAt !== null);
  if (delivered.length === 0) {
    return {
      key: "delivery_confirmations",
      label: "Delivery confirmations",
      points: 0,
      max: MAX_POINTS.delivery_confirmations,
      reason: "No delivered work yet.",
    };
  }
  const points = Math.round(
    MAX_POINTS.delivery_confirmations * (confirmed.length / delivered.length),
  );
  return {
    key: "delivery_confirmations",
    label: "Delivery confirmations",
    points,
    max: MAX_POINTS.delivery_confirmations,
    reason: `Clients confirmed ${confirmed.length} of ${delivered.length} deliveries.`,
  };
}

/**
 * Sum of payments per calendar month (UTC), oldest first, for the window ending at `now`.
 */
function monthlyTotals(payments: readonly ScorePayment[], now: Date): number[] {
  const totals = new Array<number>(WINDOW_MONTHS).fill(0);
  const nowIndex = now.getUTCFullYear() * 12 + now.getUTCMonth();
  for (const p of payments) {
    const offset = nowIndex - (p.receivedAt.getUTCFullYear() * 12 + p.receivedAt.getUTCMonth());
    if (offset >= 0 && offset < WINDOW_MONTHS) {
      totals[WINDOW_MONTHS - 1 - offset] += p.amount;
    }
  }
  return totals;
}

/**
 * First instant (UTC) of the oldest month in the window.
 */
function windowStartUtc(now: Date, months: number): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1), 1));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function clamp01(value: number): number {
  return clamp(value, 0, 1);
}
