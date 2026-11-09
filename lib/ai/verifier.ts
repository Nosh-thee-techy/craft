/**
 * Purpose: Fail-closed claim checker for any agent output that leaves the app.
 * Inputs: draft letter/pack text plus uploaded source text — not wired in Phase 0.
 * Outputs: throws until Phase 3.
 *
 * Every claim must be checked against uploaded source text. Export stays
 * disabled until all claims pass and the user approves.
 */
import "server-only";

/**
 * Placeholder for the Phase 3 verifier.
 */
export async function verifyClaims(): Promise<never> {
  throw new Error("lib/ai/verifier.ts is not implemented until Phase 3.");
}
