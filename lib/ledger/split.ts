/**
 * Purpose: Deterministic income split proposals for each payment, plus the approve/reject
 * state transitions the creative uses to accept or decline them.
 * Inputs: the creative's split percentages (tax / savings / expenses) and a payment's
 * amount, refunded amount and dispute status. No database types, so tests need no Postgres.
 * Outputs: a proposal with one entry per bucket (amounts add up to the net amount EXACTLY),
 * or a "skipped" proposal with a plain-language reason.
 *
 * WHY plain code: the LLM may explain a split in words. It never calculates money.
 * WHY integer cents: floats drift (0.1 + 0.2), so all arithmetic is done in minor units
 * and only converted back to 2-decimal amounts at the edge.
 * WHY a proposal and not an action: nothing is applied until the creative approves it.
 * These shapes map onto `ledger_entries` (bucket, amount, status, pct_applied, approved_at).
 */

export type Bucket = "tax" | "savings" | "expenses";
export type DisputeStatus = "none" | "open" | "won" | "lost";
export type EntryStatus = "proposed" | "approved" | "rejected";

/** Order matters: it is the tie-break when leftover cents are handed out. */
export const BUCKETS: readonly Bucket[] = ["tax", "savings", "expenses"];

export type SplitRules = { taxPct: number; savingsPct: number; expensesPct: number };

export type SplitPayment = {
  /** Gross payment amount in major units (KES, USD...), 2 decimals. */
  amount: number;
  /** Amount already refunded, same units. 0 when none. */
  refundedAmount: number;
  disputeStatus: DisputeStatus;
};

export type SplitEntry = {
  bucket: Bucket;
  /** Major units, 2 decimals. */
  amount: number;
  /** The percentage this bucket was given, copied from the rules at proposal time. */
  pctApplied: number;
  status: "proposed";
  approvedAt: null;
  reason: string;
};

export type SplitProposal =
  | {
      kind: "proposed";
      /** amount minus refunds: the money the creative actually kept. */
      netAmount: number;
      entries: SplitEntry[];
    }
  | { kind: "skipped"; netAmount: number; entries: []; reason: string };

export type RulesCheck = { ok: true } | { ok: false; error: string };

/** Convert major units to integer minor units (cents). */
export function toMinor(amount: number): number {
  return Math.round(amount * 100);
}

/** Convert integer minor units back to major units with 2 decimals. */
export function fromMinor(minor: number): number {
  return minor / 100;
}

/**
 * Check split percentages: each 0 to 100, at most 2 decimals, and the three add up to 100.
 * Mirrors the onboarding schema so rules saved there always pass here.
 */
export function validateSplitRules(rules: SplitRules): RulesCheck {
  const values = [rules.taxPct, rules.savingsPct, rules.expensesPct];
  if (values.some((v) => !Number.isFinite(v) || v < 0 || v > 100)) {
    return { ok: false, error: "Each percentage must be between 0 and 100." };
  }
  // Basis points (1/100 of a percent) so "33.33 + 33.33 + 33.34" is exact.
  if (values.some((v) => Math.abs(v * 100 - Math.round(v * 100)) > 1e-6)) {
    return { ok: false, error: "Percentages can have at most 2 decimal places." };
  }
  const total = values.reduce((sum, v) => sum + Math.round(v * 100), 0);
  if (total !== 10000) {
    return { ok: false, error: "Tax, savings, and expenses must add up to 100%." };
  }
  return { ok: true };
}

/**
 * Split an integer amount of minor units across buckets by basis points using the
 * largest-remainder method: floor each share, then give leftover cents to the buckets
 * with the biggest fractional remainders. Guarantees the shares sum to `totalMinor`.
 */
