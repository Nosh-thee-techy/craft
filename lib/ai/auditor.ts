/**
 * Purpose: Turn a project's vault into a gap list and questions for the creative.
 * Inputs: owned project evidence; completeness from code.
 * Outputs: missing types (from code) plus LLM questions that only reference uploads.
 */
import "server-only";
import { z } from "zod";
import { completeJson, LlmNotConfiguredError } from "@/lib/ai/client";
import { logAgentAction } from "@/lib/ai/log";
import { completenessFromTypes, type Completeness } from "@/lib/evidence/completeness";
import { listEvidence } from "@/lib/evidence/service";
import { db } from "@/lib/db/client";
import { evidenceItems } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const questionsSchema = z.object({
  questions: z.array(z.string()).max(8),
});

export type AuditReport = {
  completeness: Completeness;
  questions: string[];
  llmEnabled: boolean;
};

/**
 * Gap list is computed in code. Questions may be phrased by the LLM from uploaded text only.
 */
export async function auditProject(userId: string, projectId: string): Promise<AuditReport> {
  const rows = await listEvidence(userId, projectId);
  const completeness = completenessFromTypes(rows.map((row) => row.type));

  const sources = await db
    .select({
      type: evidenceItems.type,
      extractedText: evidenceItems.extractedText,
    })
    .from(evidenceItems)
    .where(eq(evidenceItems.projectId, projectId));

  const sourceNotes = sources
    .map((row) => `${row.type}: ${(row.extractedText ?? "").slice(0, 400)}`)
    .join("\n");

  let questions: string[] = completeness.missing.map(
    (type) => `Can you add a ${type.replace("_", " ")} for this project?`,
  );
  let llmEnabled = false;

  try {
    const drafted = await completeJson({
      system:
        "You help a Kenyan creative see gaps in their proof pack. You may only ask about types listed as missing, and you may only refer to text they already uploaded. Never invent evidence, money, or files.",
      user: `Missing types (from code, authoritative): ${completeness.missing.join(", ") || "none"}\nUploaded notes:\n${sourceNotes || "(none)"}`,
      schema: questionsSchema,
    });
    questions = drafted.questions;
    llmEnabled = true;
  } catch (error) {
    if (!(error instanceof LlmNotConfiguredError)) {
      throw error;
    }
  }

  await logAgentAction({
    userId,
    action: "evidence.auditor",
    input: { projectId, missing: completeness.missing },
    output: { score: completeness.score, questions, llmEnabled },
  });

  return { completeness, questions, llmEnabled };
}
