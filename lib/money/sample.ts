/**
 * Purpose: Hand-built MoneyView input for UI work and Vitest (no database).
 * Inputs: none — fixed fixtures with a frozen `now`.
 * Outputs: a `MoneyViewInput` that produces a full score / forecast / plan / sim.
 *
 * Amounts are educational sample data in one currency (KES). Not live PayPal history.
 */

import type { PayHistoryRow } from "@/lib/forecast/timing";
import type { MoneyViewInput } from "@/lib/money/build-view";
import { buildMoneyView } from "@/lib/money/build-view";

/** Frozen clock so sample bands stay stable in screenshots and tests. */
export const SAMPLE_NOW = new Date(Date.UTC(2026, 10, 12, 12, 0, 0));

const d = (y: number, m: number, day: number) =>
  new Date(Date.UTC(y, m - 1, day, 10, 0, 0));

/**
 * Sample rows: enough payments for a forecast, one outstanding invoice, split rules,
 * planner inputs, and two proposed ledger entries on the newest payment.
 */
export function sampleMoneyInput(now: Date = SAMPLE_NOW): MoneyViewInput {
  const payHistory: PayHistoryRow[] = [
    {
      clientKey: "wanjiku brands",
      invoiceDate: d(2026, 9, 1),
      paidDate: d(2026, 9, 5),
      isSynthetic: true,
    },
    {
      clientKey: "wanjiku brands",
      invoiceDate: d(2026, 7, 1),
      paidDate: d(2026, 7, 7),
      isSynthetic: true,
    },
    {
      clientKey: "coast cafe",
      invoiceDate: d(2026, 8, 1),
      paidDate: d(2026, 8, 12),
      isSynthetic: true,
    },
    {
      clientKey: "coast cafe",
      invoiceDate: d(2026, 6, 1),
      paidDate: d(2026, 6, 10),
      isSynthetic: true,
    },
  ];

  return {
    now,
    currency: "KES",
    payments: [
      {
        id: "pay-jun",
        amount: 38000,
        refundedAmount: 0,
        disputeStatus: "none",
        receivedAt: d(2026, 6, 12),
        clientEmail: "hello@coastcafe.ke",
        clientName: "Coast Cafe",
        currency: "KES",
      },
      {
        id: "pay-jul",
        amount: 52000,
        refundedAmount: 0,
        disputeStatus: "none",
        receivedAt: d(2026, 7, 12),
        clientEmail: "accounts@wanjikubrands.co.ke",
        clientName: "Wanjiku Brands",
        currency: "KES",
      },
      {
        id: "pay-aug",
        amount: 41000,
        refundedAmount: 0,
        disputeStatus: "none",
        receivedAt: d(2026, 8, 12),
        clientEmail: "hello@coastcafe.ke",
        clientName: "Coast Cafe",
        currency: "KES",
      },
      {
        id: "pay-sep",
        amount: 61000,
        refundedAmount: 0,
        disputeStatus: "none",
        receivedAt: d(2026, 9, 12),
        clientEmail: "accounts@wanjikubrands.co.ke",
        clientName: "Wanjiku Brands",
        currency: "KES",
      },
      {
        id: "pay-oct",
        amount: 48000,
        refundedAmount: 0,
        disputeStatus: "none",
        receivedAt: d(2026, 10, 12),
        clientEmail: "okello.joy@email.com",
        clientName: "Okello Wedding",
        currency: "KES",
      },
      {
        id: "pay-nov",
        amount: 55000,
        refundedAmount: 0,
        disputeStatus: "none",
        receivedAt: d(2026, 11, 5),
        clientEmail: "studio@kangacollective.com",
        clientName: "Kanga Collective",
        currency: "KES",
      },
    ],
    projects: [
      { id: "proj-1", evidenceCompleteness: 50 },
      { id: "proj-2", evidenceCompleteness: 100 },
      { id: "proj-3", evidenceCompleteness: 33 },
    ],
    deliverables: [
      {
        deliveredAt: d(2026, 9, 20),
        clientConfirmedAt: d(2026, 9, 21),
      },
      { deliveredAt: d(2026, 10, 15), clientConfirmedAt: null },
    ],
    outstandingInvoices: [
      {
        id: "inv-open",
        amount: 78000,
        sentAt: d(2026, 11, 1),
        clientEmail: "studio@kangacollective.com",
        clientName: "Kanga Collective",
        currency: "KES",
      },
    ],
    payHistory,
    planner: {
      // Essentials below a slow month; buffer already at target; no debt left so
      // spare cash reaches the educational investing step in the sample UI.
      monthlyEssentialExpenses: 25000,
      currentBuffer: 100000,
      debts: [],
    },
    splitRules: { taxPct: 30, savingsPct: 20, expensesPct: 50 },
    ledger: [
      {
        id: "led-tax",
        paymentId: "pay-nov",
        bucket: "tax",
        amount: 16500,
        pctApplied: 30,
        status: "proposed",
        approvedAt: null,
        paymentAmount: 55000,
        paymentReceivedAt: d(2026, 11, 5),
        paymentCurrency: "KES",
      },
      {
        id: "led-sav",
        paymentId: "pay-nov",
        bucket: "savings",
        amount: 11000,
        pctApplied: 20,
        status: "proposed",
        approvedAt: null,
        paymentAmount: 55000,
        paymentReceivedAt: d(2026, 11, 5),
        paymentCurrency: "KES",
      },
      {
        id: "led-exp",
        paymentId: "pay-nov",
        bucket: "expenses",
        amount: 27500,
        pctApplied: 50,
        status: "proposed",
        approvedAt: null,
        paymentAmount: 55000,
        paymentReceivedAt: d(2026, 11, 5),
        paymentCurrency: "KES",
      },
    ],
  };
}

/**
 * Ready-to-render sample MoneyView for the UI while wiring the live service.
 */
export function sampleMoneyView(now: Date = SAMPLE_NOW) {
  return buildMoneyView(sampleMoneyInput(now));
}
