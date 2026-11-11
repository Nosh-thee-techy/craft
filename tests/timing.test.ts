/**
 * Purpose: Unit tests for default and history-based pay windows.
 * Inputs: hand-built pay-history rows (no database).
 * Outputs: pass/fail against 14/30/45 defaults and percentile windows.
 */
import { describe, expect, it } from "vitest";
import {
  DEFAULT_PAY_WINDOW,
  datesFromWindow,
  daysToPay,
  outstandingFromSent,
  payWindowForClient,
  payWindowOverall,
  windowFromDays,
} from "@/lib/forecast/timing";

const d = (y: number, m: number, day: number) => new Date(Date.UTC(y, m - 1, day));

describe("daysToPay", () => {
  it("counts whole days between invoice and pay", () => {
    expect(daysToPay(d(2026, 1, 1), d(2026, 1, 15))).toBe(14);
  });

  it("returns null when unpaid or inverted", () => {
    expect(daysToPay(d(2026, 1, 10), null)).toBeNull();
    expect(daysToPay(d(2026, 1, 10), d(2026, 1, 1))).toBeNull();
  });
});

describe("windowFromDays", () => {
  it("uses the default 14 / 30 / 45 band when history is thin", () => {
    expect(windowFromDays([])).toMatchObject({
      ...DEFAULT_PAY_WINDOW,
      source: "default",
      sampleSize: 0,
    });
    expect(windowFromDays([10])).toMatchObject({ source: "default", sampleSize: 1 });
  });

  it("builds early / expected / late from percentiles when there are enough samples", () => {
    const w = windowFromDays([5, 10, 15, 20, 40]);
    expect(w.source).toBe("history");
    expect(w.earlyDays).toBeLessThanOrEqual(w.expectedDays);
    expect(w.expectedDays).toBeLessThanOrEqual(w.lateDays);
  });
});

describe("payWindowForClient", () => {
  it("scopes history to one client and falls back to defaults otherwise", () => {
    const history = [
      { clientKey: "a", invoiceDate: d(2026, 1, 1), paidDate: d(2026, 1, 6) },
      { clientKey: "a", invoiceDate: d(2026, 2, 1), paidDate: d(2026, 2, 11) },
      { clientKey: "b", invoiceDate: d(2026, 1, 1), paidDate: d(2026, 1, 40) },
    ];
    const a = payWindowForClient(history, "A");
    expect(a.source).toBe("history");
    expect(a.sampleSize).toBe(2);
    expect(payWindowForClient(history, "missing").source).toBe("default");
    expect(payWindowOverall(history).source).toBe("history");
  });
});

describe("datesFromWindow", () => {
  it("maps a sent date onto earliest / expected / latest", () => {
    const sent = d(2026, 11, 1);
    const dates = datesFromWindow(sent, {
      earlyDays: 14,
      expectedDays: 30,
      lateDays: 45,
      source: "default",
      sampleSize: 0,
    });
    expect(dates.earliestPay.toISOString().slice(0, 10)).toBe("2026-11-15");
    expect(dates.expectedPay.toISOString().slice(0, 10)).toBe("2026-12-01");
    expect(dates.latestPay.toISOString().slice(0, 10)).toBe("2026-12-16");
  });

  it("builds an outstanding invoice for cashflow", () => {
    const sent = d(2026, 11, 1);
    const inv = outstandingFromSent({
      amount: 100,
      sentAt: sent,
      window: { ...DEFAULT_PAY_WINDOW, source: "default", sampleSize: 0 },
    });
    expect(inv.amount).toBe(100);
    expect(inv.earliestPay <= inv.expectedPay).toBe(true);
    expect(inv.expectedPay <= inv.latestPay).toBe(true);
  });
});
