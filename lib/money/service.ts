/**
 * Purpose: Load the signed-in creative's money rows and build the Money room view.
 * Inputs: user id; optional frozen `now` for tests.
 * Outputs: a `MoneyView` from `buildMoneyView` (deterministic once rows are loaded).
 *
 * WHY thin service: SQL stays here; math stays in pure modules. The LLM never runs here.
 */
import "server-only";
import { and, eq, inArray, isNull, ne } from "drizzle-orm";
import { completenessFromTypes } from "@/lib/evidence/completeness";
import { db } from "@/lib/db/client";
import {
  clientPaymentHistory,
  deliverables,
  evidenceItems,
  invoices,
  ledgerEntries,
  payments,
  plannerInputs,
  projects,
  splitRules,
  type PlannerDebt,
} from "@/lib/db/schema";
import type { PayHistoryRow } from "@/lib/forecast/timing";
import type {
  Bucket,
  DisputeStatus,
  EntryStatus,
  SplitRules,
} from "@/lib/ledger/split";
import {
  buildMoneyView,
  type MoneyDeliverableRow,
  type MoneyLedgerRow,
  type MoneyOutstandingInvoice,
  type MoneyPaymentRow,
  type MoneyProjectRow,
  type MoneyView,
  type MoneyViewInput,
} from "@/lib/money/build-view";
import { proposeSplitsForPayment } from "@/lib/ledger/service";
import type { DebtInput } from "@/lib/planner/rules";

/**
 * Query payments, projects, deliverables, planner inputs, split rules, pay history,
 * and ledger rows, then call `buildMoneyView`.
 */
export async function getMoneyViewForUser(
  userId: string,
  now: Date = new Date(),
): Promise<MoneyView> {
  await ensureSplitProposalsForUser(userId);
  const input = await loadMoneyViewInput(userId, now);
  return buildMoneyView(input);
}

/**
 * Backfill proposals for payments that landed before the fundProject hook existed
 * (e.g. demo seed). Idempotent — skips payments that already have ledger rows.
 */
export async function ensureSplitProposalsForUser(userId: string): Promise<number> {
  const userProjects = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.userId, userId));
  if (userProjects.length === 0) return 0;

  const paymentRows = await db
    .select({ id: payments.id })
    .from(payments)
    .where(
      inArray(
        payments.projectId,
        userProjects.map((p) => p.id),
      ),
    );

  let proposed = 0;
  for (const payment of paymentRows) {
    const result = await proposeSplitsForPayment({ userId, paymentId: payment.id });
    if (result.kind === "proposed") proposed += 1;
  }
  return proposed;
}

/**
 * Fetch and map DB rows into the pure MoneyViewInput shape.
 */
