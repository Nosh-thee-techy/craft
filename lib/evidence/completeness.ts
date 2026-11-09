/**
 * Purpose: Deterministic completeness score for a project's evidence checklist.
 * Inputs: the evidence types already stored for one project.
 * Outputs: score 0–100, present types, missing types.
 *
 * WHY plain code: the LLM may explain the score in words. It never calculates it.
 */
import "server-only";
import { EVIDENCE_TYPES, type EvidenceType } from "@/lib/evidence/schemas";

export type Completeness = {
  score: number;
  total: number;
  present: EvidenceType[];
  missing: EvidenceType[];
};

/**
 * One point per checklist type that has at least one item. Duplicates do not raise the score.
 */
export function completenessFromTypes(types: readonly string[]): Completeness {
  const unique = new Set(types.filter((type): type is EvidenceType => isEvidenceType(type)));
  const present = EVIDENCE_TYPES.filter((type) => unique.has(type));
  const missing = EVIDENCE_TYPES.filter((type) => !unique.has(type));
  const score = Math.round((present.length / EVIDENCE_TYPES.length) * 100);
  return { score, total: EVIDENCE_TYPES.length, present, missing };
}

/**
 * Narrow a string to a checklist type.
 */
function isEvidenceType(value: string): value is EvidenceType {
  return (EVIDENCE_TYPES as readonly string[]).includes(value);
}
