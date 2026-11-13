/**
 * Purpose: Phase 2 F2 notice understanding — mocked LLM + heuristic fallback.
 * Inputs: understandNotice with injected LLM doubles (no DB / env).
 * Outputs: pass for LLM success, timeout, invalid JSON, and heuristic-only.
 */
import { describe, expect, it, vi } from "vitest";
import {
  NoticeLlmTimeoutError,
  understandNotice,
} from "@/lib/ai/notice-understanding-core";
import type { ParsedNotice } from "@/lib/freeze/schemas";

const KENYA_NOTICE = `
PayPal has limited your account. Provide by 20 June 2026:
- national ID
- utility bill as proof of address
- recent bank statement
- source of funds for foreign payments
`;

const llmParsed: ParsedNotice = {
  deadline: "20 June 2026",
  deadlineAt: "2026-06-20",
  tone: "restriction",
  summary: "Kenya-style restriction notice",
  requests: [
    {
      id: "1",
      label: "National ID",
      documentType: "id_document",
      keywords: ["national id"],
    },
    {
      id: "2",
      label: "Utility bill",
      documentType: "address_proof",
      keywords: ["utility bill"],
    },
  ],
};

describe("understandNotice", () => {
  it("uses the LLM result when it returns valid JSON", async () => {
    const llm = vi.fn().mockResolvedValue(llmParsed);
    const { parsed, source } = await understandNotice(KENYA_NOTICE, llm);
    expect(source).toBe("llm");
    expect(parsed.deadlineAt).toBe("2026-06-20");
    expect(parsed.requests.map((r) => r.documentType)).toEqual(
      expect.arrayContaining(["id_document", "address_proof"]),
    );
    expect(llm).toHaveBeenCalledOnce();
  });

  it("falls back to the heuristic on timeout", async () => {
    const llm = vi.fn().mockRejectedValue(new NoticeLlmTimeoutError(20_000));
    const { parsed, source } = await understandNotice(KENYA_NOTICE, llm);
    expect(source).toBe("heuristic");
    const types = parsed.requests.map((r) => r.documentType);
    expect(types).toEqual(
      expect.arrayContaining([
        "id_document",
        "address_proof",
        "bank_statement",
        "source_of_funds",
      ]),
    );
  });

  it("falls back to the heuristic on invalid LLM output", async () => {
    const llm = vi.fn().mockRejectedValue(new Error("LLM returned invalid JSON."));
    const { parsed, source } = await understandNotice(KENYA_NOTICE, llm);
    expect(source).toBe("heuristic");
    expect(parsed.requests.length).toBeGreaterThan(0);
    expect(parsed.requests.every((r) => r.documentType !== ("other" as never))).toBe(true);
  });

  it("runs heuristic-only when no LLM is passed", async () => {
    const { parsed, source } = await understandNotice(KENYA_NOTICE);
    expect(source).toBe("heuristic");
    expect(parsed.deadlineAt).toBe("2026-06-20");
  });

  it("fills deadlineAt from free-text when the LLM omits it", async () => {
    const llm = vi.fn().mockResolvedValue({
      ...llmParsed,
      deadline: "16 November 2026",
      deadlineAt: null,
    });
    const { parsed, source } = await understandNotice(
      "Send your invoice by 16 November 2026.",
      llm,
    );
    expect(source).toBe("llm");
    expect(parsed.deadlineAt).toBe("2026-11-16");
  });
});
