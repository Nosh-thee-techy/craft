/**
 * Purpose: Compare a delivered file's extracted text to the project scope / invoice brief.
 * Inputs: project scope, optional invoice notes, deliverable extracted text.
 * Outputs: matches flag + mismatch list. Never invents files or money.
 */
import "server-only";
import { completeJson, LlmNotConfiguredError } from "@/lib/ai/client";
import { logAgentAction } from "@/lib/ai/log";
import { matchCheckSchema, type MatchCheck } from "@/lib/delivery/schemas";

type MatchInput = {
  userId: string;
  projectId: string;
  scope: string;
  deliverableText: string;
  fileName: string | null;
};

/**
 * Heuristic first so delivery works without an LLM key; LLM may refine wording.
 */
export async function checkDeliverableMatch(input: MatchInput): Promise<MatchCheck> {
  const heuristic = heuristicMatch(input.scope, input.deliverableText);
  let report = heuristic;

  try {
    report = await completeJson({
      system:
        "You check whether a delivered file matches the agreed project scope. Use only the scope and the extracted deliverable text. List concrete mismatches. Never invent files, hashes, amounts, or clients. If the text is thin, say so.",
      user: `Scope:\n${input.scope.slice(0, 4000)}\n\nFile: ${input.fileName ?? "unnamed"}\nDeliverable text:\n${input.deliverableText.slice(0, 8000)}`,
      schema: matchCheckSchema,
    });
  } catch (error) {
    if (!(error instanceof LlmNotConfiguredError)) {
      // Keep the heuristic so a flaky LLM does not block delivery.
      await logAgentAction({
        userId: input.userId,
        action: "delivery.match_check",
        input: { projectId: input.projectId },
        output: { error: error instanceof Error ? error.message : "match failed" },
        verifierPassed: false,
      });
    }
    report = heuristic;
  }

  await logAgentAction({
    userId: input.userId,
    action: "delivery.match_check",
    input: { projectId: input.projectId, fileName: input.fileName },
    output: report,
    verifierPassed: report.matches,
  });

  return report;
}

/**
 * Cheap overlap check used when no LLM key is set.
 */
function heuristicMatch(scope: string, deliverableText: string): MatchCheck {
  const scopeWords = significantWords(scope);
  const text = deliverableText.toLowerCase();
  if (!deliverableText.trim()) {
    return {
      matches: false,
      summary: "No text could be read from the deliverable yet.",
      mismatches: ["Upload a text-readable file, or set LLM_API_KEY so vision can organise image text."],
    };
  }
  const missing = scopeWords.filter((word) => !text.includes(word)).slice(0, 6);
  if (missing.length === 0) {
    return {
      matches: true,
      summary: "Key words from the scope appear in the deliverable text.",
      mismatches: [],
    };
  }
  return {
    matches: missing.length < Math.max(2, Math.ceil(scopeWords.length / 2)),
    summary: "Some scope words are missing from the deliverable text.",
    mismatches: missing.map((word) => `Scope mentions “${word}” but it was not found in the file text.`),
  };
}

/**
 * Pull meaningful tokens from the brief for the no-LLM path.
 */
function significantWords(scope: string): string[] {
  return scope
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length >= 5)
    .filter((word, index, all) => all.indexOf(word) === index)
    .slice(0, 12);
}
