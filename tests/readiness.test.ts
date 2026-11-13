/**
 * Purpose: Account Readiness checklist + copy rules (Phase 2 C).
 * Inputs: pure computeReadiness / nudges.
 * Outputs: count updates; stale bill nudge; no "safe"/"guaranteed" in copy.
 */
import { describe, expect, it } from "vitest";
import { computeReadiness, readinessNudges } from "@/lib/readiness";

describe("computeReadiness", () => {
  it("starts mostly missing for a new profile", () => {
    const result = computeReadiness({
      profile: {},
      evidence: [],
    });
    expect(result.readyCount).toBe(0);
    expect(result.summary).toBe("0 of 8 ready");
    expect(result.checks).toHaveLength(8);
  });

  it("updates the count when a step is completed", () => {
    const before = computeReadiness({ profile: {}, evidence: [] });
    const after = computeReadiness({
      profile: { legalName: "Amina Otieno", verifiedLinkCount: 1 },
      evidence: [{ type: "id_document" }],
    });
    expect(after.readyCount).toBeGreaterThan(before.readyCount);
    expect(after.summary).toMatch(/ready$/);
  });

  it("marks a stale bill", () => {
    const result = computeReadiness({
      profile: {
        legalName: "Amina Otieno",
        addressEstate: "Kilimani",
        addressTown: "Nairobi",
      },
      evidence: [
        {
          type: "address_proof",
          docDate: new Date("2026-07-01"),
          addressText: "Kilimani Nairobi",
        },
      ],
      today: new Date("2026-11-13"),
    });
    const bill = result.checks.find((check) => check.id === "address_proof_fresh");
    expect(bill?.state).toBe("stale");
  });

  it("never uses safe or guaranteed in checklist copy", () => {
    const result = computeReadiness({
      profile: { legalName: "Amina", bankLinkedAttested: true, incomeStatement: "freelance" },
      evidence: [{ type: "id_document" }],
    });
    const blob = JSON.stringify(result).toLowerCase();
    expect(blob).not.toMatch(/\bsafe\b/);
    expect(blob).not.toMatch(/guaranteed/);
    expect(blob).not.toMatch(/credit score/);
  });
});

describe("readiness UI copy contract", () => {
  it("keeps dashboard card wording free of safe/guaranteed", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const source = readFileSync(
      resolve(process.cwd(), "components/readiness/readiness-card.tsx"),
      "utf8",
    ).toLowerCase();
    expect(source).not.toMatch(/\bsafe\b/);
    expect(source).not.toMatch(/guaranteed/);
  });
});

describe("readinessNudges", () => {
  it("raises a nudge for a bill nearing 90 days", () => {
    const result = computeReadiness({
      profile: { legalName: "Amina" },
      evidence: [
        {
          type: "address_proof",
          docDate: new Date("2026-08-25"),
          addressText: "Nairobi",
        },
      ],
      today: new Date("2026-11-13"),
    });
    const nudges = readinessNudges(
      result,
      [{ type: "address_proof", docDate: new Date("2026-08-25") }],
      new Date("2026-11-13"),
    );
    expect(nudges.some((nudge) => nudge.id === "address_nearing_90")).toBe(true);
  });
});
