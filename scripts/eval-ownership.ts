/**
 * Purpose: Prove ownership challenge pass/fail without a live Next.js server.
 * Inputs: synthetic export text with/without the challenge code.
 * Outputs: exit 0 when wrong export fails and correct export passes.
 *
 * Run: npx tsx scripts/eval-ownership.ts
 */
import {
  checkExportChallenge,
  generateChallengeCode,
} from "../lib/verify/challenge-core";

/**
 * Run the fixture and print a JSON summary.
 */
function main(): void {
  const code = generateChallengeCode();

  const wrong = checkExportChallenge(code, "This bio has no craft code at all.");
  const right = checkExportChallenge(
    code,
    `Portfolio notes\nOwnership proof: ${code}\nNairobi studio`,
  );

  const ok = wrong.passed === false && right.passed === true;

  console.log(
    JSON.stringify(
      {
        code,
        wrongPassed: wrong.passed,
        wrongReason: wrong.reason,
        rightPassed: right.passed,
        rightReason: right.reason,
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
