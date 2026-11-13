/**
 * Purpose: Unit tests for Freeze Shield notice parsing (Phase 2 F5 / F2 / F3).
 * Inputs: synthetic PayPal and Kenya-style notice text.
 * Outputs: typed requests, tone, and deadlineAt dates.
 */
import { describe, expect, it } from "vitest";
import { heuristicParse, parseDeadlineAt } from "@/lib/freeze/parse-heuristic";

describe("parseDeadlineAt", () => {
  it("parses ISO dates", () => {
    const date = parseDeadlineAt("2026-11-16");
    expect(date?.toISOString().slice(0, 10)).toBe("2026-11-16");
  });

  it("parses named month dates", () => {
    const date = parseDeadlineAt("16 November 2026");
    expect(date?.toISOString().slice(0, 10)).toBe("2026-11-16");
  });

  it("parses within N days from asOf", () => {
    const asOf = new Date("2026-11-13T12:00:00.000Z");
    const date = parseDeadlineAt("within 7 days", asOf);
    expect(date?.toISOString().slice(0, 10)).toBe("2026-11-20");
  });

  it("returns null for empty or unparseable text", () => {
    expect(parseDeadlineAt(null)).toBeNull();
    expect(parseDeadlineAt("soon")).toBeNull();
  });
});

describe("heuristicParse", () => {
  it("maps a hold notice to project types and id_document", () => {
    const parsed = heuristicParse(
      "PayPal Limitation Notice. Account limited. Send invoice, proof of payment, contract, deliverable, email history, portfolio website, and a government ID by 16 November 2026.",
    );
    expect(parsed.tone).toBe("restriction");
    expect(parsed.deadlineAt).toBe("2026-11-16");
    const types = parsed.requests.map((r) => r.documentType);
    expect(types).toEqual(
      expect.arrayContaining([
        "invoice",
        "payment",
        "contract",
        "deliverable",
        "comms",
        "portfolio_link",
        "id_document",
      ]),
    );
    expect(types).not.toContain("other");
  });

  it("maps Kenya-style KYC phrases to account-level types", () => {
    const parsed = heuristicParse(
      "Please upload a utility bill or KPLC receipt for proof of address, your bank statement, source of funds for foreign payments, proof of employment, and your KRA PIN / national ID.",
    );
    const types = parsed.requests.map((r) => r.documentType);
    expect(types).toEqual(
      expect.arrayContaining([
        "address_proof",
        "bank_statement",
        "source_of_funds",
        "employment_proof",
        "id_document",
      ]),
    );
    expect(types).not.toContain("other");
  });

  it("never emits the removed other document type", () => {
    const parsed = heuristicParse("Your funds are on hold. Send supporting documents.");
    expect(parsed.requests.every((r) => r.documentType !== ("other" as never))).toBe(true);
  });
});
