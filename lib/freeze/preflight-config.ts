/**
 * Purpose: Reported PayPal upload limits (one recovery guide — not official).
 * Inputs: none (static config).
 * Outputs: size/type/age limits labelled "reported" in the UI.
 */

export const PREFLIGHT_CONFIG = {
  /** Label every UI string that cites these numbers. */
  sourceLabel: "reported" as const,
  maxFileBytes: 5 * 1024 * 1024,
  allowedMime: ["image/jpeg", "image/png", "application/pdf"] as const,
  allowedExtensions: [".jpg", ".jpeg", ".png", ".pdf"] as const,
  addressProofMaxAgeDays: 90,
} as const;

export type PreflightConfig = typeof PREFLIGHT_CONFIG;
