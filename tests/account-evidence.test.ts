/**
 * Purpose: Account-level vault privacy and Kenya notice mapping hints.
 * Inputs: pure helpers + heuristic parser (no DB).
 * Outputs: pass/fail — public routes must never list Identity files.
 */
import { describe, expect, it } from "vitest";
import {
  ACCOUNT_EVIDENCE_TYPES,
  isAccountEvidenceType,
  publicEvidenceRows,
} from "@/lib/evidence/schemas";
import { heuristicParse } from "@/lib/freeze/parse-heuristic";

describe("publicEvidenceRows", () => {
  it("strips every account-level type used on /t and /c", () => {
    const rows = [
      { id: "1", type: "invoice" as const },
      { id: "2", type: "id_document" as const },
      { id: "3", type: "address_proof" as const },
      { id: "4", type: "bank_statement" as const },
      { id: "5", type: "deliverable" as const },
      { id: "6", type: "source_of_funds" as const },
      { id: "7", type: "employment_proof" as const },
    ];
    const publicRows = publicEvidenceRows(rows);
    expect(publicRows.map((row) => row.type)).toEqual(["invoice", "deliverable"]);
    expect(publicRows.every((row) => !isAccountEvidenceType(row.type))).toBe(true);
  });

  it("knows all five account types", () => {
    expect(ACCOUNT_EVIDENCE_TYPES).toHaveLength(5);
  });
});

describe("Kenya-style notice mapping types", () => {
  it("maps utility bill, bank statement, and ID into account types", () => {
    const notice = `
      PayPal has limited your account. Please provide within 14 days of 20 June 2026:
      - a copy of your national ID
      - a utility bill as proof of address
      - a recent bank statement
      - source of funds for foreign payments
    `;
    const parsed = heuristicParse(notice);
    const types = parsed.requests.map((request) => request.documentType);
    expect(types).toContain("id_document");
    expect(types).toContain("address_proof");
    expect(types).toContain("bank_statement");
    expect(types).toContain("source_of_funds");
    expect(types).not.toContain("other");
  });
});
