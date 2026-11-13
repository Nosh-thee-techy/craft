/**
 * Purpose: Phase 7 evaluation suite — notice parse, completeness, verifier, ownership.
 * Inputs: data/eval/suite.json (and legacy freeze-fabricated-claim.json as a cross-check).
 * Outputs: per-case pass/fail plus accuracy %. Exit 1 if any case fails.
 *
 * Runs without Next.js, Postgres, or an LLM key.
 * Run: npm run eval:suite
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { checkClaimsAgainstSources } from "../lib/ai/claim-check";
import { completenessFromTypes } from "../lib/evidence/completeness";
import { heuristicParse } from "../lib/freeze/parse-heuristic";
import {
  checkExportChallenge,
  generateChallengeCode,
} from "../lib/verify/challenge-core";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

type Source = {
  fileName: string | null;
  sha256: string | null;
  type: string;
  text: string;
};

type CaseBase = { id: string; kind: string; description: string };

type NoticeCase = CaseBase & {
  kind: "notice_parse";
  notice: string;
  expectTone: string;
  expectTypes: string[];
};

type CompletenessCase = CaseBase & {
  kind: "completeness";
  types: string[];
  expectScore: number;
  expectMissing: string[];
};

type VerifierCase = CaseBase & {
  kind: "verifier";
  letter: string;
  sources: Source[];
  expectPassed: boolean;
  expectFailedSubstring?: string;
};

type OwnershipCase = CaseBase & {
  kind: "ownership";
  mode: "pass" | "fail";
};

type EvalCase = NoticeCase | CompletenessCase | VerifierCase | OwnershipCase;

type CaseResult = { id: string; kind: string; ok: boolean; detail: string };

/**
 * Run one labelled case.
 */
function runCase(item: EvalCase): CaseResult {
  switch (item.kind) {
    case "notice_parse": {
      const parsed = heuristicParse(item.notice);
      const types = parsed.requests.map((request) => request.documentType);
      const missing = item.expectTypes.filter((type) => !types.includes(type as never));
      const extraOk = types.every((type) => item.expectTypes.includes(type as never));
      const ok = parsed.tone === item.expectTone && missing.length === 0 && extraOk;
      return {
        id: item.id,
        kind: item.kind,
        ok,
        detail: `tone=${parsed.tone} types=${types.join(",")}`,
      };
    }
    case "completeness": {
      const result = completenessFromTypes(item.types);
      const missingOk =
        result.missing.length === item.expectMissing.length &&
        item.expectMissing.every((type) => result.missing.includes(type as never));
      const ok = result.score === item.expectScore && missingOk;
      return {
        id: item.id,
        kind: item.kind,
        ok,
        detail: `score=${result.score} missing=${result.missing.join(",")}`,
      };
    }
    case "verifier": {
      const report = checkClaimsAgainstSources(item.letter, item.sources);
      const failed = report.claims.filter((claim) => !claim.passed);
      const mentions =
        !item.expectFailedSubstring ||
        failed.some((claim) =>
          claim.claim.toLowerCase().includes(item.expectFailedSubstring!.toLowerCase()),
        );
      const ok = report.passed === item.expectPassed && mentions;
      return {
        id: item.id,
        kind: item.kind,
        ok,
        detail: `passed=${report.passed} failed=${failed.length}`,
      };
    }
    case "ownership": {
      const code = generateChallengeCode();
      if (item.mode === "pass") {
        const result = checkExportChallenge(code, `Bio\nProof: ${code}\nNairobi`);
        return {
          id: item.id,
          kind: item.kind,
          ok: result.passed === true,
          detail: result.reason,
        };
      }
      const result = checkExportChallenge(code, "Bio with no craft code.");
      return {
        id: item.id,
        kind: item.kind,
        ok: result.passed === false,
        detail: result.reason,
      };
    }
    default: {
      const unknown = item as CaseBase;
      return {
        id: unknown.id,
        kind: unknown.kind,
        ok: false,
        detail: "Unknown case kind",
      };
    }
  }
}

/**
 * Print accuracy and exit non-zero on any failure.
 */
function main(): void {
  const suite = JSON.parse(
    readFileSync(join(root, "data/eval/suite.json"), "utf8"),
  ) as EvalCase[];

  const results = suite.map(runCase);
  const passed = results.filter((result) => result.ok).length;
  const accuracy = suite.length === 0 ? 0 : Math.round((passed / suite.length) * 1000) / 10;

  const fabricated = results.find((result) => result.id === "verifier-fabricated-file");

  console.log(
    JSON.stringify(
      {
        total: suite.length,
        passed,
        failed: suite.length - passed,
        accuracyPct: accuracy,
        fabricatedClaimBlocked: fabricated?.ok === true,
        results,
      },
      null,
      2,
    ),
  );

  if (passed !== suite.length || fabricated?.ok !== true) {
    process.exit(1);
  }
}

main();
