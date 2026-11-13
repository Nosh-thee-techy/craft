/**
 * Purpose: Address normalisation, match, and freshness (Phase 2 B).
 * Inputs: pure functions in lib/address — no I/O.
 * Outputs: pass/fail for Rd/Road, landmark variants, estate mismatch, day thresholds.
 */
import { describe, expect, it } from "vitest";
import {
  ADDRESS_PROOF_LADDER,
  addressSimilarity,
  addressesMatch,
  documentAgeDays,
  isNearingExpiry,
  isStale,
  normalizeAddress,
} from "@/lib/address";

function daysAgo(n: number, from = new Date("2026-11-13T12:00:00.000Z")): Date {
  return new Date(from.getTime() - n * 24 * 60 * 60 * 1000);
}

describe("normalizeAddress", () => {
  it("expands Rd to road so both forms share a token", () => {
    expect(normalizeAddress("Ngong Rd")).toEqual(["ngong", "road"]);
    expect(normalizeAddress("Ngong Road")).toEqual(["ngong", "road"]);
  });

  it("expands Apt to apartment", () => {
    expect(normalizeAddress("Apt 4")).toContain("apartment");
  });
});

describe("addressSimilarity / match", () => {
  it("matches the same landmark written two ways", () => {
    const a = "Near Nakumatt Junction, Ngong Rd, Nairobi";
    const b = "near Nakumatt Junction, Ngong Road, Nairobi";
    expect(addressSimilarity(a, b)).toBeGreaterThan(0.7);
    expect(addressesMatch(a, b)).toBe(true);
  });

  it("flags a different estate as a mismatch", () => {
    const a = "Kilimani estate, Argwings Kodhek Road, Nairobi";
    const b = "Westlands estate, Ring Road, Nairobi";
    expect(addressesMatch(a, b)).toBe(false);
  });
});

describe("isStale / freshness", () => {
  const today = new Date("2026-11-13T12:00:00.000Z");

  it("74 days is fresh", () => {
    expect(isStale(daysAgo(74, today), today, 90)).toBe(false);
    expect(documentAgeDays(daysAgo(74, today), today)).toBe(74);
  });

  it("75 days warns but is not stale", () => {
    expect(isStale(daysAgo(75, today), today, 90)).toBe(false);
    expect(isNearingExpiry(daysAgo(75, today), today)).toBe(true);
  });

  it("89 days is fresh", () => {
    expect(isStale(daysAgo(89, today), today, 90)).toBe(false);
  });

  it("90 days is stale", () => {
    expect(isStale(daysAgo(90, today), today, 90)).toBe(true);
  });

  it("91 days is stale", () => {
    expect(isStale(daysAgo(91, today), today, 90)).toBe(true);
  });
});

describe("ADDRESS_PROOF_LADDER", () => {
  it("labels fallback rungs as may be accepted", () => {
    const fallbacks = ADDRESS_PROOF_LADDER.filter((rung) => rung.status === "fallback");
    expect(fallbacks.length).toBeGreaterThanOrEqual(3);
    expect(ADDRESS_PROOF_LADDER[0]?.status).toBe("reported");
  });
});
