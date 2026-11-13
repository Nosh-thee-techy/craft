/**
 * Purpose: Public surface for address helpers (normalize, match, ladder).
 */
export {
  ADDRESS_MATCH_THRESHOLD,
  addressSimilarity,
  addressesMatch,
  documentAgeDays,
  formatCanonicalAddress,
  isNearingExpiry,
  isStale,
  normalizeAddress,
  type CanonicalAddress,
} from "@/lib/address/normalize";
export {
  ADDRESS_PROOF_LADDER,
  ladderStatusLabel,
  type AddressProofRung,
  type LadderStatus,
} from "@/lib/address/ladder";
