/**
 * Purpose: F4 reply assistant — deterministic draft + LLM fallback.
 */
import { describe, expect, it, vi } from "vitest";
import { canonicalReply, draftFollowUpReply } from "@/lib/ai/reply-assistant-core";

const input = {
  followUp: "Please also send the contract.",
  covered: [
    {
      requestLabel: "Invoice",
      fileName: "invoice.pdf",
      sha256: "abc",
      type: "invoice",
    },
  ],
  missingLabels: ["Contract"],
};

describe("draftFollowUpReply", () => {
  it("builds a deterministic letter from vault cites only", () => {
    const letter = canonicalReply(input);
    expect(letter).toContain("invoice.pdf");
    expect(letter).toContain("abc");
    expect(letter).toContain("Contract");
    expect(letter).not.toContain("passport");
  });

  it("uses the LLM letter when valid", async () => {
    const llm = vi.fn().mockResolvedValue({
      letter: "Hello — attaching invoice.pdf (SHA-256 abc). Contract is still missing.",
    });
    const { letter, source } = await draftFollowUpReply(input, llm);
    expect(source).toBe("llm");
    expect(letter).toContain("invoice.pdf");
  });

  it("falls back when the LLM fails", async () => {
    const llm = vi.fn().mockRejectedValue(new Error("down"));
    const { letter, source } = await draftFollowUpReply(input, llm);
    expect(source).toBe("deterministic");
    expect(letter).toContain("invoice.pdf");
  });
});
