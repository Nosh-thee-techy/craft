/**
 * Purpose: Zod schemas for vault uploads. Safe to import from client components.
 * Inputs: form fields (type, file, or portfolio URL).
 * Outputs: parsed upload input and serializable ledger rows.
 */
import { z } from "zod";

/** Checklist types from CRAFT_BUILD_PLAN.md. Shared with the completeness scorer. */
export const EVIDENCE_TYPES = [
  "contract",
  "invoice",
  "payment",
  "deliverable",
  "comms",
  "portfolio_link",
] as const;

export const evidenceTypeSchema = z.enum(EVIDENCE_TYPES);

export type EvidenceType = (typeof EVIDENCE_TYPES)[number];

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
  projectId: string;
  projectName: string;
  type: z.infer<typeof evidenceTypeSchema>;
  fileName: string | null;
  sha256: string | null;
  addedAt: string;
  hasExtractedText: boolean;
};
