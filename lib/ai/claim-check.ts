/**
 * Purpose: Deterministic, fail-closed claim checker. No LLM. No database.
 * Inputs: a letter or pack index plus uploaded source text only.
 * Outputs: per-claim pass/fail. A fabricated file, hash, or type always fails.
 *
 * WHY this is separate from verifier.ts: the eval fixture must run without
 * Next.js or an API key. The LLM may only add reasons; it cannot override a fail.
 */
import type { SourceText, VerifierClaim, VerifierReport } from "@/lib/freeze/schemas";

const SHA256 = /\b[a-f0-9]{64}\b/gi;
const FILE_NAME = /\b[\w.-]+\.(?:pdf|png|jpe?g|webp|gif|txt|md|csv|json)\b/gi;
const PRESENCE =
  /\b(attached|enclosed|please find|this proves|we signed|we delivered|i have provided)\b/i;
const HONEST_GAP =
  /\b(missing|do not have|don't have|not in the vault|i have not uploaded|no file)\b/i;

/**
 * Split outgoing text into checkable sentences.
 */
export function splitClaims(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 24);
}

/**
 * Check every sentence against uploaded source text. Unknown citations fail.
 */
export function checkClaimsAgainstSources(
  outgoing: string,
  sources: SourceText[],
): VerifierReport {
  const sentences = splitClaims(outgoing);
  const claims: VerifierClaim[] =
    sentences.length === 0
      ? [
          {
            claim: outgoing.trim() || "(empty letter)",
            passed: false,
            reason: "There is nothing to check against the vault.",
            sourceExcerpt: null,
          },
        ]
      : sentences.map((sentence) => checkOneClaim(sentence, sources));

  return {
    passed: claims.every((claim) => claim.passed),
    claims,
    method: "deterministic",
  };
}

/**
 * One sentence: hashes, file names, and presence claims must match a source.
 */
export function checkOneClaim(sentence: string, sources: SourceText[]): VerifierClaim {
  const hashes = [...sentence.matchAll(SHA256)].map((match) => match[0].toLowerCase());
  const files = [...sentence.matchAll(FILE_NAME)].map((match) => match[0].toLowerCase());

  for (const digest of hashes) {
    const hit = sources.find((source) => source.sha256?.toLowerCase() === digest);
    if (!hit) {
      return {
        claim: sentence,
        passed: false,
        reason: "This SHA-256 is not on any uploaded vault file.",
        sourceExcerpt: null,
      };
    }
  }

  for (const name of files) {
    const hit = sources.find((source) => source.fileName?.toLowerCase() === name);
    if (!hit) {
      return {
        claim: sentence,
        passed: false,
        reason: `No uploaded file is named ${name}. The AI cannot invent evidence.`,
        sourceExcerpt: null,
      };
    }
  }

  if (HONEST_GAP.test(sentence)) {
    return {
      claim: sentence,
      passed: true,
      reason: "This sentence admits a gap. That is allowed.",
      sourceExcerpt: null,
    };
  }

  if (PRESENCE.test(sentence) && hashes.length === 0 && files.length === 0) {
    const typeHit = sources.find((source) =>
      sentence.toLowerCase().includes(source.type.replace("_", " ")),
    );
    if (!typeHit) {
      return {
        claim: sentence,
        passed: false,
        reason: "This claims a document that is not in the uploaded source text.",
        sourceExcerpt: null,
      };
    }
    return {
      claim: sentence,
      passed: true,
      reason: "Matched an uploaded vault type.",
      sourceExcerpt: typeHit.text.slice(0, 180) || typeHit.fileName,
    };
  }

  if (hashes.length > 0 || files.length > 0) {
    const digest = hashes[0];
    const name = files[0];
    const hit = sources.find(
      (source) =>
        (digest && source.sha256?.toLowerCase() === digest) ||
        (name && source.fileName?.toLowerCase() === name),
    );
    return {
      claim: sentence,
      passed: true,
      reason: "Citation matches an uploaded vault item.",
      sourceExcerpt: hit?.text.slice(0, 180) ?? hit?.fileName ?? null,
    };
  }

  return {
    claim: sentence,
    passed: true,
    reason: "No document citation to check.",
    sourceExcerpt: null,
  };
}

/**
 * Merge LLM judgements with the deterministic report. Deterministic fail wins.
 */
export function mergeVerifierReports(
  deterministic: VerifierReport,
  llmClaims: VerifierClaim[],
): VerifierReport {
  const byText = new Map(llmClaims.map((claim) => [claim.claim.trim().toLowerCase(), claim]));
  const claims = deterministic.claims.map((claim) => {
    const extra = byText.get(claim.claim.trim().toLowerCase());
    if (!claim.passed) {
      return claim;
    }
    if (extra && !extra.passed) {
      return extra;
    }
    return extra ?? claim;
  });

  for (const extra of llmClaims) {
    const already = claims.some(
      (claim) => claim.claim.trim().toLowerCase() === extra.claim.trim().toLowerCase(),
    );
    if (!already) {
      claims.push(extra);
    }
  }

  return {
    passed: claims.every((claim) => claim.passed),
    claims,
    method: "llm+deterministic",
  };
}
