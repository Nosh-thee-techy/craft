/**
 * Purpose: SHA-256 hashing and a server clock for vault items.
 * Inputs: file bytes or a UTF-8 string (for portfolio URLs).
 * Outputs: a hex digest, plus the timestamp the server recorded.
 *
 * WHY Node crypto, not the LLM: hashes and clocks are evidence. They must
 * be deterministic and never invented.
 */
import "server-only";
import { createHash } from "node:crypto";

/**
 * Hex SHA-256 of bytes or a UTF-8 string.
 */
export function sha256Hex(input: Buffer | Uint8Array | string): string {
  return createHash("sha256").update(input).digest("hex");
}

/**
 * Server-side timestamp used as `added_at`. Callers must not take this from the client.
 */
export function evidenceTimestamp(): Date {
  return new Date();
}
