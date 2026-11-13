/**
 * Purpose: Pure address normalisation and similarity for Kenya landmark-style addresses.
 * Inputs: free-text address fragments (estate, road, building, landmark, town, county).
 * Outputs: token sets and overlap scores. Never decides a match — callers set thresholds.
 *
 * Deterministic only. The LLM may suggest wording; it does not call these for a verdict.
 */

/** Expand common abbreviations so "Rd" and "Road" share a token. */
const EXPANSIONS: Record<string, string> = {
  rd: "road",
  st: "street",
  ave: "avenue",
  av: "avenue",
  blvd: "boulevard",
  apt: "apartment",
  fl: "floor",
  ln: "lane",
  dr: "drive",
  hwy: "highway",
  n: "north",
  s: "south",
  e: "east",
  w: "west",
};

export type CanonicalAddress = {
  estate?: string | null;
  road?: string | null;
  building?: string | null;
  landmark?: string | null;
  town?: string | null;
  county?: string | null;
  plusCode?: string | null;
};

/**
 * Lowercase, strip punctuation, expand abbreviations, split into tokens.
 */
export function normalizeAddress(input: string): string[] {
  const lower = input.toLowerCase().replace(/[^\p{L}\p{N}\s+]/gu, " ");
  const parts = lower.split(/\s+/).filter(Boolean);
  return parts.map((part) => EXPANSIONS[part] ?? part);
}

/**
 * Join canonical fields into one comparable string.
 */
export function formatCanonicalAddress(address: CanonicalAddress): string {
  return [
    address.estate,
    address.road,
    address.building,
    address.landmark,
    address.town,
    address.county,
    address.plusCode,
  ]
    .map((part) => (part ?? "").trim())
    .filter(Boolean)
    .join(" ");
}

/**
 * Token overlap (Jaccard) between two address strings. 1 = identical tokens.
 */
export function addressSimilarity(a: string, b: string): number {
  const left = new Set(normalizeAddress(a));
  const right = new Set(normalizeAddress(b));
  if (left.size === 0 && right.size === 0) return 1;
  if (left.size === 0 || right.size === 0) return 0;
  let overlap = 0;
  for (const token of left) {
    if (right.has(token)) overlap += 1;
  }
  const union = left.size + right.size - overlap;
  return union === 0 ? 0 : overlap / union;
}

/** Default match threshold for profile vs bill vs invoice seller address. */
export const ADDRESS_MATCH_THRESHOLD = 0.45;

/**
 * True when similarity is at or above the threshold.
 */
export function addressesMatch(
  a: string,
  b: string,
  threshold = ADDRESS_MATCH_THRESHOLD,
): boolean {
  return addressSimilarity(a, b) >= threshold;
}

/**
 * Address proof freshness. Stale at `maxAgeDays` or older (90 by default).
 * Warn band starts at warnAtDays (75) — callers can surface nudges.
 */
export function isStale(
  docDate: Date,
  today: Date,
  maxAgeDays = 90,
): boolean {
  const ageMs = today.getTime() - docDate.getTime();
  const ageDays = ageMs / (24 * 60 * 60 * 1000);
  return ageDays >= maxAgeDays;
}

/**
 * Days since document date (floor). Negative if docDate is in the future.
 */
export function documentAgeDays(docDate: Date, today: Date): number {
  return Math.floor((today.getTime() - docDate.getTime()) / (24 * 60 * 60 * 1000));
}

export function isNearingExpiry(
  docDate: Date,
  today: Date,
  warnAtDays = 75,
  maxAgeDays = 90,
): boolean {
  const age = documentAgeDays(docDate, today);
  return age >= warnAtDays && age < maxAgeDays;
}
