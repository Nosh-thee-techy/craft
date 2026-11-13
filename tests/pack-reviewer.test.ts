/**
 * Purpose: F3 pack reviewer — citation gate + LLM/deterministic paths.
 */
import { describe, expect, it, vi } from "vitest";
import {
  packReviewPassesCitationGate,
  reviewPackGaps,
} from "@/lib/ai/pack-reviewer-core";
import type { EvidenceMapping } from "@/lib/freeze/schemas";

const mapping: EvidenceMapping = {
  covered: [],
  missing: [
    {
      request: {
        id: "1",
        label: "Utility bill",
        documentType: "address_proof",
        keywords: ["utility"],
      },
      reason: "No uploaded address proof.",
    },
  ],
};

describe("reviewPackGaps", () => {
  it("returns deterministic gaps without an LLM", async () => {
    const { gaps, source } = await reviewPackGaps(mapping);
    expect(source).toBe("deterministic");
    expect(gaps[0]?.citesRequestLabel).toBe("Utility bill");
    expect(packReviewPassesCitationGate(gaps, mapping)).toBe(true);
  });

  it("drops LLM gaps that do not cite a missing request", async () => {
    const llm = vi.fn().mockResolvedValue({
      gaps: [
        {
          label: "Made-up passport stamp",
          reason: "Invented",
          citesRequestLabel: "not-in-mapping",
        },
        {
          label: "Utility bill",
          reason: "Still missing a fresh bill",
          citesRequestLabel: "Utility bill",
        },
      ],
    });
    const { gaps, source } = await reviewPackGaps(mapping, llm);
    expect(source).toBe("llm");
    expect(gaps).toHaveLength(1);
    expect(gaps[0]?.label).toBe("Utility bill");
    expect(packReviewPassesCitationGate(gaps, mapping)).toBe(true);
  });

  it("falls back on LLM failure", async () => {
    const llm = vi.fn().mockRejectedValue(new Error("timeout"));
    const { source, gaps } = await reviewPackGaps(mapping, llm);
    expect(source).toBe("deterministic");
    expect(gaps.length).toBe(1);
  });
});
