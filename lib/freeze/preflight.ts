/**
 * Purpose: Deterministic preflight before Freeze Shield export (Phase 2 E).
 * Inputs: files + profile name + optional address-proof dates.
 * Outputs: pass/fail with plain fix hints. Limits come from preflight-config (reported).
 */
import { createHash } from "node:crypto";
import { isStale } from "@/lib/address";
import { PREFLIGHT_CONFIG } from "@/lib/freeze/preflight-config";

export type PreflightFile = {
  evidenceId: string;
  fileName: string;
  mimeType: string;
  bytes: Buffer;
  /** Evidence type — address_proof gets age check. */
  type: string;
  docDate?: Date | null;
  holderName?: string | null;
};

export type PreflightIssue = {
  code: "size" | "type" | "age" | "name";
  severity: "block";
  evidenceId: string;
  fileName: string;
  reason: string;
  fix: string;
};

export type PreflightResult = {
  ok: boolean;
  issues: PreflightIssue[];
  /** Echo config so the UI can show "reported · 5 MB". */
  limits: {
    maxFileBytes: number;
    allowedExtensions: readonly string[];
    addressProofMaxAgeDays: number;
    sourceLabel: "reported";
  };
};

/**
 * Run size, type, address age, and holder-name consistency checks.
 */
export function runPreflight(
  files: PreflightFile[],
  profileLegalName: string | null | undefined,
  today = new Date(),
): PreflightResult {
  const issues: PreflightIssue[] = [];
  const legal = (profileLegalName ?? "").trim().toLowerCase();

  for (const file of files) {
    if (file.bytes.byteLength > PREFLIGHT_CONFIG.maxFileBytes) {
      issues.push({
        code: "size",
        severity: "block",
        evidenceId: file.evidenceId,
        fileName: file.fileName,
        reason: `File is ${(file.bytes.byteLength / (1024 * 1024)).toFixed(1)} MB (reported max 5 MB).`,
        fix: "Compress or export a smaller PDF/JPG/PNG, then re-upload.",
      });
    }

    const ext = extensionOf(file.fileName);
    const mimeOk = (PREFLIGHT_CONFIG.allowedMime as readonly string[]).includes(file.mimeType);
    const extOk = (PREFLIGHT_CONFIG.allowedExtensions as readonly string[]).includes(ext);
    if (!mimeOk && !extOk) {
      issues.push({
        code: "type",
        severity: "block",
        evidenceId: file.evidenceId,
        fileName: file.fileName,
        reason: `Type ${file.mimeType || ext || "unknown"} is not JPG, PNG, or PDF (reported).`,
        fix: "Export or scan as PDF, JPG, or PNG.",
      });
    }

    if (file.type === "address_proof" && file.docDate) {
      if (isStale(file.docDate, today, PREFLIGHT_CONFIG.addressProofMaxAgeDays)) {
        issues.push({
          code: "age",
          severity: "block",
          evidenceId: file.evidenceId,
          fileName: file.fileName,
          reason: `Address proof is older than ${PREFLIGHT_CONFIG.addressProofMaxAgeDays} days (reported).`,
          fix: "Upload a bill dated within the last 90 days.",
        });
      }
    }

    if (legal && file.holderName) {
      const holder = file.holderName.trim().toLowerCase();
      if (holder && !namesLikelyMatch(legal, holder)) {
        issues.push({
          code: "name",
          severity: "block",
          evidenceId: file.evidenceId,
          fileName: file.fileName,
          reason: `Name on file (“${file.holderName}”) does not match profile legal name (“${profileLegalName}”).`,
          fix: "Upload a document in your legal name, or correct the profile legal name.",
        });
      }
    }
  }

  return {
    ok: issues.length === 0,
    issues,
    limits: {
      maxFileBytes: PREFLIGHT_CONFIG.maxFileBytes,
      allowedExtensions: PREFLIGHT_CONFIG.allowedExtensions,
      addressProofMaxAgeDays: PREFLIGHT_CONFIG.addressProofMaxAgeDays,
      sourceLabel: PREFLIGHT_CONFIG.sourceLabel,
    },
  };
}

/**
 * SHA-256 hex of file bytes (for ZIP manifest checks in tests).
 */
export function sha256Of(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function extensionOf(fileName: string): string {
  const idx = fileName.lastIndexOf(".");
  return idx >= 0 ? fileName.slice(idx).toLowerCase() : "";
}

function namesLikelyMatch(a: string, b: string): boolean {
  const left = new Set(a.split(/\s+/).filter(Boolean));
  const right = new Set(b.split(/\s+/).filter(Boolean));
  let overlap = 0;
  for (const token of left) {
    if (right.has(token)) overlap += 1;
  }
  return overlap >= Math.min(2, left.size, right.size) || a === b;
}
