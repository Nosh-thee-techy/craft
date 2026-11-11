/**
 * Purpose: Pure Money room view model — score, forecast band, plan, safe-to-invest,
 * investing simulation, and split proposals. No database.
 * Inputs: plain rows already mapped from Postgres (or sample fixtures).
 * Outputs: one `MoneyView` the `/money` UI renders.
 *
 * WHY plain code: amounts, bands, and scores stay deterministic. The LLM may explain
 * this view; it never calculates money or invents evidence.
 */

import {
  forecastCashflow,
  type CashflowForecast,
  type CashflowPayment,
} from "@/lib/forecast/cashflow";
import {
  outstandingFromSent,
  payWindowForClient,
  payWindowOverall,
  type PayHistoryRow,
  type PayWindow,
} from "@/lib/forecast/timing";
import {
  proposeSplit,
  type Bucket,
  type EntryStatus,
  type SplitProposal,
  type SplitRules,
} from "@/lib/ledger/split";
import { buildPlan, type DebtInput, type Plan } from "@/lib/planner/rules";
import {
  simulateInvesting,
  type InvestingSimulation,
} from "@/lib/planner/simulate";
import { clientKeyFromProject } from "@/lib/scoring/map-inputs";
import {
  computeStabilityScore,
  type DisputeStatus,
  type StabilityScore,
} from "@/lib/scoring/stability";

/** Default educational horizon for the investing range chart. */
export const INVEST_HORIZON_MONTHS = 12;

export type MoneyPaymentRow = {
  id: string;
  amount: number;
  refundedAmount: number;
  disputeStatus: DisputeStatus;
  receivedAt: Date;
  clientEmail: string | null;
  clientName: string | null;
  currency: string;
};

export type MoneyProjectRow = {
  id: string;
  evidenceCompleteness: number;
};

export type MoneyDeliverableRow = {
  deliveredAt: Date | null;
  clientConfirmedAt: Date | null;
};

export type MoneyOutstandingInvoice = {
  /** Optional invoice or project id for UI keys. */
  id: string;
  amount: number;
  sentAt: Date;
  clientEmail: string | null;
  clientName: string | null;
  currency: string;
};

export type MoneyLedgerRow = {
  id: string;
  paymentId: string;
  bucket: Bucket;
  amount: number;
  pctApplied: number | null;
  status: EntryStatus;
  approvedAt: Date | null;
  paymentAmount: number;
  paymentReceivedAt: Date;
  paymentCurrency: string;
};

export type MoneyViewInput = {
  now: Date;
  /** Display currency from planner_inputs when present; else first payment currency. */
  currency: string;
  payments: readonly MoneyPaymentRow[];
  projects: readonly MoneyProjectRow[];
  deliverables: readonly MoneyDeliverableRow[];
  outstandingInvoices: readonly MoneyOutstandingInvoice[];
  /** Days-to-pay observations; synthetic rows are fine when labelled upstream. */
  payHistory: readonly PayHistoryRow[];
  planner: {
    monthlyEssentialExpenses: number;
    currentBuffer: number;
    debts: readonly DebtInput[];
  } | null;
  splitRules: SplitRules | null;
  /** Stored ledger rows (proposed / approved / rejected). */
  ledger: readonly MoneyLedgerRow[];
  investHorizonMonths?: number;
};

export type PendingSplitGroup = {
  paymentId: string;
  paymentAmount: number;
  paymentReceivedAt: Date;
  currency: string;
  netFromRules: number | null;
  entries: MoneyLedgerRow[];
  /** Fresh proposal from rules when there are no stored rows yet (preview only). */
  preview: SplitProposal | null;
};

export type MoneyView = {
  now: Date;
  currency: string;
  score: StabilityScore;
  forecast: CashflowForecast;
  plan: Plan;
  safeToInvest: number;
  simulation: InvestingSimulation;
  payWindowDefault: PayWindow;
  payWindowsByClient: { clientKey: string; window: PayWindow }[];
  pendingSplits: PendingSplitGroup[];
  approvedSplitCount: number;
  notes: string[];
};

/**
 * Compose the Money room from deterministic modules. Throws only on invalid numbers
 * inside the underlying pure helpers (caller bugs).
 */
