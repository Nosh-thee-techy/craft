/**
 * Purpose: Hash and verify passwords for Auth.js email login.
 * Inputs: plaintext password and, for verify, a stored bcrypt hash.
 * Outputs: hash string, or a boolean match.
 *
 * WHY bcryptjs: pure JS, no native addons, so Render's Node image can run it.
 */
import bcrypt from "bcryptjs";

const ROUNDS = 12;

/**
 * Hash a plaintext password for storage on `users.password_hash`.
 */
export async function hashPassword(plaintext: string): Promise<string> {
  return bcrypt.hash(plaintext, ROUNDS);
}

/**
 * Compare a login attempt against the stored hash.
 */
export async function verifyPassword(
  plaintext: string,
  passwordHash: string,
): Promise<boolean> {
  return bcrypt.compare(plaintext, passwordHash);
}
