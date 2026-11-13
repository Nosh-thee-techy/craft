/**
 * Purpose: Phase 2 F1 — read name/address/date/issuer/amount from an uploaded file.
 * Inputs: user id, evidence id, bytes, mime, evidence type; optional injected LLM.
 * Outputs: DocExtraction stored on evidence.extracted_json (unconfirmed until user confirms).
 *
 * Cache by SHA-256. Timeout 20s → manual fallback envelope. Never invents evidence rows.
 */
import "server-only";
import { and, eq, isNotNull, ne } from "drizzle-orm";
import {
  completeJson as defaultCompleteJson,
} from "@/lib/ai/client";
import {
  localTextExtract,
  readDocumentFields,
  type DocReaderLlmCall,
} from "@/lib/ai/doc-reader-core";
import {
  docExtractionSchema,
  type DocExtraction,
  type DocFields,
} from "@/lib/ai/doc-reader-schemas";
import { logAgentAction } from "@/lib/ai/log";
import { db } from "@/lib/db/client";
import { evidenceItems } from "@/lib/db/schema";
import { replaceChunks } from "@/lib/evidence/chunk";
import type { EvidenceType } from "@/lib/evidence/schemas";

export type DocReaderLlm = DocReaderLlmCall;

export type ExtractDocumentInput = {
  userId: string;
  evidenceId: string;
  type: EvidenceType;
  sha256: string;
  bytes: Buffer;
  mimeType: string;
};

export { readDocumentFields } from "@/lib/ai/doc-reader-core";

/**
 * Extract fields for one vault file. Falls back to a manual envelope on timeout / no LLM.
 */
export async function extractDocument(
  input: ExtractDocumentInput,
  llm: DocReaderLlm = defaultCompleteJson,
): Promise<DocExtraction> {
  const cached = await findCachedExtraction(input.userId, input.sha256, input.evidenceId);
  if (cached) {
    const reused: DocExtraction = {
      ...cached,
      status: "ai_read_unconfirmed",
      cachedFromSha256: input.sha256,
      readAt: new Date().toISOString(),
    };
    await persistExtraction(input, reused, cachedTextFrom(reused));
    await logAgentAction({
      userId: input.userId,
      action: "extract.document",
      input: { evidenceId: input.evidenceId, type: input.type, cached: true },
      output: { status: reused.status, overallConfidence: reused.overallConfidence },
    });
    return reused;
  }

  const localText = localTextExtract(input.bytes, input.mimeType);
  const extraction = await readDocumentFields(
    { type: input.type, mimeType: input.mimeType, bytes: input.bytes, localText },
    llm,
  );

  const textForChunks = [
    localText,
    extraction.fields.summary?.value,
    extraction.fields.holderName?.value,
    extraction.fields.addressText?.value,
  ]
    .filter(Boolean)
    .join("\n\n");

  await persistExtraction(input, extraction, textForChunks || localText);
  await logAgentAction({
    userId: input.userId,
    action: "extract.document",
    input: { evidenceId: input.evidenceId, type: input.type, cached: false },
    output: {
      status: extraction.status,
      overallConfidence: extraction.overallConfidence,
      error: extraction.error ?? null,
    },
  });
  return extraction;
}

/**
 * Apply user-confirmed field edits. Marks extracted_confirmed and copies into columns.
 */
