/**
 * Purpose: Persist limitation notices and Freeze Shield packs; run the pipeline.
 * Inputs: signed-in user, pasted notice, later approve/export.
 * Outputs: a pack row. Export is refused until verifier pass + user approval + preflight.
 */
import "server-only";
import { and, desc, eq, inArray } from "drizzle-orm";
import { logAgentAction } from "@/lib/ai/log";
import {
  draftPackLetter,
  mapNoticeToVault,
  parseLimitationNotice,
} from "@/lib/ai/freezeShield";
import { verifyClaims } from "@/lib/ai/verifier";
import { db } from "@/lib/db/client";
import { evidenceItems, limitationNotices, responsePacks, users } from "@/lib/db/schema";
import { getEvidenceObject, putEvidenceObject, signEvidenceUrl } from "@/lib/evidence/storage";
import { buildResponseBundle } from "@/lib/freeze/bundle";
import { CASE_STATUSES, type CaseStatus } from "@/lib/freeze/deadline";
import { gapListFromMapping } from "@/lib/freeze/gaps";
import { runPreflight, type PreflightFile } from "@/lib/freeze/preflight";
import {
  mappingSchema,
  packDraftSchema,
  parsedNoticeSchema,
  verifierReportSchema,
  type EvidenceMapping,
  type FreezeFormState,
  type PackDraft,
  type ParsedNotice,
  type VerifierReport,
} from "@/lib/freeze/schemas";
import { buildPackPdf } from "@/lib/pdf/pack";

export type StoredPack = {
  noticeId: string;
  packId: string;
  status: "draft" | "verified" | "approved" | "exported";
  parsed: ParsedNotice;
  mapping: EvidenceMapping;
  draft: PackDraft;
  report: VerifierReport;
  downloadUrl: string | null;
};

type PackReportJson = {
  parsed: ParsedNotice;
  mapping: EvidenceMapping;
  draft: PackDraft;
  report: VerifierReport;
};

/**
 * Parse, map, draft, verify, and store a pack. Status is verified only if all claims pass.
 */
export async function runFreezeShield(userId: string, rawText: string): Promise<StoredPack> {
  const [notice] = await db
    .insert(limitationNotices)
    .values({ userId, rawText, parsedJson: null })
    .returning();
  if (!notice) {
    throw new Error("Could not store the notice.");
  }

  const parsed = await parseLimitationNotice(userId, rawText);
  const deadlineAt =
    parsed.deadlineAt && !Number.isNaN(Date.parse(parsed.deadlineAt))
      ? new Date(`${parsed.deadlineAt}T00:00:00.000Z`)
      : null;
  await db
    .update(limitationNotices)
    .set({ parsedJson: parsed, deadlineAt, updatedAt: new Date() })
    .where(eq(limitationNotices.id, notice.id));

  const { mapping, sources } = await mapNoticeToVault(userId, parsed);
  const draft = await draftPackLetter(userId, parsed, mapping);
  const report = await verifyClaims({
    userId,
    outgoing: `${draft.letter}\n${draft.index
      .filter((item) => item.status === "covered")
      .map((item) => `${item.fileName ?? ""} ${item.sha256 ?? ""}`)
      .join("\n")}`,
    sources,
  });

  const payload: PackReportJson = { parsed, mapping, draft, report };
  const status = report.passed ? "verified" : "draft";
  const [pack] = await db
    .insert(responsePacks)
    .values({
      noticeId: notice.id,
      status,
      verifierReportJson: payload,
    })
    .returning();
  if (!pack) {
    throw new Error("Could not store the response pack.");
  }

  await logAgentAction({
    userId,
    action: "freeze.run",
    input: { noticeId: notice.id },
    output: { packId: pack.id, status, passed: report.passed },
    verifierPassed: report.passed,
  });

  return {
    noticeId: notice.id,
    packId: pack.id,
    status,
    parsed,
    mapping,
    draft,
    report,
    downloadUrl: null,
  };
}

