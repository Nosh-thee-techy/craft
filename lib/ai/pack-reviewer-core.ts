/**
 * Purpose: Phase 2 F3 — second-pass “PayPal reviewer” over a mapped pack.
 * Inputs: mapping + optional LLM; deterministic gap list is always the seed.
 * Outputs: review gaps with citations. Fabricated gaps without a cite are dropped.
 */
import { gapListFromMapping } from "@/lib/freeze/gaps";
import type { EvidenceMapping } from "@/lib/freeze/schemas";
import { z } from "zod";

export const PACK_REVIEW_TIMEOUT_MS = 20_000;

const reviewGapSchema = z.object({
  label: z.string().min(1),
  reason: z.string().min(1),
  /** Must match a missing request label or documentType from the mapping. */
  citesRequestLabel: z.string().min(1),
});

const llmReviewSchema = z.object({
  gaps: z.array(reviewGapSchema),
});

export type PackReviewGap = z.infer<typeof reviewGapSchema>;

export type PackReviewResult = {
  gaps: PackReviewGap[];
  source: "llm" | "deterministic";
};

export type PackReviewLlm = <T>(input: {
  system: string;
  user: string;
  schema: z.ZodType<T>;
  timeoutMs?: number;
}) => Promise<T>;

/**
 * Review what PayPal may still ask for. LLM may rephrase; it cannot invent uncitable gaps.
 */
export async function reviewPackGaps(
  mapping: EvidenceMapping,
  llm?: PackReviewLlm,
): Promise<PackReviewResult> {
  const allowed = new Set(
    mapping.missing.flatMap((item) => [
      item.request.label.toLowerCase(),
      item.request.documentType.toLowerCase(),
    ]),
  );

  const deterministic: PackReviewGap[] = mapping.missing.map((item) => ({
    label: item.request.label,
    reason: item.reason,
    citesRequestLabel: item.request.label,
  }));

  if (!llm || mapping.missing.length === 0) {
    return { gaps: deterministic, source: "deterministic" };
  }

  try {
    const drafted = await llm({
      system:
        "You play a PayPal document reviewer. List only gaps that cite a missing request already in the mapping. Never invent a file or a request that is not missing. Never calculate money.",
      user: JSON.stringify({
        missing: mapping.missing.map((item) => ({
          label: item.request.label,
          type: item.request.documentType,
          reason: item.reason,
        })),
        covered: mapping.covered.map((item) => item.request.label),
        seedGaps: gapListFromMapping(mapping),
      }),
      schema: llmReviewSchema,
      timeoutMs: PACK_REVIEW_TIMEOUT_MS,
    });

    const filtered = drafted.gaps.filter((gap) => {
      const cite = gap.citesRequestLabel.toLowerCase();
      return allowed.has(cite) || [...allowed].some((label) => cite.includes(label) || label.includes(cite));
    });

    return {
      gaps: filtered.length > 0 ? filtered : deterministic,
      source: "llm",
    };
  } catch {
    return { gaps: deterministic, source: "deterministic" };
  }
}

/**
 * Fail-closed: every gap must cite a missing request. Used by tests + verifier glue.
 */
export function packReviewPassesCitationGate(
  gaps: PackReviewGap[],
  mapping: EvidenceMapping,
): boolean {
  const allowed = new Set(
    mapping.missing.flatMap((item) => [
      item.request.label.toLowerCase(),
      item.request.documentType.toLowerCase(),
    ]),
  );
  return gaps.every((gap) => {
    const cite = gap.citesRequestLabel.toLowerCase();
    return allowed.has(cite) || [...allowed].some((label) => cite.includes(label));
  });
}
