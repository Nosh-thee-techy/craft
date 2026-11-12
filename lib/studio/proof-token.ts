/**
 * Purpose: Pure Work Proof Token id helper (hash → certificate label).
 * Inputs: SHA-256 hex digest from the vault.
 * Outputs: a short WPT-XXXX-XXXX id for UI and public trust pages.
 *
 * Educational provenance certificate — not a tradeable on-chain NFT.
 */

/**
 * Certificate-style short id from a SHA-256 hex digest.
 */
export function proofTokenFromHash(sha256: string): string {
  return `WPT-${sha256.slice(0, 4).toUpperCase()}-${sha256.slice(4, 8).toUpperCase()}`;
}
