/**
 * Purpose: Server helper to run pre-invoice checks for a project before send.
 * Inputs: user id + project id.
 * Outputs: flags with reasons (advice only). Does not block PayPal send.
 */
import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { completeJson } from "@/lib/ai/client";
import {
  explainInvoiceFlags,
  type ExplainedFlag,
} from "@/lib/ai/invoice-flag-explainer-core";
import { logAgentAction } from "@/lib/ai/log";
import { db } from "@/lib/db/client";
import { evidenceItems, invoices, payments, projects, users } from "@/lib/db/schema";
import { completenessFromTypes } from "@/lib/evidence/completeness";
import { checkInvoice } from "@/lib/readiness/invoice-check";

/**
 * Compute flags for the project's current amount / client vs account history,
 * then attach F7 one-sentence explanations (LLM cannot add/remove flags).
 */
export async function precheckProjectInvoice(
  userId: string,
  projectId: string,
  opts?: { clientCountry?: string | null },
): Promise<ExplainedFlag[]> {
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!project || project.userId !== userId) {
    throw new Error("Project not found.");
  }

  const [owner] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

  const paid = await db
    .select({ amount: payments.amount })
    .from(payments)
    .innerJoin(projects, eq(payments.projectId, projects.id))
    .where(eq(projects.userId, userId))
    .orderBy(desc(payments.receivedAt))
    .limit(10);

  const pastInvoices = await db
    .select({ clientCountry: invoices.clientCountry })
    .from(invoices)
    .innerJoin(projects, eq(invoices.projectId, projects.id))
    .where(eq(projects.userId, userId));

  const types = await db
    .select({ type: evidenceItems.type })
    .from(evidenceItems)
    .where(and(eq(evidenceItems.projectId, projectId)));

  const completeness = completenessFromTypes(types.map((row) => row.type));
  const hasContract = types.some((row) => row.type === "contract");

  const flags = checkInvoice({
    amount: Number(project.amount),
    clientCountry: opts?.clientCountry ?? null,
    sellerName: owner?.legalName ?? owner?.name,
    profileLegalName: owner?.legalName,
    profileName: owner?.name,
    recentPaidAmounts: paid.map((row) => Number(row.amount)),
    knownClientCountries: pastInvoices
      .map((row) => row.clientCountry)
      .filter((value): value is string => Boolean(value)),
    projectCompletenessPercent: completeness.score,
    hasContractForClient: hasContract,
  });

  const explained = await explainInvoiceFlags(flags, completeJson);
  await logAgentAction({
    userId,
    action: "invoice.flag_explain",
    input: { projectId, flagCount: flags.length },
    output: { source: explained.source, codes: explained.flags.map((f) => f.code) },
  });

  return explained.flags;
}
