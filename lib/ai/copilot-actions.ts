/**
 * Purpose: Server actions for the Copilot room (Phase 2 F6).
 * Inputs: form question from /copilot.
 * Outputs: serializable answer + citations.
 */
"use server";

import { z } from "zod";
import { askCopilot } from "@/lib/ai/copilot";
import { requireUserId } from "@/lib/auth/session";

const askSchema = z.object({
  question: z
    .string()
    .trim()
    .min(3, "Ask a short question.")
    .max(1_000, "Keep the question under 1000 characters."),
});

export type CopilotFormState = {
  error?: string;
  ok?: boolean;
  answer?: string;
  citationIds?: string[];
  source?: "llm" | "deterministic";
  question?: string;
};

/**
 * Answer from retrieved vault/rules only.
 */
export async function askCopilotAction(
  _prev: CopilotFormState,
  formData: FormData,
): Promise<CopilotFormState> {
  const userId = await requireUserId();
  const parsed = askSchema.safeParse({ question: formData.get("question") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ask a question." };
  }

  try {
    const result = await askCopilot(userId, parsed.data.question);
    return {
      ok: true,
      answer: result.answer,
      citationIds: result.citationIds,
      source: result.source,
      question: parsed.data.question,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Could not answer that.",
    };
  }
}
