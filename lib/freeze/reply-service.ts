/**
 * Purpose: Phase 2 F4 — draft a follow-up reply from vault facts, then verify.
 * Inputs: user id, existing pack id, follow-up text.
 * Outputs: a new StoredPack gated by verifier + approval (same as the first pack).
 */
import "server-only";
import { and, eq } from "drizzle-orm";
import { completeJson } from "@/lib/ai/client";
import { loadVaultSources } from "@/lib/ai/freezeShield";
import { logAgentAction } from "@/lib/ai/log";
import { draftFollowUpReply } from "@/lib/ai/reply-assistant-core";
import { verifyClaims } from "@/lib/ai/verifier";
import { db } from "@/lib/db/client";
import { limitationNotices, responsePacks } from "@/lib/db/schema";
import type { PackDraft, ParsedNotice } from "@/lib/freeze/schemas";
import { packFromRow, type StoredPack } from "@/lib/freeze/service";

/**
 * Draft a calm reply to a PayPal follow-up using only vault-covered cites.
 */
export async function draftFollowUpPack(
  userId: string,
  packId: string,
  followUp: string,
): Promise<StoredPack> {
  const owned = await ownedPack(userId, packId);
  const covered = owned.mapping.covered.flatMap((item) => {
    const match = item.matches[0];
    if (!match) return [];
    return [
      {
        requestLabel: item.request.label,
        fileName: match.fileName,
        sha256: match.sha256,
        type: match.type,
      },
    ];
  });
  const missingLabels = owned.mapping.missing.map((item) => item.request.label);

  const { letter, source } = await draftFollowUpReply(
    { followUp, covered, missingLabels },
    completeJson,
  );

  const index: PackDraft["index"] = [
    ...owned.mapping.covered.map((item) => {
      const match = item.matches[0]!;
      return {
        requestLabel: item.request.label,
        status: "covered" as const,
        evidenceId: match.evidenceId,
        fileName: match.fileName,
        sha256: match.sha256,
        addedAt: match.addedAt,
        type: match.type,
      };
    }),
    ...owned.mapping.missing.map((item) => ({
      requestLabel: item.request.label,
      status: "missing" as const,
      evidenceId: null,
      fileName: null,
      sha256: null,
      addedAt: null,
      type: item.request.documentType,
    })),
  ];

  const draft: PackDraft = { letter, index };
  const sources = await loadVaultSources(userId);
  const report = await verifyClaims({
    userId,
    outgoing: `${letter}\n${index
      .filter((item) => item.status === "covered")
      .map((item) => `${item.fileName ?? ""} ${item.sha256 ?? ""}`)
      .join("\n")}`,
    sources,
  });

  const parsed: ParsedNotice = {
    ...owned.parsed,
    summary: `Follow-up reply: ${owned.parsed.summary}`,
  };

  const status = report.passed ? "verified" : "draft";
  const [pack] = await db
    .insert(responsePacks)
    .values({
      noticeId: owned.noticeId,
      status,
      verifierReportJson: {
        parsed,
        mapping: owned.mapping,
        draft,
        report,
        reviewGaps: owned.reviewGaps,
        reviewSource: owned.reviewSource,
        followUp: followUp.slice(0, 4000),
      },
    })
    .returning();
  if (!pack) {
    throw new Error("Could not store the follow-up pack.");
  }

  await logAgentAction({
    userId,
    action: "reply.draft",
    input: { packId, followUpChars: followUp.length },
    output: { newPackId: pack.id, source, passed: report.passed },
    verifierPassed: report.passed,
  });

  return {
    noticeId: owned.noticeId,
    packId: pack.id,
    status,
    parsed,
    mapping: owned.mapping,
    draft,
    report,
    reviewGaps: owned.reviewGaps,
    reviewSource: owned.reviewSource,
    downloadUrl: null,
  };
}

/**
 * Load a pack the signed-in user owns.
 */
async function ownedPack(userId: string, packId: string): Promise<StoredPack> {
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
  return packFromRow(row.pack, row.notice.id);
}
