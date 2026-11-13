/**
 * Purpose: Create and list vault items for a project or account-level Identity files.
 * Inputs: user id, optional project id, file bytes or a portfolio URL.
 * Outputs: evidence rows plus a completeness score. The AI never inserts rows.
 *
 * Account-level rows (no projectId) are private: callers of public routes must
 * use `publicEvidenceRows` / never select them for /t or /c.
 */
import "server-only";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { evidenceItems, projects } from "@/lib/db/schema";
import { completenessFromTypes, type Completeness } from "@/lib/evidence/completeness";
import { evidenceTimestamp, sha256Hex } from "@/lib/evidence/hash";
import {
  ALLOWED_EVIDENCE_TYPES,
  isAccountEvidenceType,
  MAX_EVIDENCE_BYTES,
  type AccountEvidenceType,
  type EvidenceRow,
  type EvidenceType,
} from "@/lib/evidence/schemas";
import { putEvidenceObject, signEvidenceUrl } from "@/lib/evidence/storage";
import { getProjectForUser } from "@/lib/projects/service";

const ACCOUNT_LABEL = "Identity and funds";

/**
 * Keep file names path-safe so they can sit in the storage key.
 */
export function safeFileName(name: string): string {
  const trimmed = name.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  return trimmed.slice(0, 80) || "file";
}

/**
 * Map a DB row onto the ledger shape.
 */
function toEvidenceRow(
  row: typeof evidenceItems.$inferSelect,
  projectName: string,
): EvidenceRow {
  const fileName = row.storageKey?.split("/").pop() ?? null;
  return {
    id: row.id,
    projectId: row.projectId,
    projectName,
    type: row.type,
    fileName: row.type === "portfolio_link" ? row.storageKey : fileName,
    sha256: row.sha256,
    addedAt: row.addedAt.toISOString(),
    hasExtractedText: Boolean(row.extractedText),
    holderName: row.holderName,
    issuer: row.issuer,
    docDate: row.docDate?.toISOString() ?? null,
    expiresAt: row.expiresAt?.toISOString() ?? null,
  };
}

/**
 * List project evidence the user can see, newest first.
 * Does not include account-level Identity rows (use listAccountEvidence).
 */
export async function listEvidence(
  userId: string,
  projectId?: string,
): Promise<EvidenceRow[]> {
  const rows = await db
    .select({
      item: evidenceItems,
      projectName: projects.clientName,
    })
    .from(evidenceItems)
    .innerJoin(projects, eq(evidenceItems.projectId, projects.id))
    .where(
      projectId
        ? and(eq(projects.userId, userId), eq(evidenceItems.projectId, projectId))
        : eq(projects.userId, userId),
    )
    .orderBy(desc(evidenceItems.addedAt));

  return rows.map(({ item, projectName }) => toEvidenceRow(item, projectName));
}

/**
 * List account-level Identity and funds uploads for this user.
 */
export async function listAccountEvidence(userId: string): Promise<EvidenceRow[]> {
  const rows = await db
    .select()
    .from(evidenceItems)
    .where(and(eq(evidenceItems.userId, userId), isNull(evidenceItems.projectId)))
    .orderBy(desc(evidenceItems.addedAt));

  return rows
    .filter((row) => isAccountEvidenceType(row.type))
    .map((row) => toEvidenceRow(row, ACCOUNT_LABEL));
}

/**
 * Completeness for one owned project (project types only).
 */
export async function projectCompleteness(
  userId: string,
  projectId: string,
): Promise<Completeness | null> {
  const project = await getProjectForUser(userId, projectId);
  if (!project) {
    return null;
  }
  const rows = await db
    .select({ type: evidenceItems.type })
    .from(evidenceItems)
    .where(eq(evidenceItems.projectId, projectId));
  return completenessFromTypes(rows.map((row) => row.type));
}

/**
 * Store a project file, hash it on the server, and insert an evidence row.
 */
