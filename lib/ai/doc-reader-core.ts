/**
 * Purpose: Pure document-reader attempt (no DB, no env). Phase 2 F1.
 * Inputs: file bytes + an injected LLM function.
 * Outputs: DocExtraction envelope. Callers persist and log.
 */
import {
  DOC_READER_TIMEOUT_MS,
  docExtractionSchema,
  llmDocFieldsSchema,
  overallConfidence,
  type DocExtraction,
  type DocFields,
} from "@/lib/ai/doc-reader-schemas";
import type { EvidenceType } from "@/lib/evidence/schemas";
import type { z } from "zod";

type LlmDocFields = z.infer<typeof llmDocFieldsSchema>;

export type DocReaderLlmCall = <T>(input: {
  system: string;
  user: string;
  schema: z.ZodType<T>;
  images?: { mimeType: string; base64: string }[];
  timeoutMs?: number;
}) => Promise<T>;

export class DocReaderTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`LLM request timed out after ${timeoutMs}ms.`);
    this.name = "DocReaderTimeoutError";
  }
}

export class DocReaderNotConfiguredError extends Error {
  constructor() {
    super("LLM not configured — fill fields manually.");
    this.name = "DocReaderNotConfiguredError";
  }
}

/**
 * Ask the LLM for fields; on failure return a manual/timeout/failed envelope.
 */
export async function readDocumentFields(
  input: {
    type: EvidenceType;
    mimeType: string;
    bytes: Buffer;
    localText?: string;
  },
  llm: DocReaderLlmCall,
): Promise<DocExtraction> {
  const localText = input.localText ?? localTextExtract(input.bytes, input.mimeType);

  try {
    const fields = await llm({
      system: [
        "You read one uploaded document. Return only fields you can see.",
        "Each field is { value, confidence 0..1 }. Use null value when absent.",
        "Never invent account numbers, card numbers, or amounts not printed.",
        "docDate must be YYYY-MM-DD when a clear date exists, else null.",
        `Document type hint: ${input.type}.`,
      ].join(" "),
      user: `Mime: ${input.mimeType}\nLocal text (may be empty):\n${localText.slice(0, 8000)}`,
      schema: llmDocFieldsSchema,
      timeoutMs: DOC_READER_TIMEOUT_MS,
      images: input.mimeType.startsWith("image/")
        ? [{ mimeType: input.mimeType, base64: input.bytes.toString("base64") }]
        : undefined,
    });

    const cleaned = normalizeFields(fields);
    return docExtractionSchema.parse({
      schemaVersion: 1,
      documentType: input.type,
      status: "ai_read_unconfirmed",
      overallConfidence: overallConfidence(cleaned),
      fields: cleaned,
      readAt: new Date().toISOString(),
      cachedFromSha256: null,
      error: null,
    });
  } catch (error) {
    if (
      error instanceof DocReaderNotConfiguredError ||
      (error instanceof Error && error.name === "LlmNotConfiguredError")
    ) {
      return manualEnvelope(input.type, "unavailable", "LLM not configured — fill fields manually.");
    }
    if (
      error instanceof DocReaderTimeoutError ||
      (error instanceof Error && error.name === "LlmTimeoutError")
    ) {
      return manualEnvelope(
        input.type,
        "timeout",
        error instanceof Error ? error.message : "timed out",
      );
    }
    if (error instanceof Error && /invalid JSON|LLM returned/i.test(error.message)) {
      return manualEnvelope(input.type, "failed", error.message);
    }
    if (error && typeof error === "object" && "name" in error && error.name === "ZodError") {
      return manualEnvelope(input.type, "failed", "LLM JSON failed schema validation.");
    }
    return manualEnvelope(
      input.type,
      "failed",
      error instanceof Error ? error.message : "Document reader failed.",
    );
  }
}

function manualEnvelope(
  type: EvidenceType,
  status: DocExtraction["status"],
  error: string,
): DocExtraction {
  return docExtractionSchema.parse({
    schemaVersion: 1,
    documentType: type,
    status,
    overallConfidence: 0,
    fields: {},
    readAt: new Date().toISOString(),
    cachedFromSha256: null,
    error,
  });
}

function normalizeFields(raw: LlmDocFields): DocFields {
  const out: DocFields = {};
  for (const key of [
    "holderName",
    "issuer",
    "docDate",
    "addressText",
    "amount",
    "summary",
  ] as const) {
    const field = raw[key];
    if (!field) continue;
    out[key] = {
      value: field.value,
      confidence: field.confidence,
    };
  }
  return out;
}

export function localTextExtract(bytes: Buffer, mimeType: string): string {
  if (
    mimeType.startsWith("text/") ||
    mimeType === "application/json" ||
    mimeType === "text/markdown" ||
    mimeType === "text/csv"
  ) {
    return bytes.toString("utf8");
  }
  return "";
}
