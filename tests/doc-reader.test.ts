/**
 * Purpose: Phase 2 F1 document reader — mocked LLM paths (no DB / env).
 * Inputs: readDocumentFields with injected completeJson doubles.
 * Outputs: pass for success, invalid JSON, timeout, and low confidence.
 */
import { describe, expect, it, vi } from "vitest";
import {
  DocReaderTimeoutError,
  readDocumentFields,
} from "@/lib/ai/doc-reader-core";
import { hasLowConfidence, LOW_CONFIDENCE } from "@/lib/ai/doc-reader-schemas";

const bytes = Buffer.from("KPLC bill\nAmina Otieno\nKilimani, Nairobi\n2026-09-01");

describe("readDocumentFields", () => {
  it("returns ai_read_unconfirmed fields on success", async () => {
    const llm = vi.fn().mockResolvedValue({
      holderName: { value: "Amina Otieno", confidence: 0.92 },
      issuer: { value: "KPLC", confidence: 0.88 },
      docDate: { value: "2026-09-01", confidence: 0.9 },
      addressText: { value: "Kilimani, Nairobi", confidence: 0.85 },
      amount: { value: null, confidence: 0 },
      summary: { value: "Utility bill", confidence: 0.8 },
    });

    const result = await readDocumentFields(
      { type: "address_proof", mimeType: "text/plain", bytes },
      llm,
    );

    expect(result.status).toBe("ai_read_unconfirmed");
    expect(result.fields.holderName?.value).toBe("Amina Otieno");
    expect(result.overallConfidence).toBeGreaterThan(0.5);
    expect(llm).toHaveBeenCalledOnce();
  });

  it("falls back on invalid JSON from the model", async () => {
    const llm = vi.fn().mockRejectedValue(new Error("LLM returned invalid JSON."));
    const result = await readDocumentFields(
      { type: "id_document", mimeType: "text/plain", bytes },
      llm,
    );
    expect(result.status).toBe("failed");
    expect(result.error).toMatch(/invalid JSON/i);
    expect(result.fields).toEqual({});
  });

  it("falls back on timeout to the manual form envelope", async () => {
    const llm = vi.fn().mockRejectedValue(new DocReaderTimeoutError(20_000));
    const result = await readDocumentFields(
      { type: "bank_statement", mimeType: "application/pdf", bytes },
      llm,
    );
    expect(result.status).toBe("timeout");
    expect(result.error).toMatch(/timed out/i);
  });

  it("flags low confidence fields", async () => {
    const llm = vi.fn().mockResolvedValue({
      holderName: { value: "Maybe Amina", confidence: 0.2 },
      issuer: { value: "Unknown", confidence: 0.3 },
    });
    const result = await readDocumentFields(
      { type: "employment_proof", mimeType: "text/plain", bytes },
      llm,
    );
    expect(result.status).toBe("ai_read_unconfirmed");
    expect(hasLowConfidence(result.fields)).toBe(true);
    expect(result.overallConfidence).toBeLessThan(LOW_CONFIDENCE);
  });

  it("falls back when zod rejects the model payload", async () => {
    const err = new Error("Expected object");
    err.name = "ZodError";
    const llm = vi.fn().mockRejectedValue(err);
    const result = await readDocumentFields(
      { type: "invoice", mimeType: "text/plain", bytes },
      llm,
    );
    expect(result.status).toBe("failed");
    expect(result.error).toMatch(/schema/i);
  });
});
