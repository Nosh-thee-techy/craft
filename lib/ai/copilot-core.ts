/**
 * Purpose: Phase 2 F6 — Copilot answers grounded only in retrieved vault/rules text.
 * Inputs: question + retrieved snippets; optional LLM.
 * Outputs: answer with citations, or “I don't know” when nothing was retrieved.
 */
import { z } from "zod";

export const COPILOT_TIMEOUT_MS = 20_000;

const answerSchema = z.object({
  answer: z.string().min(1),
  citationIds: z.array(z.string()),
});

export type CopilotSnippet = {
  id: string;
  title: string;
  text: string;
};

export type CopilotResult = {
  answer: string;
  citationIds: string[];
  source: "llm" | "deterministic";
};

export type CopilotLlm = <T>(input: {
  system: string;
  user: string;
  schema: z.ZodType<T>;
  timeoutMs?: number;
}) => Promise<T>;

/**
 * Answer only from snippets. No retrieved source → honest “I don't know”.
 */
export async function answerFromVault(
  question: string,
  snippets: CopilotSnippet[],
  llm?: CopilotLlm,
): Promise<CopilotResult> {
  if (snippets.length === 0) {
    return {
      answer: "I don't know — nothing in your vault or readiness rules matched that question.",
      citationIds: [],
      source: "deterministic",
    };
  }

  const deterministic: CopilotResult = {
    answer: [
      `Based on your vault:`,
      ...snippets.slice(0, 3).map((snip) => `- ${snip.title}: ${snip.text.slice(0, 180)}`),
    ].join("\n"),
    citationIds: snippets.slice(0, 3).map((snip) => snip.id),
    source: "deterministic",
  };

  if (!llm) return deterministic;

  try {
    const drafted = await llm({
      system:
        "Answer using only the retrieved snippets. Cite snippet ids you used. If the snippets do not support an answer, say you don't know. Never invent files, hashes, or money. Never calculate amounts.",
      user: JSON.stringify({ question, snippets }),
      schema: answerSchema,
      timeoutMs: COPILOT_TIMEOUT_MS,
    });
    const allowed = new Set(snippets.map((snip) => snip.id));
    const citationIds = drafted.citationIds.filter((id) => allowed.has(id));
    return {
      answer: drafted.answer,
      citationIds: citationIds.length > 0 ? citationIds : deterministic.citationIds,
      source: "llm",
    };
  } catch {
    return deterministic;
  }
}