/**
 * Latest pack for the Freeze Shield page, if any.
 */
export async function latestPackForUser(userId: string): Promise<StoredPack | null> {
  const [row] = await db
    .select({
      pack: responsePacks,
      notice: limitationNotices,
    })
    .from(responsePacks)
    .innerJoin(limitationNotices, eq(responsePacks.noticeId, limitationNotices.id))
    .where(eq(limitationNotices.userId, userId))
    .orderBy(desc(responsePacks.createdAt))
    .limit(1);

  if (!row) {
    return null;
  }
  return hydratePack(row.pack, row.notice.id);
}

/**
 * User approval. Refused unless the verifier already passed.
 */
export async function approvePack(userId: string, packId: string): Promise<StoredPack> {
  const pack = await ownedPack(userId, packId);
  if (pack.pack.status !== "verified" && pack.pack.status !== "approved") {
    throw new Error("The verifier has not passed. Export stays closed.");
  }

  const [updated] = await db
    .update(responsePacks)
    .set({ status: "approved", updatedAt: new Date() })
    .where(eq(responsePacks.id, packId))
    .returning();
  if (!updated) {
    throw new Error("Could not approve this pack.");
  }

  await logAgentAction({
    userId,
    action: "freeze.approve",
    input: { packId },
    output: { status: "approved" },
    verifierPassed: true,
    approvedByUser: true,
  });

  return hydratePack(updated, pack.notice.id);
}

/**
 * Build PDF + ZIP bundle. Only after verifier pass, user approval, and preflight.
 */
