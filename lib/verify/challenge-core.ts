/**
 * Purpose: Pure ownership-challenge helpers safe for eval scripts (no server-only).
 * Inputs: challenge codes and optional export text.
 * Outputs: generated codes and export pass/fail.
 */

export type CoreCheckResult = {
  passed: boolean;
  reason: string;
  publicData?: Record<string, unknown>;
};

/**
 * Short human-placeable code. Prefixed so bios stay searchable.
 */
export function generateChallengeCode(): string {
  const token = crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
  return `CRAFT-${token}`;
}

/**
 * Export/screenshot fallback: the code must appear in uploaded text.
 */
export function checkExportChallenge(
  challengeCode: string,
  exportText: string | undefined,
): CoreCheckResult {
  const code = challengeCode.trim().toUpperCase();
  const text = exportText ?? "";
  if (!text.trim()) {
    return {
      passed: false,
      reason: "Upload an export or screenshot text that includes the code.",
    };
  }
  if (!text.toUpperCase().includes(code)) {
    return {
      passed: false,
      reason: "The challenge code was not found in the uploaded export.",
    };
  }
  return {
    passed: true,
    reason: "Verified link ownership via uploaded export text.",
    publicData: { source: "export", chars: text.length },
  };
}
