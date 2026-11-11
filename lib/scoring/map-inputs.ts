/**
 * Purpose: Map vault/payment/project rows onto StabilityInput shapes.
 * Inputs: plain payment, project, and deliverable records (already loaded from DB).
 * Outputs: ScorePayment / ScoreProject / ScoreDeliverable ready for computeStabilityScore.
 *
 * WHY no drizzle import: keep the mapper pure so Vitest can lock the clientKey contract
 * without Postgres. Callers fetch rows; this file only shapes them.
 *
 * clientKey contract (locked for the money PR):
 * - Prefer the project's client email, lowercased and trimmed.
 * - If email is empty, fall back to the client name, lowercased and trimmed.
 * - Never invent a key. Empty email+name becomes "" and diversity treats that as one bucket.
 */
import type {
  DisputeStatus,
  ScoreDeliverable,
  ScorePayment,
  ScoreProject,
  StabilityInput,
} from "@/lib/scoring/stability";

export type PaymentRow = {
  amount: string | number;
  receivedAt: Date;
  refundedAmount: string | number;
  disputeStatus: DisputeStatus;
  /** Joined from projects.client_email. */
  clientEmail: string | null;
  /** Joined from projects.client_name. */
  clientName: string | null;
};

export type ProjectRow = {
  /** 0–100 from completenessFromTypes(...).score — computed in code, not by the LLM. */
  evidenceCompleteness: number;
};

export type DeliverableRow = {
  deliveredAt: Date | null;
  clientConfirmedAt: Date | null;
};

/**
 * Stable client identity for diversity scoring.
 */
export function clientKeyFromProject(clientEmail: string | null, clientName: string | null): string {
  const email = (clientEmail ?? "").trim().toLowerCase();
  if (email.length > 0) {
    return email;
  }
  return (clientName ?? "").trim().toLowerCase();
}

/**
 * One payment row → ScorePayment. Amounts may arrive as numeric strings from Postgres.
 */
export function mapPaymentRow(row: PaymentRow): ScorePayment {
  return {
    clientKey: clientKeyFromProject(row.clientEmail, row.clientName),
    amount: toNumber(row.amount),
    receivedAt: row.receivedAt,
    refundedAmount: toNumber(row.refundedAmount),
    disputeStatus: row.disputeStatus,
  };
}

/**
 * Project completeness already computed by lib/evidence/completeness.ts.
 */
export function mapProjectRow(row: ProjectRow): ScoreProject {
  return { evidenceCompleteness: row.evidenceCompleteness };
}

/**
 * Deliverable confirmation stamps for the delivery component.
 */
export function mapDeliverableRow(row: DeliverableRow): ScoreDeliverable {
  return {
    deliveredAt: row.deliveredAt,
    clientConfirmedAt: row.clientConfirmedAt,
  };
}

/**
 * Assemble a StabilityInput from mapped rows. `now` defaults to wall clock; tests pass a fixed date.
 */
export function buildStabilityInput(args: {
  payments: readonly PaymentRow[];
  projects: readonly ProjectRow[];
  deliverables: readonly DeliverableRow[];
  now?: Date;
}): StabilityInput {
  return {
    payments: args.payments.map(mapPaymentRow),
    projects: args.projects.map(mapProjectRow),
    deliverables: args.deliverables.map(mapDeliverableRow),
    now: args.now ?? new Date(),
  };
}

/**
 * Coerce a Postgres numeric string (or number) to a finite number. Invalid → 0.
 */
function toNumber(value: string | number): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}
