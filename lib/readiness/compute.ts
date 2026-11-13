/**
 * Purpose: Pure Account Readiness checklist — prepare, not predict.
 * Inputs: profile, evidence rows, invoices (optional completeness map).
 * Outputs: checks with ok/missing/stale/mismatch. Never a single score.
 */
import {
  addressesMatch,
  formatCanonicalAddress,
  isStale,
} from "@/lib/address";
import { completenessFromTypes } from "@/lib/evidence/completeness";
import type {
  ReadinessCheck,
  ReadinessEvidence,
  ReadinessInvoice,
  ReadinessProfile,
  ReadinessResult,
} from "@/lib/readiness/types";

const PROJECT_COMPLETENESS_THRESHOLD = 50;

export type ComputeReadinessInput = {
  profile: ReadinessProfile;
  evidence: ReadinessEvidence[];
  invoices?: ReadinessInvoice[];
  /** Optional precomputed completeness percent per project id. */
  projectCompleteness?: Record<string, number>;
  today?: Date;
};

/**
 * Build the checklist. Facts only — LLM readiness coach (later) may word a plan.
 */
export function computeReadiness(input: ComputeReadinessInput): ReadinessResult {
  const today = input.today ?? new Date();
  const profile = input.profile;
  const evidence = input.evidence;

  const legal =
    (profile.legalName ?? "").trim() || (profile.name ?? "").trim();
  const idOk = evidence.some((row) => row.type === "id_document");

  const addressProofs = evidence.filter((row) => row.type === "address_proof");
  let addressState: ReadinessCheck["state"] = "missing";
  let addressDetail = "No address proof uploaded yet (reported ask).";
  if (addressProofs.length > 0) {
    const fresh = addressProofs.some((row) => {
      const doc = toDate(row.docDate);
      return doc ? !isStale(doc, today, 90) : false;
    });
    if (fresh) {
      addressState = "ok";
      addressDetail = "Address proof on file and within 90 days (reported).";
    } else {
      addressState = "stale";
      addressDetail = "Address proof is older than 90 days (reported) — upload a fresher bill.";
    }
  }

  const canonical = formatCanonicalAddress({
    estate: profile.addressEstate,
    road: profile.addressRoad,
    building: profile.addressBuilding,
    landmark: profile.addressLandmark,
    town: profile.addressTown,
    county: profile.addressCounty,
    plusCode: profile.plusCode,
  });

  let consistentState: ReadinessCheck["state"] = "missing";
  let consistentDetail = "Set a canonical address and upload proof to check consistency.";
  if (!canonical.trim()) {
    consistentState = "missing";
    consistentDetail = "Canonical address not set on your profile yet.";
  } else if (addressProofs.length === 0) {
    consistentState = "missing";
    consistentDetail = "Upload address proof to compare against your profile address.";
  } else {
    const proofText = addressProofs
      .map((row) => row.addressText ?? "")
      .filter(Boolean)
      .join(" ");
    if (!proofText.trim()) {
      consistentState = "missing";
      consistentDetail =
        "Address proof has no confirmed address text yet — confirm extraction or type it on the file.";
    } else if (addressesMatch(canonical, proofText)) {
      consistentState = "ok";
      consistentDetail = "Profile address and proof text match (token overlap).";
    } else {
      consistentState = "mismatch";
      consistentDetail = "Profile address and proof text look different — align estate/landmark wording.";
    }
  }

  const activeProjects = new Set(
    (input.invoices ?? [])
      .filter((inv) => inv.status !== "cancelled")
      .map((inv) => inv.projectId),
  );
  // If no invoices, still look at evidence-bearing projects.
  for (const row of evidence) {
    if (row.projectId) activeProjects.add(row.projectId);
  }

  let projectState: ReadinessCheck["state"] = "missing";
  let projectDetail = "No active projects yet — completeness will appear when you bill.";
  if (activeProjects.size > 0) {
    const scores: number[] = [];
    for (const projectId of activeProjects) {
      if (input.projectCompleteness?.[projectId] != null) {
        scores.push(input.projectCompleteness[projectId]!);
      } else {
        const types = evidence
          .filter((row) => row.projectId === projectId)
          .map((row) => row.type);
        scores.push(completenessFromTypes(types).score);
      }
    }
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    if (avg >= PROJECT_COMPLETENESS_THRESHOLD) {
      projectState = "ok";
      projectDetail = `Active projects average ${Math.round(avg)}% evidence completeness.`;
    } else {
      projectState = "missing";
      projectDetail = `Active projects average ${Math.round(avg)}% completeness — aim for contract + invoice at least.`;
    }
  }

  const checks: ReadinessCheck[] = [
    {
      id: "legal_name",
      label: "Legal name set",
      state: legal ? "ok" : "missing",
      detail: legal ? "Legal name is on your profile." : "Add the name as it appears on your ID.",
    },
    {
      id: "id_document",
      label: "ID uploaded",
      state: idOk ? "ok" : "missing",
      detail: idOk
        ? "ID document is in Identity and funds."
        : "PayPal reportedly asks for ID — upload under Identity and funds (optional).",
    },
    {
      id: "address_proof_fresh",
      label: "Address proof fresh",
      state: addressState,
      detail: addressDetail,
    },
    {
      id: "address_consistent",
      label: "Address consistent",
      state: consistentState,
      detail: consistentDetail,
    },
    {
      id: "bank_linked",
      label: "Local bank or card linked",
      state: profile.bankLinkedAttested ? "ok" : "missing",
      detail: profile.bankLinkedAttested
        ? "You attested a local bank/card is linked in PayPal."
        : "We cannot see PayPal — attest in settings when a local payout method is linked.",
    },
    {
      id: "income_statement",
      label: "Source of income stated",
      state: (profile.incomeStatement ?? "").trim() ? "ok" : "missing",
      detail: (profile.incomeStatement ?? "").trim()
        ? "Short income statement is on file."
        : "Add a short statement of how you earn (not a credit score).",
    },
    {
      id: "portfolio_ownership",
      label: "Portfolio ownership verified",
      state: (profile.verifiedLinkCount ?? 0) > 0 ? "ok" : "missing",
      detail:
        (profile.verifiedLinkCount ?? 0) > 0
          ? "At least one verified link ownership is on file."
          : "Verify a public link in onboarding or settings.",
    },
    {
      id: "project_completeness",
      label: "Active projects have contract and invoice",
      state: projectState,
      detail: projectDetail,
    },
  ];

  const readyCount = checks.filter((check) => check.state === "ok").length;
  return {
    checks,
    readyCount,
    totalCount: checks.length,
    summary: `${readyCount} of ${checks.length} ready`,
  };
}

function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
