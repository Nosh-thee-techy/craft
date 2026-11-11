/**
 * Purpose: Private local vault storage with time-limited signed download URLs.
 * Inputs: object key, bytes; APP_URL and AUTH_SECRET for signing.
 * Outputs: files under `.data/vault` and HMAC-signed `/api/evidence/file` URLs.
 *
 * WHY local first: the vault must work in dev without MinIO. Remote S3 lands next.
 * Signed URLs expire so a leaked link does not last forever.
 */
import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, normalize, sep } from "node:path";
import { env } from "@/lib/env";

const LOCAL_ROOT = join(process.cwd(), ".data", "vault");
const SIGN_TTL_SECONDS = 60 * 15;

export type StoredObject = {
  key: string;
  bytes: Buffer;
  contentType: string;
};

/**
 * Persist bytes under a vault key on the local disk.
 */
export async function putEvidenceObject(key: string, bytes: Buffer): Promise<void> {
  assertSafeKey(key);
  const path = localPath(key);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, bytes);
}

/**
 * Read stored bytes. Used by the signed-download route.
 */
export async function getEvidenceObject(key: string): Promise<StoredObject> {
  assertSafeKey(key);
  const path = localPath(key);
  const bytes = await readFile(path);
  return { key, bytes, contentType: contentTypeForKey(key) };
}

/**
 * Guess a Content-Type from the object key. Packs are PDFs; vault uploads stay generic.
 */
function contentTypeForKey(key: string): string {
  if (key.toLowerCase().endsWith(".pdf")) {
    return "application/pdf";
  }
  return "application/octet-stream";
}

/**
 * Time-limited URL a signed-in flow can open to download one object.
 */
export function signEvidenceUrl(key: string): string {
  assertSafeKey(key);
  const exp = Math.floor(Date.now() / 1000) + SIGN_TTL_SECONDS;
  const sig = signLocal(key, exp);
  const params = new URLSearchParams({ key, exp: String(exp), sig });
  return `${env.APP_URL}/api/evidence/file?${params.toString()}`;
}

/**
 * Accept a local signed query only if the HMAC matches and it has not expired.
 */
export function verifyLocalSignature(key: string, exp: string, sig: string): boolean {
  assertSafeKey(key);
  const expires = Number(exp);
  if (!Number.isFinite(expires) || expires * 1000 < Date.now()) {
    return false;
  }
  const expected = signLocal(key, expires);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(a, b);
}

/**
 * HMAC of key + expiry using AUTH_SECRET.
 */
function signLocal(key: string, exp: number): string {
  return createHmac("sha256", env.AUTH_SECRET).update(`${key}:${exp}`).digest("hex");
}

/**
 * Map a vault key onto `.data/vault` and refuse path escape.
 */
function localPath(key: string): string {
  const path = normalize(join(LOCAL_ROOT, key));
  const root = normalize(LOCAL_ROOT) + sep;
  if (!path.startsWith(root) && path !== normalize(LOCAL_ROOT)) {
    throw new Error("Invalid storage key.");
  }
  return path;
}

/**
 * Keys are relative POSIX paths. No `..`, no absolute paths, no backslashes.
 */
function assertSafeKey(key: string): void {
  if (
    !key ||
    key.startsWith("/") ||
    key.includes("..") ||
    key.includes("\\") ||
    key.includes("\0")
  ) {
    throw new Error("Invalid storage key.");
  }
}