export async function loadMoneyViewInput(
  userId: string,
  now: Date = new Date(),
): Promise<MoneyViewInput> {
  const userProjects = await db
    .select({
      id: projects.id,
      clientName: projects.clientName,
      clientEmail: projects.clientEmail,
      amount: projects.amount,
      currency: projects.currency,
      status: projects.status,
      updatedAt: projects.updatedAt,
    })
    .from(projects)
    .where(eq(projects.userId, userId));

  const projectIds = userProjects.map((p) => p.id);
  const projectById = new Map(userProjects.map((p) => [p.id, p]));

  const paymentRows =
    projectIds.length === 0
      ? []
      : await db
          .select({
            id: payments.id,
            projectId: payments.projectId,
            amount: payments.amount,
            currency: payments.currency,
            receivedAt: payments.receivedAt,
            refundedAmount: payments.refundedAmount,
            disputeStatus: payments.disputeStatus,
          })
          .from(payments)
          .where(inArray(payments.projectId, projectIds));

  const deliverableRows =
    projectIds.length === 0
      ? []
      : await db
          .select({
            deliveredAt: deliverables.deliveredAt,
            clientConfirmedAt: deliverables.clientConfirmedAt,
          })
          .from(deliverables)
          .where(inArray(deliverables.projectId, projectIds));

  const evidenceRows =
    projectIds.length === 0
      ? []
      : await db
          .select({
            projectId: evidenceItems.projectId,
            type: evidenceItems.type,
          })
          .from(evidenceItems)
          .where(inArray(evidenceItems.projectId, projectIds));

  const typesByProject = new Map<string, string[]>();
  for (const row of evidenceRows) {
    if (!row.projectId) continue;
    const list = typesByProject.get(row.projectId) ?? [];
    list.push(row.type);
    typesByProject.set(row.projectId, list);
  }

  const invoiceRows =
    projectIds.length === 0
      ? []
      : await db
          .select({
            id: invoices.id,
            projectId: invoices.projectId,
            amount: invoices.amount,
            currency: invoices.currency,
            status: invoices.status,
            sentAt: invoices.sentAt,
            paidAt: invoices.paidAt,
          })
          .from(invoices)
          .where(
            and(
              inArray(invoices.projectId, projectIds),
              isNull(invoices.paidAt),
              ne(invoices.status, "paid"),
            ),
          );

  const [planner] = await db
    .select()
    .from(plannerInputs)
    .where(eq(plannerInputs.userId, userId))
    .limit(1);

  const [rules] = await db
    .select()
    .from(splitRules)
    .where(eq(splitRules.userId, userId))
    .limit(1);

  const historyRows = await db
    .select({
      clientName: clientPaymentHistory.clientName,
      invoiceDate: clientPaymentHistory.invoiceDate,
      paidDate: clientPaymentHistory.paidDate,
      isSynthetic: clientPaymentHistory.isSynthetic,
    })
    .from(clientPaymentHistory)
    .where(eq(clientPaymentHistory.userId, userId));

  const paymentIds = paymentRows.map((p) => p.id);
  const ledgerRows =
    paymentIds.length === 0
      ? []
      : await db
          .select()
          .from(ledgerEntries)
          .where(
            and(
              eq(ledgerEntries.userId, userId),
              inArray(ledgerEntries.paymentId, paymentIds),
            ),
          );

  const moneyPayments: MoneyPaymentRow[] = paymentRows.map((p) => {
    const project = projectById.get(p.projectId);
    return {
      id: p.id,
      amount: toNumber(p.amount),
      refundedAmount: toNumber(p.refundedAmount),
      disputeStatus: p.disputeStatus as DisputeStatus,
      receivedAt: p.receivedAt,
      clientEmail: project?.clientEmail ?? null,
      clientName: project?.clientName ?? null,
      currency: p.currency,
    };
  });

  const moneyProjects: MoneyProjectRow[] = userProjects.map((p) => ({
    id: p.id,
    evidenceCompleteness: completenessFromTypes(typesByProject.get(p.id) ?? []).score,
  }));

  const moneyDeliverables: MoneyDeliverableRow[] = deliverableRows.map((d) => ({
    deliveredAt: d.deliveredAt,
    clientConfirmedAt: d.clientConfirmedAt,
  }));

  const outstandingFromInvoices: MoneyOutstandingInvoice[] = invoiceRows
    .filter((inv) => inv.sentAt !== null)
    .map((inv) => {
      const project = projectById.get(inv.projectId);
      return {
        id: inv.id,
        amount: toNumber(inv.amount),
        sentAt: inv.sentAt as Date,
        clientEmail: project?.clientEmail ?? null,
        clientName: project?.clientName ?? null,
        currency: inv.currency,
      };
    });

  // Seed/demo projects may be `invoiced` without an invoices row — still forecast them.
  const paidProjectIds = new Set(paymentRows.map((p) => p.projectId));
  const invoiceProjectIds = new Set(invoiceRows.map((r) => r.projectId));
  const outstandingFromProjects: MoneyOutstandingInvoice[] = userProjects
    .filter(
      (p) =>
        p.status === "invoiced" &&
        !paidProjectIds.has(p.id) &&
        !invoiceProjectIds.has(p.id),
    )
    .map((p) => ({
      id: `project:${p.id}`,
      amount: toNumber(p.amount),
      sentAt: p.updatedAt,
      clientEmail: p.clientEmail,
      clientName: p.clientName,
      currency: p.currency,
    }));

  const payHistory: PayHistoryRow[] = historyRows.map((h) => ({
    clientKey: h.clientName.trim().toLowerCase(),
    invoiceDate: h.invoiceDate,
    paidDate: h.paidDate,
    isSynthetic: h.isSynthetic,
  }));

  const paymentById = new Map(moneyPayments.map((p) => [p.id, p]));
  const ledger: MoneyLedgerRow[] = ledgerRows.map((row) => {
    const payment = paymentById.get(row.paymentId);
    return {
      id: row.id,
      paymentId: row.paymentId,
      bucket: row.bucket as Bucket,
      amount: toNumber(row.amount),
      pctApplied: row.pctApplied === null ? null : toNumber(row.pctApplied),
      status: row.status as EntryStatus,
      approvedAt: row.approvedAt,
      paymentAmount: payment?.amount ?? 0,
      paymentReceivedAt: payment?.receivedAt ?? row.createdAt,
      paymentCurrency: payment?.currency ?? planner?.currency ?? "USD",
    };
  });

  const currency =
    planner?.currency ??
    moneyPayments[0]?.currency ??
    userProjects[0]?.currency ??
    "KES";

  const split: SplitRules | null = rules
    ? {
        taxPct: toNumber(rules.taxPct),
        savingsPct: toNumber(rules.savingsPct),
        expensesPct: toNumber(rules.expensesPct),
      }
    : null;

  return {
    now,
    currency,
    payments: moneyPayments,
    projects: moneyProjects,
    deliverables: moneyDeliverables,
    outstandingInvoices: [...outstandingFromInvoices, ...outstandingFromProjects],
    payHistory,
    planner: planner
      ? {
          monthlyEssentialExpenses: toNumber(planner.monthlyEssentialExpenses),
          currentBuffer: toNumber(planner.currentBuffer),
          debts: mapDebts(planner.debtsJson),
        }
      : null,
    splitRules: split,
    ledger,
  };
}

/**
 * Map stored PlannerDebt strings onto DebtInput numbers.
 */
function mapDebts(debts: PlannerDebt[]): DebtInput[] {
  return debts.map((d) => ({
    label: d.label,
    balance: toNumber(d.balance),
    minMonthly: toNumber(d.minMonthly),
    aprPct: d.aprPct,
  }));
}

/** Coerce Postgres numeric strings (or numbers) to a finite number. Invalid → 0. */
function toNumber(value: string | number): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}
