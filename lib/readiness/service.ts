/**
 * Purpose: Load profile/evidence and compute Account Readiness for the signed-in user.
 * Inputs: user id.
 * Outputs: readiness result + nudges. Never invents a freeze prediction.
 */
import "server-only";
import { and, count, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  evidenceItems,
  invoices,
  linkedAccounts,
  projects,
  users,
} from "@/lib/db/schema";
import { computeReadiness } from "@/lib/readiness/compute";
import { readinessNudges, type Nudge } from "@/lib/readiness/nudges";
import type { ReadinessEvidence, ReadinessResult } from "@/lib/readiness/types";

export type ReadinessView = {
  result: ReadinessResult;
  nudges: Nudge[];
};

/**
 * Server-side readiness for dashboard / onboarding.
 */
export async function getReadinessForUser(userId: string): Promise<ReadinessView> {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) {
    const empty = computeReadiness({ profile: {}, evidence: [] });
    return { result: empty, nudges: readinessNudges(empty, []) };
  }

  const [linkCount] = await db
    .select({ value: count() })
    .from(linkedAccounts)
    .where(and(eq(linkedAccounts.userId, userId), eq(linkedAccounts.status, "verified")));

  const evidenceRows = await db
    .select()
    .from(evidenceItems)
    .where(eq(evidenceItems.userId, userId));

  const ownedInvoices = await db
    .select({
      projectId: invoices.projectId,
      status: invoices.status,
    })
    .from(invoices)
    .innerJoin(projects, eq(invoices.projectId, projects.id))
    .where(eq(projects.userId, userId));

  const evidence: ReadinessEvidence[] = evidenceRows.map((row) => ({
    type: row.type,
    projectId: row.projectId,
    docDate: row.docDate,
    addressText: row.addressText,
    holderName: row.holderName,
    extractedConfirmed: row.extractedConfirmed,
  }));

  const result = computeReadiness({
    profile: {
      legalName: user.legalName,
      name: user.name,
      addressEstate: user.addressEstate,
      addressRoad: user.addressRoad,
      addressBuilding: user.addressBuilding,
      addressLandmark: user.addressLandmark,
      addressTown: user.addressTown,
      addressCounty: user.addressCounty,
      plusCode: user.plusCode,
      incomeStatement: user.incomeStatement,
      bankLinkedAttested: user.bankLinkedAttested,
      verifiedLinkCount: Number(linkCount?.value ?? 0),
    },
    evidence,
    invoices: ownedInvoices,
  });

  return {
    result,
    nudges: readinessNudges(result, evidence),
  };
}
