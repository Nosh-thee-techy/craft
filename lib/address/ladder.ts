/**
 * Purpose: Typed proof-of-address ladder for Kenya (reported + fallback rungs).
 * Inputs: none (static config).
 * Outputs: ordered rungs with status labels for the UI.
 *
 * Rungs 1–2 are what news reports name. 3–5 are "may be accepted, not confirmed".
 */

export type LadderStatus = "reported" | "fallback";

export type AddressProofRung = {
  id: string;
  rank: number;
  title: string;
  detail: string;
  status: LadderStatus;
  /** Evidence types that satisfy this rung when uploaded. */
  evidenceTypes: Array<"address_proof" | "bank_statement" | "id_document">;
};

export const ADDRESS_PROOF_LADDER: AddressProofRung[] = [
  {
    id: "utility_bill",
    rank: 1,
    title: "Utility bill in your name",
    detail: "KPLC, water, or internet — within 90 days. Reported ask.",
    status: "reported",
    evidenceTypes: ["address_proof"],
  },
  {
    id: "bank_with_address",
    rank: 2,
    title: "Bank statement showing your address",
    detail: "Within 90 days. Reported ask.",
    status: "reported",
    evidenceTypes: ["bank_statement"],
  },
  {
    id: "tenancy_plus_id",
    rank: 3,
    title: "Tenancy agreement or landlord letter plus ID",
    detail: "May be accepted, not confirmed.",
    status: "fallback",
    evidenceTypes: ["address_proof", "id_document"],
  },
  {
    id: "government_residence",
    rank: 4,
    title: "Government document showing residence",
    detail: "May be accepted, not confirmed.",
    status: "fallback",
    evidenceTypes: ["address_proof"],
  },
  {
    id: "local_admin_letter",
    rank: 5,
    title: "Letter from a local administrator",
    detail: "May be accepted, not confirmed.",
    status: "fallback",
    evidenceTypes: ["address_proof"],
  },
];

/**
 * UI copy for a rung's confirmation status.
 */
export function ladderStatusLabel(status: LadderStatus): string {
  return status === "reported"
    ? "Reported ask"
    : "May be accepted, not confirmed";
}
