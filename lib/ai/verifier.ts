/**
 * Purpose: Fail-closed checker for any agent output that leaves the app.
 * Inputs: draft letter/pack text plus uploaded source text only.
 * Outputs: a verifier report. Export stays disabled until every claim passes.
 *
 * The LLM may explain a claim. It cannot override a deterministic fail, and
 * it cannot treat missing source text as supporting evidence.
 */
import "server-only";
import { completeJson } from "@/lib/ai/client";
import {
  checkClaimsAgainstSources,
  mergeVerifierReports,
} from "@/lib/ai/claim-check";
import { logAgentAction } from "@/lib/ai/log";
import {
  verifierReportSchema,
  type SourceText,
  type VerifierReport,
} from "@/lib/freeze/schemas";

type VerifyInput = {
  userId: string;
  outgoing: string;
  sources: SourceText[];
};

/**
 * Run the deterministic checker, then a second LLM pass when a key is set.
 */
export async function verifyClaims(input: VerifyInput): Promise<VerifierReport> {
  const deterministic = checkClaimsAgainstSources(input.outgoing, input.sources);
  let report: VerifierReport = deterministic;

  try {
    const llm = await completeJson({
      system:
        "You are a verifier. Check each sentence of the outgoing letter against SOURCE TEXT from files the user uploaded. A claim passes only if the source text supports it. If a file, hash, date, or event is not in the source, the claim fails. Never invent evidence. Never calculate money.",
      user: `LETTER:\n${input.outgoing.slice(0, 12_000)}\n\nSOURCE TEXT:\n${summariseSources(input.sources)}`,
      schema: verifierReportSchema,
    });
    report = mergeVerifierReports(deterministic, llm.claims);
  } catch {
    report = deterministic;
  }

  await logAgentAction({
    userId: input.userId,
    action: "freeze.verify",
    input: { sentenceCount: deterministic.claims.length, sourceCount: input.sources.length },
    output: {
      passed: report.passed,
      method: report.method,
      failed: report.claims.filter((claim) => !claim.passed).length,
    },
    verifierPassed: report.passed,
  });

  return report;
}

/**
 * Compact source bundle so the verifier prompt stays on uploaded text.
 */
function summariseSources(sources: SourceText[]): string {
  if (sources.length === 0) {
    return "(no uploaded files)";
  }
  return sources
    .map((source) => {
      const name = source.fileName ?? source.type;
      const hash = source.sha256 ?? "no-hash";
      return `- ${name} type=${source.type} sha256=${hash}\n${source.text.slice(0, 600)}`;
    })
    .join("\n\n");
}