export function buildMoneyView(input: MoneyViewInput): MoneyView {
  const notes: string[] = [];
  const expenses = input.planner?.monthlyEssentialExpenses ?? 0;
  const buffer = input.planner?.currentBuffer ?? 0;
  const debts = input.planner?.debts ?? [];

  if (!input.planner) {
    notes.push(
      "Add monthly essentials and your current buffer to unlock a full plan. Forecast still runs with zero expenses until then.",
    );
  }

  const score = computeStabilityScore({
    payments: input.payments.map((p) => ({
      clientKey: clientKeyFromProject(p.clientEmail, p.clientName),
      amount: p.amount,
      receivedAt: p.receivedAt,
      refundedAmount: p.refundedAmount,
      disputeStatus: p.disputeStatus,
    })),
    projects: input.projects.map((p) => ({
      evidenceCompleteness: p.evidenceCompleteness,
    })),
    deliverables: input.deliverables.map((d) => ({
      deliveredAt: d.deliveredAt,
      clientConfirmedAt: d.clientConfirmedAt,
    })),
    now: input.now,
  });

  const overallWindow = payWindowOverall(input.payHistory);
  const clientKeys = uniqueClientKeys(input.payHistory, input.outstandingInvoices);
  const payWindowsByClient = clientKeys.map((clientKey) => ({
    clientKey,
    window: payWindowForClient(input.payHistory, clientKey),
  }));

  const cashflowPayments: CashflowPayment[] = input.payments.map((p) => ({
    amount: p.amount,
    refundedAmount: p.refundedAmount,
    disputeStatus: p.disputeStatus,
    receivedAt: p.receivedAt,
  }));

  const invoices = input.outstandingInvoices.map((inv) => {
    const timingKey = timingClientKey(inv.clientEmail, inv.clientName);
    const window = timingKey
      ? payWindowForClient(input.payHistory, timingKey)
      : overallWindow;
    return outstandingFromSent({
      amount: inv.amount,
      sentAt: inv.sentAt,
      window,
    });
  });

  const forecast = forecastCashflow({
    payments: cashflowPayments,
    invoices,
    monthlyEssentialExpenses: expenses,
    currentBuffer: buffer,
    now: input.now,
  });

  const taxPct = input.splitRules?.taxPct ?? 0;
  const plan = buildPlan({
    forecast,
    monthlyEssentialExpenses: expenses,
    currentBuffer: buffer,
    debts,
    taxPct,
  });

  const safeToInvest = plan.kind === "plan" ? plan.safeToInvest : 0;
  const horizon = input.investHorizonMonths ?? INVEST_HORIZON_MONTHS;
  const simulation = simulateInvesting({
    monthlyContribution: safeToInvest,
    months: horizon,
  });

  const pendingSplits = buildPendingSplits(input);
  const approvedSplitCount = input.ledger.filter((e) => e.status === "approved").length;

  if (forecast.kind === "insufficient") {
    notes.push(forecast.reason);
  }
  if (plan.kind === "insufficient") {
    notes.push(plan.reason);
  }
  if (simulation.kind === "skipped") {
    notes.push(simulation.reason);
  }
  if (!input.splitRules) {
    notes.push("Set tax / savings / expenses split rules in onboarding to propose payment splits.");
  }

  return {
    now: input.now,
    currency: input.currency,
    score,
    forecast,
    plan,
    safeToInvest,
    simulation,
    payWindowDefault: overallWindow,
    payWindowsByClient,
    pendingSplits,
    approvedSplitCount,
    notes,
  };
}

/**
 * Group proposed ledger rows by payment. When rules exist and a payment has no rows,
 * attach a pure preview proposal (not persisted).
 */
function buildPendingSplits(input: MoneyViewInput): PendingSplitGroup[] {
  const proposed = input.ledger.filter((e) => e.status === "proposed");
  const byPayment = new Map<string, MoneyLedgerRow[]>();
  for (const row of proposed) {
    const list = byPayment.get(row.paymentId) ?? [];
    list.push(row);
    byPayment.set(row.paymentId, list);
  }

  const groups: PendingSplitGroup[] = [];
  for (const [paymentId, entries] of byPayment) {
    const first = entries[0];
    groups.push({
      paymentId,
      paymentAmount: first.paymentAmount,
      paymentReceivedAt: first.paymentReceivedAt,
      currency: first.paymentCurrency,
      netFromRules: entries.reduce((s, e) => s + e.amount, 0),
      entries: [...entries].sort((a, b) => a.bucket.localeCompare(b.bucket)),
      preview: null,
    });
  }

  // Preview for payments that still have no ledger rows (e.g. before the webhook hook runs).
  if (input.splitRules) {
    const withRows = new Set(input.ledger.map((e) => e.paymentId));
    for (const payment of input.payments) {
      if (withRows.has(payment.id)) continue;
      const preview = proposeSplit(
        {
          amount: payment.amount,
          refundedAmount: payment.refundedAmount,
          disputeStatus: payment.disputeStatus,
        },
        input.splitRules,
      );
      if (preview.kind === "skipped") continue;
      groups.push({
        paymentId: payment.id,
        paymentAmount: payment.amount,
        paymentReceivedAt: payment.receivedAt,
        currency: payment.currency,
        netFromRules: preview.netAmount,
        entries: [],
        preview,
      });
    }
  }

  return groups.sort(
    (a, b) => b.paymentReceivedAt.getTime() - a.paymentReceivedAt.getTime(),
  );
}

/** Prefer email (score contract), else name — then lowercase for timing history keys. */
function timingClientKey(clientEmail: string | null, clientName: string | null): string {
  // History rows are keyed by client name today; prefer name when present so windows match.
  const name = (clientName ?? "").trim().toLowerCase();
  if (name.length > 0) return name;
  return clientKeyFromProject(clientEmail, clientName);
}

function uniqueClientKeys(
  history: readonly PayHistoryRow[],
  invoices: readonly MoneyOutstandingInvoice[],
): string[] {
  const keys = new Set<string>();
  for (const row of history) {
    const k = row.clientKey.trim().toLowerCase();
    if (k) keys.add(k);
  }
  for (const inv of invoices) {
    const k = timingClientKey(inv.clientEmail, inv.clientName);
    if (k) keys.add(k);
  }
  return [...keys].sort();
}
