/**
 * Purpose: Persist split proposals and run approve/reject transitions.
 * Inputs: user id + payment id (propose) or ledger entry id (approve/reject).
 * Outputs: stored ledger rows; agent_actions log for every mutation.
 *
 * WHY here: pure math lives in `split.ts`; this file only loads rules/payments and
 * writes rows. Idempotent on (payment_id, bucket) so webhook retries are safe.
 */
import "server-only";
import { and, eq } from "drizzle-orm";
import { logAgentAction } from "@/lib/ai/log";
import { db } from "@/lib/db/client";
import { ledgerEntries, payments, projects, splitRules } from "@/lib/db/schema";
import {
  approveEntry,
  proposeSplit,
  rejectEntry,
  type Bucket,
  type DisputeStatus,
  type SplitProposal,
  type SplitRules,
} from "@/lib/ledger/split";

export type ProposeResult =
  | { kind: "proposed"; paymentId: string; entryIds: string[]; netAmount: number }
  | { kind: "skipped"; paymentId: string; reason: string }
  | { kind: "already"; paymentId: string; entryIds: string[] }
  | { kind: "no_rules"; paymentId: string };

/**
 * Load the payment + user split rules, run `proposeSplit`, and insert ledger rows.
 * Safe to call on every fund webhook: existing (payment, bucket) rows are left alone.
 */
export async function proposeSplitsForPayment(args: {
  userId: string;
  paymentId: string;
}): Promise<ProposeResult> {
  const { userId, paymentId } = args;

  const existing = await db
    .select({ id: ledgerEntries.id, bucket: ledgerEntries.bucket })
    .from(ledgerEntries)
    .where(
      and(eq(ledgerEntries.userId, userId), eq(ledgerEntries.paymentId, paymentId)),
    );

  if (existing.length > 0) {
    return {
      kind: "already",
      paymentId,
      entryIds: existing.map((e) => e.id),
    };
  }

  const [rulesRow] = await db
    .select()
    .from(splitRules)
    .where(eq(splitRules.userId, userId))
    .limit(1);

  if (!rulesRow) {
    await logAgentAction({
      userId,
      action: "ledger.propose_skipped",
      input: { paymentId },
      output: { reason: "no_rules" },
    });
    return { kind: "no_rules", paymentId };
  }

  const [payment] = await db
    .select({
      id: payments.id,
      amount: payments.amount,
      refundedAmount: payments.refundedAmount,
      disputeStatus: payments.disputeStatus,
      projectId: payments.projectId,
    })
    .from(payments)
    .innerJoin(projects, eq(payments.projectId, projects.id))
    .where(and(eq(payments.id, paymentId), eq(projects.userId, userId)))
    .limit(1);

  if (!payment) {
    throw new Error("Payment not found for this user.");
  }

  const rules: SplitRules = {
    taxPct: toNumber(rulesRow.taxPct),
    savingsPct: toNumber(rulesRow.savingsPct),
    expensesPct: toNumber(rulesRow.expensesPct),
  };

  const proposal: SplitProposal = proposeSplit(
    {
      amount: toNumber(payment.amount),
      refundedAmount: toNumber(payment.refundedAmount),
      disputeStatus: payment.disputeStatus as DisputeStatus,
    },
    rules,
  );

  if (proposal.kind === "skipped") {
    await logAgentAction({
      userId,
      action: "ledger.propose_skipped",
      input: { paymentId },
      output: { reason: proposal.reason, netAmount: proposal.netAmount },
    });
    return { kind: "skipped", paymentId, reason: proposal.reason };
  }

  const inserted = await db
    .insert(ledgerEntries)
    .values(
      proposal.entries.map((entry) => ({
        userId,
        paymentId,
        bucket: entry.bucket,
        amount: entry.amount.toFixed(2),
        status: "proposed" as const,
        pctApplied: entry.pctApplied.toFixed(2),
        approvedAt: null,
      })),
    )
    .onConflictDoNothing({
      target: [ledgerEntries.paymentId, ledgerEntries.bucket],
    })
    .returning({ id: ledgerEntries.id, bucket: ledgerEntries.bucket });

  await logAgentAction({
    userId,
    action: "ledger.propose",
    input: { paymentId, rules },
    output: {
      netAmount: proposal.netAmount,
      entries: proposal.entries.map((e) => ({
        bucket: e.bucket,
        amount: e.amount,
        pctApplied: e.pctApplied,
      })),
      inserted: inserted.length,
    },
  });

  return {
    kind: "proposed",
    paymentId,
    entryIds: inserted.map((r) => r.id),
    netAmount: proposal.netAmount,
  };
}

