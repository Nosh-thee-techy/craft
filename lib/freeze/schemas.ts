/**
 * Purpose: Zod contracts for Freeze Shield notices, mappings, letters, and packs.
 * Inputs: pasted PayPal text, vault rows, verifier JSON.
 * Outputs: typed notice/pack shapes safe to share with client components.
 */
import { z } from "zod";
import { evidenceTypeSchema } from "@/lib/evidence/schemas";

export const MAX_NOTICE_CHARS = 20_000;

/**
 * Notice request types match vault evidence types (project + account-level).
 * The catch-all `other` was removed in Phase 2 F1 so ID/address/bank requests map.
 */
export const noticeDocTypeSchema = evidenceTypeSchema;

export type NoticeDocType = z.infer<typeof noticeDocTypeSchema>;

export const noticeRequestSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  documentType: noticeDocTypeSchema,
  keywords: z.array(z.string()),
});

export type NoticeRequest = z.infer<typeof noticeRequestSchema>;

export const parsedNoticeSchema = z.object({
  /** Original deadline phrase from the notice (display). */
  deadline: z.string().nullable(),
  /** ISO calendar date (YYYY-MM-DD) when parsing succeeds; null if unknown. */
  deadlineAt: z.string().nullable().optional(),
  tone: z.enum(["calm", "urgent", "restriction"]),
  summary: z.string(),
  requests: z.array(noticeRequestSchema).min(1),
});

export type ParsedNotice = z.infer<typeof parsedNoticeSchema>;

export const evidenceCiteSchema = z.object({
  evidenceId: z.string().uuid(),
  type: evidenceTypeSchema,
  fileName: z.string().nullable(),
  sha256: z.string().nullable(),
  addedAt: z.string(),
  excerpt: z.string(),
});

export type EvidenceCite = z.infer<typeof evidenceCiteSchema>;

export const coveredRequestSchema = z.object({
  request: noticeRequestSchema,
  matches: z.array(evidenceCiteSchema).min(1),
});

export const missingRequestSchema = z.object({
  request: noticeRequestSchema,
  reason: z.string(),
});

export const mappingSchema = z.object({
  covered: z.array(coveredRequestSchema),
  missing: z.array(missingRequestSchema),
});

export type EvidenceMapping = z.infer<typeof mappingSchema>;

export const packIndexItemSchema = z.object({
  requestLabel: z.string(),
  status: z.enum(["covered", "missing"]),
  evidenceId: z.string().uuid().nullable(),
  fileName: z.string().nullable(),
  sha256: z.string().nullable(),
  addedAt: z.string().nullable(),
  type: z.string().nullable(),
});

export type PackIndexItem = z.infer<typeof packIndexItemSchema>;

export const packDraftSchema = z.object({
  letter: z.string().min(1),
  index: z.array(packIndexItemSchema),
});

export type PackDraft = z.infer<typeof packDraftSchema>;

export const verifierClaimSchema = z.object({
  claim: z.string(),
  passed: z.boolean(),
  reason: z.string(),
  sourceExcerpt: z.string().nullable(),
});

export type VerifierClaim = z.infer<typeof verifierClaimSchema>;

export const verifierReportSchema = z.object({
  passed: z.boolean(),
  claims: z.array(verifierClaimSchema),
  method: z.enum(["deterministic", "llm+deterministic"]).default("deterministic"),
});

export type VerifierReport = z.infer<typeof verifierReportSchema>;

export const pasteNoticeSchema = z.object({
  rawText: z
    .string()
    .trim()
    .min(40, "Paste the PayPal notice — a few sentences at least.")
    .max(MAX_NOTICE_CHARS, "That notice is too long to parse."),
});

/** F3 pack-reviewer gap shown after mapping (must cite a missing request). */
export const packReviewGapSchema = z.object({
  label: z.string().min(1),
  reason: z.string().min(1),
  citesRequestLabel: z.string().min(1),
});

export type PackReviewGapView = z.infer<typeof packReviewGapSchema>;

export type FreezeFormState = {
  error?: string;
  ok?: boolean;
  packId?: string;
  noticeId?: string;
  parsed?: ParsedNotice;
  mapping?: EvidenceMapping;
  draft?: PackDraft;
  report?: VerifierReport;
  /** F3 second-pass reviewer gaps (cite missing requests only). */
  reviewGaps?: PackReviewGapView[];
  reviewSource?: "llm" | "deterministic";
  status?: "draft" | "verified" | "approved" | "exported";
  downloadUrl?: string;
};

/** One uploaded file the verifier is allowed to cite. */
export type SourceText = {
  evidenceId?: string;
  fileName: string | null;
  sha256: string | null;
  type: string;
  text: string;
};