function allocate(totalMinor: number, bps: Record<Bucket, number>): Record<Bucket, number> {
  const shares = {} as Record<Bucket, number>;
  const remainders: { bucket: Bucket; rem: number }[] = [];
  let given = 0;
  for (const bucket of BUCKETS) {
    const exact = totalMinor * bps[bucket];
    const floor = Math.floor(exact / 10000);
    shares[bucket] = floor;
    given += floor;
    remainders.push({ bucket, rem: exact - floor * 10000 });
  }
  // Stable sort: equal remainders keep BUCKETS order (tax, savings, expenses).
  remainders.sort((a, b) => b.rem - a.rem);
  for (let i = 0; i < totalMinor - given; i++) shares[remainders[i].bucket] += 1;
  return shares;
}

const BUCKET_LABEL: Record<Bucket, string> = {
  tax: "Tax",
  savings: "Savings",
  expenses: "Expenses",
};

/**
 * Propose how to split one payment. Pure and idempotent: the same inputs always give
 * the same proposal, so a webhook retry cannot propose something different.
 *
 * Policy:
 * - Split the NET amount (payment minus refunds), because refunded money is not yours to allocate.
 * - An open dispute holds the split until it resolves; a lost dispute means the money went back.
 * - Nothing to split (net is 0) is skipped with a reason.
 * Throws RangeError on invalid rules or amounts, because those are caller bugs, not user states.
 */
export function proposeSplit(payment: SplitPayment, rules: SplitRules): SplitProposal {
  const check = validateSplitRules(rules);
  if (!check.ok) throw new RangeError(check.error);
  if (!Number.isFinite(payment.amount) || payment.amount < 0) {
    throw new RangeError("Payment amount must be zero or more.");
  }
  if (payment.refundedAmount < 0 || toMinor(payment.refundedAmount) > toMinor(payment.amount)) {
    throw new RangeError("Refunded amount must be between 0 and the payment amount.");
  }

  const netMinor = toMinor(payment.amount) - toMinor(payment.refundedAmount);
  const netAmount = fromMinor(netMinor);

  if (payment.disputeStatus === "open") {
    return { kind: "skipped", netAmount, entries: [], reason: "This payment is under an open dispute, so no split is proposed until it is resolved." };
  }
  if (payment.disputeStatus === "lost") {
    return { kind: "skipped", netAmount, entries: [], reason: "This payment was lost in a dispute, so there is nothing to split." };
  }
  if (netMinor === 0) {
    return { kind: "skipped", netAmount, entries: [], reason: "This payment was fully refunded, so there is nothing to split." };
  }

  const pct: Record<Bucket, number> = { tax: rules.taxPct, savings: rules.savingsPct, expenses: rules.expensesPct };
  const bps = {
    tax: Math.round(rules.taxPct * 100),
    savings: Math.round(rules.savingsPct * 100),
    expenses: Math.round(rules.expensesPct * 100),
  };
  const shares = allocate(netMinor, bps);
  const refundNote = payment.refundedAmount > 0 ? " (after refunds)" : "";

  const entries: SplitEntry[] = BUCKETS.map((bucket) => ({
    bucket,
    amount: fromMinor(shares[bucket]),
    pctApplied: pct[bucket],
    status: "proposed",
    approvedAt: null,
    reason: `${BUCKET_LABEL[bucket]} gets ${pct[bucket]}% of ${netAmount.toFixed(2)}${refundNote}.`,
  }));

  return { kind: "proposed", netAmount, entries };
}

/** A stored ledger entry, as far as the approval rules care. */
export type LedgerState = { status: EntryStatus; approvedAt: Date | null };

/**
 * Approve a proposed entry. Only `proposed` entries can move; approving stamps `approvedAt`.
 * Keeps the database rule: status is "approved" exactly when approvedAt is set.
 */
export function approveEntry(entry: LedgerState, now: Date): LedgerState {
  if (entry.status !== "proposed") {
    throw new Error(`Only a proposed entry can be approved (this one is ${entry.status}).`);
  }
  return { status: "approved", approvedAt: now };
}

/** Reject a proposed entry. Clears `approvedAt` (it was never set), as the database requires. */
export function rejectEntry(entry: LedgerState): LedgerState {
  if (entry.status !== "proposed") {
    throw new Error(`Only a proposed entry can be rejected (this one is ${entry.status}).`);
  }
  return { status: "rejected", approvedAt: null };
}