export async function confirmDocumentExtraction(
  userId: string,
  evidenceId: string,
  edits: {
    holderName?: string;
    issuer?: string;
    docDate?: string;
    addressText?: string;
    amount?: string;
    summary?: string;
  },
): Promise<DocExtraction> {
  const [row] = await db
    .select()
    .from(evidenceItems)
    .where(and(eq(evidenceItems.id, evidenceId), eq(evidenceItems.userId, userId)))
    .limit(1);
  if (!row) {
    throw new Error("Evidence not found.");
  }

  const prior = docExtractionSchema.safeParse(row.extractedJson);
  const fields: DocFields = {
    holderName: plainField(edits.holderName),
    issuer: plainField(edits.issuer),
    docDate: plainField(edits.docDate),
    addressText: plainField(edits.addressText),
    amount: plainField(edits.amount),
    summary: plainField(edits.summary),
  };

  const extraction = docExtractionSchema.parse({
    schemaVersion: 1,
    documentType: row.type,
    status: "confirmed",
    overallConfidence: 1,
    fields: {
      ...(prior.success ? prior.data.fields : {}),
      ...stripEmpty(fields),
    },
    readAt: new Date().toISOString(),
    cachedFromSha256: prior.success ? prior.data.cachedFromSha256 ?? null : null,
    error: null,
  });

  const docDate = parseDocDate(edits.docDate);
  const expiresAt =
    row.type === "address_proof" && docDate
      ? new Date(docDate.getTime() + 90 * 24 * 60 * 60 * 1000)
      : row.expiresAt;

  await db
    .update(evidenceItems)
    .set({
      extractedJson: extraction,
      extractedConfirmed: true,
      holderName: emptyToNull(edits.holderName) ?? row.holderName,
      issuer: emptyToNull(edits.issuer) ?? row.issuer,
      addressText: emptyToNull(edits.addressText) ?? row.addressText,
      docDate: docDate ?? row.docDate,
      expiresAt,
      updatedAt: new Date(),
    })
    .where(eq(evidenceItems.id, evidenceId));

  await logAgentAction({
    userId,
    action: "extract.document",
    input: { evidenceId, confirmed: true },
    output: { status: "confirmed" },
    approvedByUser: true,
  });

  return extraction;
}

/**
 * List unconfirmed AI-read rows for the confirm UI.
 */
export async function listUnconfirmedExtractions(userId: string) {
  const rows = await db
    .select()
    .from(evidenceItems)
    .where(and(eq(evidenceItems.userId, userId), eq(evidenceItems.extractedConfirmed, false)));

  return rows
    .map((row) => {
      const parsed = docExtractionSchema.safeParse(row.extractedJson);
      if (!parsed.success) return null;
      if (parsed.data.status === "confirmed") return null;
      return {
        id: row.id,
        type: row.type,
        fileName: row.storageKey?.split("/").pop() ?? null,
        extraction: parsed.data,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);
}

async function findCachedExtraction(
  userId: string,
  sha256: string,
  excludeId: string,
): Promise<DocExtraction | null> {
  const [row] = await db
    .select({ extractedJson: evidenceItems.extractedJson })
    .from(evidenceItems)
    .where(
      and(
        eq(evidenceItems.userId, userId),
        eq(evidenceItems.sha256, sha256),
        ne(evidenceItems.id, excludeId),
        isNotNull(evidenceItems.extractedJson),
      ),
    )
    .limit(1);
  if (!row?.extractedJson) return null;
  const parsed = docExtractionSchema.safeParse(row.extractedJson);
  return parsed.success ? parsed.data : null;
}

async function persistExtraction(
  input: ExtractDocumentInput,
  extraction: DocExtraction,
  extractedText: string,
): Promise<void> {
  await db
    .update(evidenceItems)
    .set({
      extractedJson: extraction,
      extractedText: extractedText || null,
      extractedConfirmed: false,
      holderName: extraction.fields.holderName?.value ?? null,
      issuer: extraction.fields.issuer?.value ?? null,
      addressText: extraction.fields.addressText?.value ?? null,
      docDate: parseDocDate(extraction.fields.docDate?.value ?? undefined),
      updatedAt: new Date(),
    })
    .where(eq(evidenceItems.id, input.evidenceId));

  if (extractedText.trim()) {
    await replaceChunks(input.userId, input.evidenceId, extractedText);
  }
}

function plainField(value: string | undefined): { value: string | null; confidence: number } | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return { value: trimmed.length > 0 ? trimmed : null, confidence: 1 };
}

function stripEmpty(fields: DocFields): DocFields {
  const out: DocFields = {};
  for (const [key, field] of Object.entries(fields) as [keyof DocFields, DocFields[keyof DocFields]][]) {
    if (field?.value) out[key] = field;
  }
  return out;
}

function emptyToNull(value: string | undefined): string | null {
  const trimmed = (value ?? "").trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseDocDate(value: string | undefined): Date | null {
  if (!value) return null;
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const date = new Date(`${match[1]}-${match[2]}-${match[3]}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function cachedTextFrom(extraction: DocExtraction): string {
  return [
    extraction.fields.summary?.value,
    extraction.fields.holderName?.value,
    extraction.fields.addressText?.value,
  ]
    .filter(Boolean)
    .join("\n");
}
