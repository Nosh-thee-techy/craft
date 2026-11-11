/**
 * Purpose: Prove the verifier blocks a fabricated claim without an LLM key.
 * Inputs: data/eval/freeze-fabricated-claim.json
 * Outputs: process exit 0 on the expected fail, 1 otherwise.
 *
 * Run: npx tsx scripts/eval-freeze.ts
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { checkClaimsAgainstSources } from "../lib/ai/claim-check";

type Fixture = {
  letter: string;
  sources: { fileName: string | null; sha256: string | null; type: string; text: string }[];
  expectPassed: boolean;
  expectFailedSubstring: string;
};

/**
 * Load the fixture and assert the fabricated file is blocked.
 */
function main(): void {
  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  const fixturePath = join(root, "data/eval/freeze-fabricated-claim.json");
  const fixture = JSON.parse(readFileSync(fixturePath, "utf8")) as Fixture;
  const report = checkClaimsAgainstSources(fixture.letter, fixture.sources);
  const failed = report.claims.filter((claim) => !claim.passed);
  const mentionsFabrication = failed.some((claim) =>
    claim.claim.toLowerCase().includes(fixture.expectFailedSubstring.toLowerCase()),
  );

  const ok = report.passed === fixture.expectPassed && mentionsFabrication;

  console.log(
    JSON.stringify(
      {
        passed: report.passed,
        failedClaims: failed.map((claim) => claim.claim),
        blockedFabrication: mentionsFabrication,
        ok,
      },
      null,
      2,
    ),
  );

  if (!ok) {
    process.exit(1);
  }
}

main();