export async function addFileEvidence(
  userId: string,
  projectId: string,
  type: Exclude<EvidenceType, "portfolio_link">,
  file: { name: string; type: string; bytes: Buffer },
): Promise<EvidenceRow> {
  if (isAccountEvidenceType(type)) {
    throw new Error("Upload Identity and funds files in the account section, not on a project.");
  }
  const project = await getProjectForUser(userId, projectId);
  if (!project) {
    throw new Error("Project not found.");
  }
  assertFileOk(file);

  const id = crypto.randomUUID();
  const addedAt = evidenceTimestamp();
  const digest = sha256Hex(file.bytes);
  const key = `${userId}/${projectId}/${id}/${safeFileName(file.name)}`;

  await putEvidenceObject(key, file.bytes);

  const [created] = await db
    .insert(evidenceItems)
    .values({
      id,
      userId,
      projectId,
      type,
      storageKey: key,
      sha256: digest,
      addedBy: userId,
      addedAt,
    })
    .returning();

  if (!created) {
    throw new Error("Failed to record evidence.");
  }
  return toEvidenceRow(created, project.clientName);
}

/**
 * Store an account-level Identity and funds file (no project).
 */
export async function addAccountFileEvidence(
  userId: string,
  type: AccountEvidenceType,
  file: { name: string; type: string; bytes: Buffer },
  meta?: { holderName?: string; issuer?: string; docDate?: Date | null },
): Promise<EvidenceRow> {
  assertFileOk(file);

  const id = crypto.randomUUID();
  const addedAt = evidenceTimestamp();
  const digest = sha256Hex(file.bytes);
  const key = `${userId}/account/${id}/${safeFileName(file.name)}`;

  await putEvidenceObject(key, file.bytes);

  const docDate = meta?.docDate ?? null;
  const expiresAt =
    type === "address_proof" && docDate
      ? new Date(docDate.getTime() + 90 * 24 * 60 * 60 * 1000)
      : null;

  const [created] = await db
    .insert(evidenceItems)
    .values({
      id,
      userId,
      projectId: null,
      type,
      storageKey: key,
      sha256: digest,
      holderName: meta?.holderName?.trim() || null,
      issuer: meta?.issuer?.trim() || null,
      docDate,
      expiresAt,
      addedBy: userId,
      addedAt,
    })
    .returning();

  if (!created) {
    throw new Error("Failed to record identity evidence.");
  }
  return toEvidenceRow(created, ACCOUNT_LABEL);
}

/**
 * Record a portfolio URL. The hash is of the URL string, not a file.
 */
export async function addLinkEvidence(
  userId: string,
  projectId: string,
  url: string,
): Promise<EvidenceRow> {
  const project = await getProjectForUser(userId, projectId);
  if (!project) {
    throw new Error("Project not found.");
  }

  const addedAt = evidenceTimestamp();
  const digest = sha256Hex(url);

  const [created] = await db
    .insert(evidenceItems)
    .values({
      userId,
      projectId,
      type: "portfolio_link",
      storageKey: url,
      sha256: digest,
      addedBy: userId,
      addedAt,
    })
    .returning();

  if (!created) {
    throw new Error("Failed to record the link.");
  }
  return toEvidenceRow(created, project.clientName);
}

/**
 * Signed download URL for a file the user owns. Links (http) are returned as-is.
 */
export async function downloadUrlFor(
  userId: string,
  evidenceId: string,
): Promise<string | null> {
  const [row] = await db
    .select()
    .from(evidenceItems)
    .where(eq(evidenceItems.id, evidenceId))
    .limit(1);

  if (!row || row.userId !== userId || !row.storageKey) {
    return null;
  }
  if (row.type === "portfolio_link") {
    return row.storageKey;
  }
  return signEvidenceUrl(row.storageKey);
}

function assertFileOk(file: { type: string; bytes: Buffer }) {
  if (file.bytes.byteLength === 0 || file.bytes.byteLength > MAX_EVIDENCE_BYTES) {
    throw new Error("File must be between 1 byte and 12 MB.");
  }
  if (!ALLOWED_EVIDENCE_TYPES.includes(file.type as (typeof ALLOWED_EVIDENCE_TYPES)[number])) {
    throw new Error("That file type is not allowed in the vault.");
  }
}
