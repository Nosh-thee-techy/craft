/**
 * Purpose: Zod schemas for vault uploads. Safe to import from client components.
 * Inputs: form fields (type, file, or portfolio URL).
 * Outputs: parsed upload input and serializable ledger rows.
 *
 * Phase 2: account-level types (ID, address, bank, funds, employment) sit
 * beside project types. Project completeness still uses PROJECT_EVIDENCE_TYPES only.
 */
import { z } from "zod";

/** Project checklist types from CRAFT_BUILD_PLAN.md. Shared with the completeness scorer. */
export const PROJECT_EVIDENCE_TYPES = [
  "contract",
  "invoice",
  "payment",
  "deliverable",
  "comms",
  "portfolio_link",
] as const;

/**
 * Account-level documents PayPal reportedly asks for (Kenya 2026 reports).
 * Private: never publish on the trust page (enforced in later workstream A).
 */
export const ACCOUNT_EVIDENCE_TYPES = [
  "id_document",
  "address_proof",
  "bank_statement",
  "source_of_funds",
  "employment_proof",
] as const;

/** Every evidence type the vault and Freeze Shield can store or request. */
export const EVIDENCE_TYPES = [
  ...PROJECT_EVIDENCE_TYPES,
  ...ACCOUNT_EVIDENCE_TYPES,
] as const;

export const evidenceTypeSchema = z.enum(EVIDENCE_TYPES);

export type EvidenceType = (typeof EVIDENCE_TYPES)[number];
export type ProjectEvidenceType = (typeof PROJECT_EVIDENCE_TYPES)[number];
export type AccountEvidenceType = (typeof ACCOUNT_EVIDENCE_TYPES)[number];

/** Human labels for selects and Freeze Shield UI. */
export const EVIDENCE_TYPE_LABELS: Record<EvidenceType, string> = {
  contract: "Contract",
  invoice: "Invoice",
  payment: "Payment proof",
  deliverable: "Deliverable",
  comms: "Client communications",
  portfolio_link: "Portfolio link",
  id_document: "ID document (reported)",
  address_proof: "Proof of address (reported)",
  bank_statement: "Bank statement (reported)",
  source_of_funds: "Source of funds (reported)",
  employment_proof: "Proof of employment (reported)",
};

export function isAccountEvidenceType(type: string): type is AccountEvidenceType {
  return (ACCOUNT_EVIDENCE_TYPES as readonly string[]).includes(type);
}

export function isProjectEvidenceType(type: string): type is ProjectEvidenceType {
  return (PROJECT_EVIDENCE_TYPES as readonly string[]).includes(type);
}

/**
 * One-line reasons for the Identity and funds section.
 * Wording stays "reported" — PayPal did not confirm these asks publicly.
 */
export const ACCOUNT_EVIDENCE_REASONS: Record<AccountEvidenceType, string> = {
  id_document: "PayPal reportedly asks for a government ID.",
  address_proof: "PayPal reportedly asks for proof of address (e.g. a utility bill).",
  bank_statement: "PayPal reportedly asks for a recent bank statement.",
  source_of_funds: "PayPal reportedly asks where foreign funds come from and why.",
  employment_proof: "PayPal reportedly asks for proof of employment or self-employment.",
};

export const MAX_EVIDENCE_BYTES = 12 * 1024 * 1024;

export const ALLOWED_EVIDENCE_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/json",
] as const;

export const addLinkSchema = z.object({
  projectId: z.string().uuid(),
  type: z.literal("portfolio_link"),
  url: z.string().trim().url("Enter a public URL for this portfolio link."),
});

export type AddLinkInput = z.infer<typeof addLinkSchema>;

export type EvidenceFormState = {
  error?: string;
  ok?: boolean;
};

/** Ledger row shown in the vault AG Grid. */
export type EvidenceRow = {
  id: string;
  /** Null for account-level Identity and funds rows. */
  projectId: string | null;
  projectName: string;
  type: z.infer<typeof evidenceTypeSchema>;
  fileName: string | null;
  sha256: string | null;
  addedAt: string;
  hasExtractedText: boolean;
  holderName?: string | null;
  issuer?: string | null;
  docDate?: string | null;
  expiresAt?: string | null;
};

/**
 * Pure filter: public surfaces (/t, /c) must never list account-level files.
 */
export function publicEvidenceRows<T extends { type: string }>(rows: T[]): T[] {
  return rows.filter((row) => !isAccountEvidenceType(row.type));
}
