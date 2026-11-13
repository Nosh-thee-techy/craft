/**
 * Purpose: Deterministic readiness nudges from failed or aging checks.
 * Inputs: ReadinessResult + optional address-proof dates.
 * Outputs: short nudge strings for the dashboard (advice only).
 */
import { isNearingExpiry } from "@/lib/address";
import type { ReadinessEvidence, ReadinessResult } from "@/lib/readiness/types";

export type Nudge = {
  id: string;
  message: string;
};

/**
 * Build nudges. Never claims a freeze will or will not happen.
 */
export function readinessNudges(
  result: ReadinessResult,
  evidence: ReadinessEvidence[],
  today = new Date(),
): Nudge[] {
  const nudges: Nudge[] = [];

  for (const check of result.checks) {
    if (check.state === "ok") continue;
    nudges.push({
      id: check.id,
      message: `${check.label}: ${check.detail}`,
    });
  }

  for (const row of evidence) {
    if (row.type !== "address_proof" || !row.docDate) continue;
    const doc = row.docDate instanceof Date ? row.docDate : new Date(row.docDate);
    if (Number.isNaN(doc.getTime())) continue;
    if (isNearingExpiry(doc, today)) {
      nudges.push({
        id: "address_nearing_90",
        message:
          "Your address proof is nearing 90 days (reported). Upload a fresher utility bill soon.",
      });
      break;
    }
  }

  return nudges;
}
