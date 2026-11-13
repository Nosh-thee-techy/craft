/**
 * Purpose: After mapping, list what PayPal may still ask for based on missing requests.
 * Inputs: EvidenceMapping from Freeze Shield.
 * Outputs: plain gap strings for the UI (advice only).
 */
import type { EvidenceMapping } from "@/lib/freeze/schemas";
import { isAccountEvidenceType } from "@/lib/evidence/schemas";

/**
 * Gaps are the mapping's missing list, plus a short tip for account-level types.
 */
export function gapListFromMapping(mapping: EvidenceMapping): string[] {
  return mapping.missing.map((item) => {
    const label = item.request.label;
    if (isAccountEvidenceType(item.request.documentType)) {
      return `${label} — still missing. Upload under Identity and funds (PayPal reportedly asks for this).`;
    }
    return `${label} — still missing. ${item.reason}`;
  });
}
