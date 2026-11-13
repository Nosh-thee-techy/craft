/**
 * Purpose: Zod contracts for AI document reading (Phase 2 F1). Safe for client forms.
 * Inputs: LLM JSON or manual confirm form fields.
 * Outputs: typed extraction envelopes. Fields stay unconfirmed until the user says so.
 */
import { z } from "zod";
import { evidenceTypeSchema } from "@/lib/evidence/schemas";

/** Confidence below this is shown as “low” in the UI. */
export const LOW_CONFIDENCE = 0.5;

export const DOC_READER_TIMEOUT_MS = 20_000;

const confidentString = z.object({
  value: z.string().nullable(),
  confidence: z.number().min(0).max(1),
});

/** Shared fields the reader may pull from ID, bills, statements, contracts, invoices. */
export const docFieldsSchema = z.object({
  holderName: confidentString.optional(),
  issuer: confidentString.optional(),
  docDate: confidentString.optional(),
  addressText: confidentString.optional(),
  amount: confidentString.optional(),
  summary: confidentString.optional(),
});

export type DocFields = z.infer<typeof docFieldsSchema>;

export const docExtractionStatusSchema = z.enum([
  "ai_read_unconfirmed",
  "confirmed",
  "manual",
  "timeout",
  "failed",
  "unavailable",
]);

export type DocExtractionStatus = z.infer<typeof docExtractionStatusSchema>;

/**
 * Envelope stored in evidence.extracted_json after a read attempt.
 * Readiness must ignore fields until status === "confirmed".
 */
export const docExtractionSchema = z.object({
  schemaVersion: z.literal(1),
  documentType: evidenceTypeSchema,
  status: docExtractionStatusSchema,
  overallConfidence: z.number().min(0).max(1),
  fields: docFieldsSchema,
  readAt: z.string(),
  /** When served from a prior file with the same SHA-256. */
  cachedFromSha256: z.string().nullable().optional(),
  error: z.string().nullable().optional(),
});

export type DocExtraction = z.infer<typeof docExtractionSchema>;

/**
 * LLM output shape before we wrap it in the envelope.
 */
export const llmDocFieldsSchema = z.object({
  holderName: confidentString.nullable().optional(),
  issuer: confidentString.nullable().optional(),
  docDate: confidentString.nullable().optional(),
  addressText: confidentString.nullable().optional(),
  amount: confidentString.nullable().optional(),
  summary: confidentString.nullable().optional(),
});

/**
 * Average confidence across present fields; 0 when empty.
 */
export function overallConfidence(fields: DocFields): number {
  const scores = Object.values(fields)
    .filter((field): field is { value: string | null; confidence: number } => Boolean(field))
    .map((field) => field.confidence);
  if (scores.length === 0) return 0;
  return scores.reduce((sum, value) => sum + value, 0) / scores.length;
}

/**
 * True when any field is below the low-confidence bar.
 */
export function hasLowConfidence(fields: DocFields): boolean {
  return Object.values(fields).some(
    (field) => field && field.value && field.confidence < LOW_CONFIDENCE,
  );
}

/**
 * Manual confirm form payload (user-edited plain strings).
 */
export const confirmExtractionSchema = z.object({
  evidenceId: z.string().uuid(),
  holderName: z.string().trim().optional().or(z.literal("")),
  issuer: z.string().trim().optional().or(z.literal("")),
  docDate: z.string().trim().optional().or(z.literal("")),
  addressText: z.string().trim().optional().or(z.literal("")),
  amount: z.string().trim().optional().or(z.literal("")),
  summary: z.string().trim().optional().or(z.literal("")),
});

export type ConfirmExtractionInput = z.infer<typeof confirmExtractionSchema>;
