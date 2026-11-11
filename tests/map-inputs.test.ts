/**
 * Purpose: Lock the clientKey and row-mapping contract for the money PR.
 * Inputs: hand-built payment/project/deliverable rows (no database).
 * Outputs: pass/fail.
 */
import { describe, expect, it } from "vitest";
import {
  buildStabilityInput,
  clientKeyFromProject,
  mapPaymentRow,
} from "@/lib/scoring/map-inputs";

describe("clientKeyFromProject", () => {
  it("prefers normalised email over name", () => {
    expect(clientKeyFromProject("  Ada@Studio.KE ", "Ada")).toBe("ada@studio.ke");
  });

  it("falls back to normalised name when email is empty", () => {
    expect(clientKeyFromProject("  ", "  Acme Ltd ")).toBe("acme ltd");
    expect(clientKeyFromProject(null, "Acme Ltd")).toBe("acme ltd");
  });

  it("returns empty string when both are missing", () => {
    expect(clientKeyFromProject(null, null)).toBe("");
    expect(clientKeyFromProject("", "")).toBe("");
  });
});

describe("mapPaymentRow", () => {
  it("parses numeric strings and stamps clientKey from email", () => {
    const mapped = mapPaymentRow({
      amount: "1200.50",
      receivedAt: new Date(Date.UTC(2026, 9, 1)),
      refundedAmount: "0",
      disputeStatus: "none",
      clientEmail: "buyer@example.com",
      clientName: "Buyer",
    });
    expect(mapped.amount).toBe(1200.5);
    expect(mapped.refundedAmount).toBe(0);
    expect(mapped.clientKey).toBe("buyer@example.com");
  });
});

describe("buildStabilityInput", () => {
  it("maps rows into a shape computeStabilityScore can consume", () => {
    const now = new Date(Date.UTC(2026, 10, 15));
    const input = buildStabilityInput({
      now,
      payments: [
        {
          amount: 500,
          receivedAt: new Date(Date.UTC(2026, 9, 10)),
          refundedAmount: 0,
          disputeStatus: "none",
          clientEmail: "a@x.com",
          clientName: "A",
        },
      ],
      projects: [{ evidenceCompleteness: 83 }],
      deliverables: [{ deliveredAt: now, clientConfirmedAt: null }],
    });
    expect(input.now).toBe(now);
    expect(input.payments[0]?.clientKey).toBe("a@x.com");
    expect(input.projects[0]?.evidenceCompleteness).toBe(83);
    expect(input.deliverables[0]?.clientConfirmedAt).toBeNull();
  });
});