/**
 * After a project is funded, find its payment and propose splits for the owner.
 */
export async function proposeSplitsForProjectPayment(args: {
  projectId: string;
}): Promise<ProposeResult | { kind: "no_payment" } | { kind: "no_project" }> {
  const [project] = await db
    .select({ id: projects.id, userId: projects.userId })
    .from(projects)
    .where(eq(projects.id, args.projectId))
    .limit(1);

  if (!project) {
    return { kind: "no_project" };
  }

  const [payment] = await db
    .select({ id: payments.id })
    .from(payments)
    .where(eq(payments.projectId, args.projectId))
    .limit(1);

  if (!payment) {
    return { kind: "no_payment" };
  }

  return proposeSplitsForPayment({
    userId: project.userId,
    paymentId: payment.id,
  });
}

/**
 * Approve one proposed ledger entry owned by the user.
 */
export async function approveLedgerEntry(
  userId: string,
  entryId: string,
  now: Date = new Date(),
): Promise<{ id: string; status: "approved"; bucket: Bucket }> {
  const [row] = await db
    .select()
    .from(ledgerEntries)
    .where(and(eq(ledgerEntries.id, entryId), eq(ledgerEntries.userId, userId)))
    .limit(1);

  if (!row) {
    throw new Error("Ledger entry not found.");
  }

  const next = approveEntry(
    { status: row.status as "proposed" | "approved" | "rejected", approvedAt: row.approvedAt },
    now,
  );

  const [updated] = await db
    .update(ledgerEntries)
    .set({ status: next.status, approvedAt: next.approvedAt, updatedAt: now })
    .where(and(eq(ledgerEntries.id, entryId), eq(ledgerEntries.userId, userId)))
    .returning();

  if (!updated) {
    throw new Error("Could not approve ledger entry.");
  }

  await logAgentAction({
    userId,
    action: "ledger.approve",
    input: { entryId, bucket: row.bucket },
    output: { status: updated.status, approvedAt: updated.approvedAt },
    approvedByUser: true,
  });

  return {
    id: updated.id,
    status: "approved",
    bucket: updated.bucket as Bucket,
  };
}

/**
 * Reject one proposed ledger entry owned by the user.
 */
export async function rejectLedgerEntry(
  userId: string,
  entryId: string,
): Promise<{ id: string; status: "rejected"; bucket: Bucket }> {
  const [row] = await db
    .select()
    .from(ledgerEntries)
    .where(and(eq(ledgerEntries.id, entryId), eq(ledgerEntries.userId, userId)))
    .limit(1);

  if (!row) {
    throw new Error("Ledger entry not found.");
  }

  const next = rejectEntry({
    status: row.status as "proposed" | "approved" | "rejected",
    approvedAt: row.approvedAt,
  });
  const now = new Date();

  const [updated] = await db
    .update(ledgerEntries)
    .set({ status: next.status, approvedAt: next.approvedAt, updatedAt: now })
    .where(and(eq(ledgerEntries.id, entryId), eq(ledgerEntries.userId, userId)))
    .returning();

  if (!updated) {
    throw new Error("Could not reject ledger entry.");
  }

  await logAgentAction({
    userId,
    action: "ledger.reject",
    input: { entryId, bucket: row.bucket },
    output: { status: updated.status },
    approvedByUser: true,
  });

  return {
    id: updated.id,
    status: "rejected",
    bucket: updated.bucket as Bucket,
  };
}

/**
 * Approve every proposed entry for one payment (one click in the Money UI).
 */
export async function approveAllProposedForPayment(
  userId: string,
  paymentId: string,
  now: Date = new Date(),
): Promise<{ approved: number }> {
  const rows = await db
    .select({ id: ledgerEntries.id })
    .from(ledgerEntries)
    .where(
      and(
        eq(ledgerEntries.userId, userId),
        eq(ledgerEntries.paymentId, paymentId),
        eq(ledgerEntries.status, "proposed"),
      ),
    );

  for (const row of rows) {
    await approveLedgerEntry(userId, row.id, now);
  }
  return { approved: rows.length };
}

/** Coerce Postgres numeric strings to finite numbers. */
function toNumber(value: string | number): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}
