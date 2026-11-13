/**
 * Purpose: F6 Copilot — answers only from retrieved snippets.
 */
import { describe, expect, it, vi } from "vitest";
import { answerFromVault } from "@/lib/ai/copilot-core";

describe("answerFromVault", () => {
  it("says I don't know when nothing was retrieved", async () => {
    const result = await answerFromVault("Why was this flagged?", []);
    expect(result.source).toBe("deterministic");
    expect(result.answer.toLowerCase()).toContain("don't know");
    expect(result.citationIds).toEqual([]);
  });

  it("grounds a deterministic answer in snippets", async () => {
    const result = await answerFromVault("What do I upload next?", [
      {
        id: "snip-1",
        title: "Utility bill",
        text: "Missing address proof for the Kenya notice.",
      },
    ]);
    expect(result.citationIds).toContain("snip-1");
    expect(result.answer).toContain("Utility bill");
  });

  it("drops LLM citations that were not retrieved", async () => {
    const llm = vi.fn().mockResolvedValue({
      answer: "Upload the utility bill next.",
      citationIds: ["snip-1", "invented"],
    });
    const result = await answerFromVault(
      "What next?",
      [{ id: "snip-1", title: "Bill", text: "Utility bill missing." }],
      llm,
    );
    expect(result.source).toBe("llm");
    expect(result.citationIds).toEqual(["snip-1"]);
  });

  it("falls back when the LLM fails", async () => {
    const llm = vi.fn().mockRejectedValue(new Error("down"));
    const result = await answerFromVault(
      "Why?",
      [{ id: "a", title: "Rule", text: "Amount spike flag." }],
      llm,
    );
    expect(result.source).toBe("deterministic");
    expect(result.citationIds).toContain("a");
  });
});
