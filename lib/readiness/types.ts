/**
 * Purpose: Shared shapes for Account Readiness checks (Phase 2 C).
 * Inputs: none.
 * Outputs: check states — never a single safety or credit score.
 */

export const READINESS_STATES = ["ok", "missing", "stale", "mismatch"] as const;
export type ReadinessState = (typeof READINESS_STATES)[number];

export type ReadinessCheckId =
  | "legal_name"
  | "id_document"
  | "address_proof_fresh"
  | "address_consistent"
  | "bank_linked"
  | "income_statement"
  | "portfolio_ownership"
  | "project_completeness";

export type ReadinessCheck = {
  id: ReadinessCheckId;
  label: string;
  state: ReadinessState;
  detail: string;
};

export type ReadinessResult = {
  checks: ReadinessCheck[];
  readyCount: number;
  totalCount: number;
  /** Plain summary like "6 of 8 ready" — not a score. */
  summary: string;
};

export type ReadinessProfile = {
  legalName?: string | null;
  name?: string | null;
  addressEstate?: string | null;
  addressRoad?: string | null;
  addressBuilding?: string | null;
  addressLandmark?: string | null;
  addressTown?: string | null;
  addressCounty?: string | null;
  plusCode?: string | null;
  incomeStatement?: string | null;
  bankLinkedAttested?: boolean | null;
  verifiedLinkCount?: number;
};

export type ReadinessEvidence = {
  type: string;
  projectId?: string | null;
  docDate?: Date | string | null;
  addressText?: string | null;
  holderName?: string | null;
  extractedConfirmed?: boolean;
};

export type ReadinessInvoice = {
  projectId: string;
  status?: string | null;
};