export async function exportPack(userId: string, packId: string): Promise<StoredPack> {
  const owned = await ownedPack(userId, packId);
  if (owned.pack.status !== "approved" && owned.pack.status !== "exported") {
    throw new Error("Approve the verified pack before export.");
  }

  const stored = hydratePack(owned.pack, owned.notice.id);
  const [user] = await db
    .select({
      name: users.name,
      legalName: users.legalName,
      email: users.email,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const coveredIds = stored.draft.index
    .filter((item) => item.status === "covered" && item.evidenceId)
    .map((item) => item.evidenceId as string);

  const evidenceRows =
    coveredIds.length === 0
      ? []
      : await db.select().from(evidenceItems).where(inArray(evidenceItems.id, coveredIds));

  const preflightFiles: PreflightFile[] = [];
  const bundleFiles: { exportName: string; bytes: Buffer; evidenceId: string }[] = [];

  let ordinal = 1;
  for (const item of stored.draft.index) {
    if (item.status !== "covered" || !item.evidenceId) continue;
    const row = evidenceRows.find((candidate) => candidate.id === item.evidenceId);
    if (!row?.storageKey || row.type === "portfolio_link") continue;
    const object = await getEvidenceObject(row.storageKey);
    const exportName = `${String(ordinal).padStart(2, "0")}-${safeExportName(item.fileName ?? row.storageKey)}`;
    ordinal += 1;
    preflightFiles.push({
      evidenceId: row.id,
      fileName: exportName,
      mimeType: object.contentType,
      bytes: object.bytes,
      type: row.type,
      docDate: row.docDate,
      holderName: row.holderName,
    });
    bundleFiles.push({ exportName, bytes: object.bytes, evidenceId: row.id });
  }

  const preflight = runPreflight(preflightFiles, user?.legalName ?? user?.name);
  await db
    .update(responsePacks)
    .set({ preflightJson: preflight, updatedAt: new Date() })
    .where(eq(responsePacks.id, packId));

  if (!preflight.ok) {
    const first = preflight.issues[0];
    throw new Error(
      first
        ? `Preflight blocked export: ${first.reason} ${first.fix}`
        : "Preflight blocked export.",
    );
  }

  const pdf = await buildPackPdf({
    studioName: user?.name || user?.email || "CRAFT studio",
    notice: stored.parsed,
    draft: stored.draft,
    report: stored.report,
  });

  const bundle = await buildResponseBundle({
    letterPdf: pdf,
    index: stored.draft.index,
    files: bundleFiles.map(({ exportName, bytes }) => ({ exportName, bytes })),
  });

  const pdfKey = `${userId}/packs/${packId}.pdf`;
  const bundleKey = `${userId}/packs/${packId}.zip`;
  await putEvidenceObject(pdfKey, pdf);
  await putEvidenceObject(bundleKey, bundle.zipBytes);

  const [updated] = await db
    .update(responsePacks)
    .set({
      status: "exported",
      pdfKey,
      bundleKey,
      preflightJson: preflight,
      updatedAt: new Date(),
    })
    .where(eq(responsePacks.id, packId))
    .returning();
  if (!updated) {
    throw new Error("Could not export this pack.");
  }

  await db
    .update(limitationNotices)
    .set({
      caseStatus: "exported",
      statusUpdatedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(limitationNotices.id, owned.notice.id));

  await logAgentAction({
    userId,
    action: "freeze.export",
    input: { packId },
    output: {
      pdfKey,
      bundleKey,
      gaps: gapListFromMapping(stored.mapping),
      manifestFiles: Object.keys(bundle.hashes),
    },
    verifierPassed: true,
  });

  return {
    ...hydratePack(updated, owned.notice.id),
    downloadUrl: signEvidenceUrl(bundleKey),
  };
}

/**
 * User updates Resolution Centre case status after they upload the pack themselves.
 */
export async function setCaseStatus(
  userId: string,
  noticeId: string,
  caseStatus: CaseStatus,
): Promise<void> {
  if (!(CASE_STATUSES as readonly string[]).includes(caseStatus)) {
    throw new Error("Unknown case status.");
  }
  const [row] = await db
    .update(limitationNotices)
    .set({
      caseStatus,
      statusUpdatedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(limitationNotices.id, noticeId), eq(limitationNotices.userId, userId)))
    .returning();
  if (!row) {
    throw new Error("Notice not found.");
  }
}

function safeExportName(name: string): string {
  const base = name.split("/").pop() ?? "file";
  return base.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 80) || "file";
}

/**
 * Shape a pack for the UI.
 */
export function toFormState(pack: StoredPack): FreezeFormState {
  return {
    ok: true,
    packId: pack.packId,
    noticeId: pack.noticeId,
    parsed: pack.parsed,
    mapping: pack.mapping,
    draft: pack.draft,
    report: pack.report,
    status: pack.status,
    downloadUrl: pack.downloadUrl ?? undefined,
  };
}

/**
 * Load a pack the user owns.
 */
async function ownedPack(userId: string, packId: string) {
  const [row] = await db
    .select({
      pack: responsePacks,
      notice: limitationNotices,
    })
    .from(responsePacks)
    .innerJoin(limitationNotices, eq(responsePacks.noticeId, limitationNotices.id))
    .where(and(eq(responsePacks.id, packId), eq(limitationNotices.userId, userId)))
    .limit(1);
  if (!row) {
    throw new Error("Pack not found.");
  }
  return row;
}

/**
 * Rehydrate JSON stored on the pack row.
 */
function hydratePack(
  pack: typeof responsePacks.$inferSelect,
  noticeId: string,
): StoredPack {
  const payload = pack.verifierReportJson as PackReportJson | null;
  if (!payload) {
    throw new Error("This pack has no verifier payload.");
  }
  return {
    noticeId,
    packId: pack.id,
    status: pack.status,
    parsed: parsedNoticeSchema.parse(payload.parsed),
    mapping: mappingSchema.parse(payload.mapping),
    draft: packDraftSchema.parse(payload.draft),
    report: verifierReportSchema.parse(payload.report),
    downloadUrl: pack.bundleKey
      ? signEvidenceUrl(pack.bundleKey)
      : pack.pdfKey
        ? signEvidenceUrl(pack.pdfKey)
        : null,
  };
}
