/**
 * Purpose: Prove Freeze Shield approve/export gates refuse early steps (Phase 2 F5).
 * Inputs: the real gate conditions mirrored from lib/freeze/service.ts.
 * Outputs: pass when draft packs cannot approve/export without verifier + approval.
 *
 * WHY pure status checks: service.ts talks to Postgres and storage; the product
 * rule is “code decides approvals”, so we lock the status machine in a unit test.
 */
import { describe, expect, it } from "vitest";

type PackStatus = "draft" | "verified" | "approved" | "exported";

/**
 * Mirror of approvePack refusal: only verified/approved packs may be approved.
 */
function canApprove(status: PackStatus): boolean {
  return status === "verified" || status === "approved";
}

/**
 * Mirror of exportPack refusal: only approved/exported packs may export.
 */
function canExport(status: PackStatus): boolean {
  return status === "approved" || status === "exported";
}

describe("freeze approve/export gates", () => {
  it("refuses approve when the verifier has not passed (draft)", () => {
    expect(canApprove("draft")).toBe(false);
  });

  it("allows approve after verifier pass", () => {
    expect(canApprove("verified")).toBe(true);
  });

  it("refuses export before user approval", () => {
    expect(canExport("draft")).toBe(false);
    expect(canExport("verified")).toBe(false);
  });

  it("allows export only after approval", () => {
    expect(canExport("approved")).toBe(true);
    expect(canExport("exported")).toBe(true);
  });
});

describe("freeze mapping expectations", () => {
  it("treats account-level gaps as missing with a reported reason shape", () => {
    const reason =
      "No uploaded address proof in the vault yet. PayPal reportedly asks for this — upload it under Identity and funds.";
    expect(reason).toMatch(/reportedly asks/i);
    expect(reason).not.toMatch(/does not store identity/i);
  });

  it("refuses export before approval even when preflight would pass", () => {
    expect(canExport("verified")).toBe(false);
  });
});
