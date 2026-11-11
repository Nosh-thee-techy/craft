/**
 * Purpose: Create, list, and load projects for the signed-in creative.
 * Inputs: user id plus validated create payload.
 * Outputs: project rows (money as decimal strings).
 */
import "server-only";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { invoices, payments, projects } from "@/lib/db/schema";
import type { CreateProjectInput, ProjectRow } from "@/lib/projects/schemas";

export type { ProjectRow };

export type InvoiceRow = {
  id: string;
  paypalInvoiceId: string | null;
  status: string;
  amount: string;
  currency: string;
  sentAt: string | null;
  paidAt: string | null;
};

export type PaymentRow = {
  id: string;
  paypalCaptureId: string | null;
  amount: string;
  currency: string;
  receivedAt: string;
  source: string;
};

/**
 * Format a JS number as a 2-decimal money string. Deterministic; no LLM.
 */
export function formatMoney(amount: number): string {
  return amount.toFixed(2);
}

/**
 * Public trust-page slug. Random suffix avoids collisions without leaking ids.
 */
export function makeTrustSlug(clientName: string): string {
  const base = clientName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 24);
  const suffix = crypto.randomUUID().slice(0, 8);
  return `${base || "project"}-${suffix}`;
}

/**
 * Map a DB project to the grid/API shape.
 */
function toProjectRow(row: typeof projects.$inferSelect): ProjectRow {
  return {
    id: row.id,
    clientName: row.clientName,
    clientEmail: row.clientEmail,
    scope: row.scope,
    currency: row.currency,
    amount: row.amount,
    status: row.status,
    trustSlug: row.trustSlug,
    showOnTrust: row.showOnTrust,
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * Insert a draft project owned by `userId`.
 */
export async function createProject(
  userId: string,
  input: CreateProjectInput,
): Promise<ProjectRow> {
  const amount = formatMoney(input.amount);
  const [created] = await db
    .insert(projects)
    .values({
      userId,
      clientName: input.clientName,
      clientEmail: input.clientEmail,
      scope: input.scope,
      currency: input.currency,
      amount,
      status: "draft",
      trustSlug: makeTrustSlug(input.clientName),
    })
    .returning();

  if (!created) {
    throw new Error("Failed to create project.");
  }
  return toProjectRow(created);
}

/**
 * List the current user's projects, newest first.
 */
export async function listProjects(userId: string): Promise<ProjectRow[]> {
  const rows = await db
    .select()
    .from(projects)
    .where(eq(projects.userId, userId))
    .orderBy(desc(projects.createdAt));
  return rows.map(toProjectRow);
}

/**
 * Load one project if it belongs to `userId`.
 */
export async function getProjectForUser(
  userId: string,
  projectId: string,
): Promise<ProjectRow | null> {
  const [row] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!row || row.userId !== userId) {
    return null;
  }
  return toProjectRow(row);
}

/**
 * Invoices for a project (any owner check happens at the project layer).
 */
export async function listInvoices(projectId: string): Promise<InvoiceRow[]> {
  const rows = await db
    .select()
    .from(invoices)
    .where(eq(invoices.projectId, projectId))
    .orderBy(desc(invoices.createdAt));
  return rows.map((row) => ({
    id: row.id,
    paypalInvoiceId: row.paypalInvoiceId,
    status: row.status,
    amount: row.amount,
    currency: row.currency,
    sentAt: row.sentAt?.toISOString() ?? null,
    paidAt: row.paidAt?.toISOString() ?? null,
  }));
}

/**
 * Payments recorded against a project.
 */
export async function listPayments(projectId: string): Promise<PaymentRow[]> {
  const rows = await db
    .select()
    .from(payments)
    .where(eq(payments.projectId, projectId))
    .orderBy(desc(payments.receivedAt));
  return rows.map((row) => ({
    id: row.id,
    paypalCaptureId: row.paypalCaptureId,
    amount: row.amount,
    currency: row.currency,
    receivedAt: row.receivedAt.toISOString(),
    source: row.source,
  }));
}
