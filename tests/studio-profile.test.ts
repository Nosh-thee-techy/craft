/**
 * Purpose: Unit tests for Layer 1 Work Proof Token ids.
 * Inputs: sample SHA-256 hex strings (no database).
 * Outputs: pass/fail for the certificate token format.
 */
import { describe, expect, it } from "vitest";
import { proofTokenFromHash } from "@/lib/studio/proof-token";

describe("proofTokenFromHash", () => {
  it("builds a short WPT certificate id from the hash prefix", () => {
    const sha = "a1b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef0";
    expect(proofTokenFromHash(sha)).toBe("WPT-A1B2-C3D4");
  });
});
