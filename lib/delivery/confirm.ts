/**
 * Purpose: Public one-click receipt confirmation. No login.
 * Inputs: confirm token from /c/[token].
 * Outputs: project summary + optional confirmation timestamp.
 *
 * Never exposes private vault files — only client name, scope, and status.
 */
import "server-only";
import { eq } from "drizzle-orm";
import { logAgentAction } from "@/lib/ai/log";
import { db } from "@/lib/db/client";
import { deliverables, projects, users } from "@/lib/db/schema";

export type ConfirmView = {
  token: string;
  clientName: string;
  creativeName: string | null;
  scope: string;
  deliveredAt: string | null;
  clientConfirmedAt: string | null;
  publishLinks: string[];
};

/**
 * Load the public confirm page payload. Returns null for unknown tokens.
 */
export async function getConfirmView(token: string): Promise<ConfirmView | null> {
  const [row] = await db
    .select({
      deliverable: deliverables,
      project: projects,
      creativeName: users.name,
    })
    .from(deliverables)
    .innerJoin(projects, eq(deliverables.projectId, projects.id))
    .innerJoin(users, eq(projects.userId, users.id))
    .where(eq(deliverables.confirmToken, token))
    .limit(1);

  if (!row) {
    return null;
  }

  const links = Array.isArray(row.deliverable.publishLinksJson)
    ? (row.deliverable.publishLinksJson as unknown[]).filter(
        (value): value is string => typeof value === "string",
      )
    : [];

  return {
    token,
    clientName: row.project.clientName,
    creativeName: row.creativeName,
    scope: row.project.scope,
    deliveredAt: row.deliverable.deliveredAt?.toISOString() ?? null,
    clientConfirmedAt: row.deliverable.clientConfirmedAt?.toISOString() ?? null,
    publishLinks: links,
  };
}

/**
 * Stamp client_confirmed_at once. Idempotent on repeat clicks.
 */
export async function confirmReceipt(token: string): Promise<ConfirmView | null> {
  const existing = await getConfirmView(token);
  if (!existing) {
    return null;
  }
  if (existing.clientConfirmedAt) {
    return existing;
  }

  const confirmedAt = new Date();
  await db
    .update(deliverables)
    .set({ clientConfirmedAt: confirmedAt, updatedAt: confirmedAt })
    .where(eq(deliverables.confirmToken, token));

  const [owner] = await db
    .select({ userId: projects.userId, projectId: projects.id })
    .from(deliverables)
    .innerJoin(projects, eq(deliverables.projectId, projects.id))
    .where(eq(deliverables.confirmToken, token))
    .limit(1);

  if (owner) {
    await logAgentAction({
      userId: owner.userId,
      action: "delivery.client_confirm",
      input: { token, projectId: owner.projectId },
      output: { clientConfirmedAt: confirmedAt.toISOString() },
    });
  }

  return getConfirmView(token);
}
