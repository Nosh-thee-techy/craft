/**
 * Purpose: Mark a project delivered — hash the final file, store publish links, open confirm.
 * Inputs: owning user, project id, file bytes, optional public links.
 * Outputs: a deliverable row with confirm token. AI never creates the evidence row.
 */
import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { checkDeliverableMatch } from "@/lib/ai/match-check";
import { logAgentAction } from "@/lib/ai/log";
import { readEvidenceFile } from "@/lib/ai/reader";
import { LlmNotConfiguredError } from "@/lib/ai/client";
import { db } from "@/lib/db/client";
import { deliverables, evidenceItems, projects } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { evidenceTimestamp, sha256Hex } from "@/lib/evidence/hash";
import { MAX_EVIDENCE_BYTES, ALLOWED_EVIDENCE_TYPES } from "@/lib/evidence/schemas";
import { putEvidenceObject } from "@/lib/evidence/storage";
import { safeFileName } from "@/lib/evidence/service";
import { getProjectForUser } from "@/lib/projects/service";
import {
  matchCheckSchema,
  type DeliverableRow,
  type MatchCheck,
} from "@/lib/delivery/schemas";

/**
 * Upload the final file, hash it, run the match check, mark the project delivered.
 */
export async function deliverProject(
  userId: string,
  projectId: string,
  file: { name: string; type: string; bytes: Buffer },
  publishLinks: string[],
): Promise<DeliverableRow> {
  const project = await getProjectForUser(userId, projectId);
  if (!project) {
    throw new Error("Project not found.");
  }
  if (file.bytes.byteLength === 0 || file.bytes.byteLength > MAX_EVIDENCE_BYTES) {
    throw new Error("File must be between 1 byte and 12 MB.");
  }
  if (!ALLOWED_EVIDENCE_TYPES.includes(file.type as (typeof ALLOWED_EVIDENCE_TYPES)[number])) {
    throw new Error("That file type is not allowed.");
  }

  const evidenceId = crypto.randomUUID();
  const deliveredAt = evidenceTimestamp();
  const digest = sha256Hex(file.bytes);
  const key = `${userId}/${projectId}/${evidenceId}/${safeFileName(file.name)}`;
  await putEvidenceObject(key, file.bytes);

  const [evidence] = await db
    .insert(evidenceItems)
    .values({
      id: evidenceId,
      projectId,
      type: "deliverable",
      storageKey: key,
      sha256: digest,
      addedBy: userId,
      addedAt: deliveredAt,
    })
    .returning();
  if (!evidence) {
    throw new Error("Could not store the deliverable in the vault.");
  }

  try {
    await readEvidenceFile(userId, evidenceId, file.bytes, file.type || "application/octet-stream");
  } catch (error) {
    if (!(error instanceof LlmNotConfiguredError)) {
      await logAgentAction({
        userId,
        action: "delivery.reader",
        input: { evidenceId },
        output: { error: error instanceof Error ? error.message : "reader failed" },
        verifierPassed: false,
      });
    }
  }

  const [fresh] = await db
    .select({ extractedText: evidenceItems.extractedText })
    .from(evidenceItems)
    .where(eq(evidenceItems.id, evidenceId))
    .limit(1);

  const matchCheck = await checkDeliverableMatch({
    userId,
    projectId,
    scope: project.scope,
    deliverableText: fresh?.extractedText ?? "",
    fileName: safeFileName(file.name),
  });

  const confirmToken = crypto.randomUUID().replace(/-/g, "");
  const [row] = await db
    .insert(deliverables)
    .values({
      projectId,
      evidenceItemId: evidenceId,
      confirmToken,
      publishLinksJson: publishLinks,
      matchCheckJson: matchCheck,
      deliveredAt,
    })
    .returning();
  if (!row) {
    throw new Error("Could not record the delivery.");
  }

  await db
    .update(projects)
    .set({ status: "delivered", updatedAt: new Date() })
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)));

  await logAgentAction({
    userId,
    action: "delivery.create",
    input: { projectId, fileName: file.name, publishLinks },
    output: { deliverableId: row.id, sha256: digest, confirmToken },
  });

  return toDeliverableRow(row, safeFileName(file.name), digest);
}

/**
 * Deliverables for one owned project, newest first.
 */
export async function listDeliverables(
  userId: string,
  projectId: string,
): Promise<DeliverableRow[]> {
  const project = await getProjectForUser(userId, projectId);
  if (!project) {
    return [];
  }
  const rows = await db
    .select({
      deliverable: deliverables,
      storageKey: evidenceItems.storageKey,
      sha256: evidenceItems.sha256,
    })
    .from(deliverables)
    .leftJoin(evidenceItems, eq(deliverables.evidenceItemId, evidenceItems.id))
    .where(eq(deliverables.projectId, projectId))
    .orderBy(desc(deliverables.deliveredAt));

  return rows.map(({ deliverable, storageKey, sha256 }) =>
    toDeliverableRow(
      deliverable,
      storageKey?.split("/").pop() ?? null,
      sha256,
    ),
  );
}

/**
 * Public confirm URL for a deliverable token.
 */
export function confirmUrlFor(token: string): string {
  return `${env.APP_URL}/c/${token}`;
}

/**
 * Map a DB row onto the UI shape.
 */
function toDeliverableRow(
  row: typeof deliverables.$inferSelect,
  fileName: string | null,
  sha256: string | null,
): DeliverableRow {
  const links = Array.isArray(row.publishLinksJson)
    ? (row.publishLinksJson as unknown[]).filter((value): value is string => typeof value === "string")
    : [];
  let matchCheck: MatchCheck | null = null;
  if (row.matchCheckJson) {
    const parsed = matchCheckSchema.safeParse(row.matchCheckJson);
    matchCheck = parsed.success ? parsed.data : null;
  }
  return {
    id: row.id,
    projectId: row.projectId,
    evidenceItemId: row.evidenceItemId,
    confirmToken: row.confirmToken,
    publishLinks: links,
    matchCheck,
    deliveredAt: row.deliveredAt?.toISOString() ?? null,
    clientConfirmedAt: row.clientConfirmedAt?.toISOString() ?? null,
    fileName,
    sha256,
  };
}
