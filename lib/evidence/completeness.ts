/**
 * Purpose: Deterministic completeness score for a project's evidence checklist.
 * Inputs: the evidence types already stored for one project.
 * Outputs: score 0–100, present types, missing types.
 *
 * WHY plain code: the LLM may explain the score in words. It never calculates it.
 * WHY no server-only: Phase 7 eval and Vitest import this under plain Node.
 * WHY PROJECT_EVIDENCE_TYPES: account-level ID/address docs are not project checklist items.
 */
import {
  PROJECT_EVIDENCE_TYPES,
  type ProjectEvidenceType,
} from "@/lib/evidence/schemas";

export type Completeness = {
  score: number;
  total: number;
  present: ProjectEvidenceType[];
  missing: ProjectEvidenceType[];
};

/**
 * One point per project checklist type that has at least one item.
 * Account-level types are ignored here.
 */
export function completenessFromTypes(types: readonly string[]): Completeness {
  const unique = new Set(
    types.filter((type): type is ProjectEvidenceType => isProjectEvidenceType(type)),
  );
  const present = PROJECT_EVIDENCE_TYPES.filter((type) => unique.has(type));
  const missing = PROJECT_EVIDENCE_TYPES.filter((type) => !unique.has(type));
  const score = Math.round((present.length / PROJECT_EVIDENCE_TYPES.length) * 100);
  return { score, total: PROJECT_EVIDENCE_TYPES.length, present, missing };
}

/**
 * Narrow a string to a project checklist type.
 */
function isProjectEvidenceType(value: string): value is ProjectEvidenceType {
  return (PROJECT_EVIDENCE_TYPES as readonly string[]).includes(value);
}
