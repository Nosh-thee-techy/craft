/**
 * Purpose: Deterministic pre-invoice flags (Phase 2 D). Advice only — never blocks send.
 * Inputs: proposed invoice, profile, history, project completeness, contract presence.
 * Outputs: {code, severity, reason}[]. LLM may explain later; it cannot add/remove flags.
 */
import { INVOICE_CHECK_CONFIG } from "@/lib/readiness/invoice-check-config";

export type InvoiceFlagSeverity = "info" | "warn";

export type InvoiceFlag = {
  code:
    | "amount_spike"
    | "new_client_country"
    | "low_completeness"
    | "seller_mismatch"
    | "no_contract";
  severity: InvoiceFlagSeverity;
  reason: string;
};

export type InvoiceCheckInput = {
  amount: number;
  clientCountry: string | null | undefined;
  sellerName: string | null | undefined;
  profileLegalName: string | null | undefined;
  profileName: string | null | undefined;
  /** Paid invoice amounts, newest first (same currency assumed for MVP). */
  recentPaidAmounts: number[];
  /** Countries already seen on this account's invoices. */
  knownClientCountries: string[];
  projectCompletenessPercent: number;
  hasContractForClient: boolean;
};

/**
 * Run all pre-invoice rules. Empty array means no flags.
 */
export function checkInvoice(input: InvoiceCheckInput): InvoiceFlag[] {
  const flags: InvoiceFlag[] = [];
  const paid = input.recentPaidAmounts.filter((n) => Number.isFinite(n) && n > 0);

  if (paid.length === 0) {
    if (input.amount > INVOICE_CHECK_CONFIG.firstInvoiceAmount) {
      flags.push({
        code: "amount_spike",
        severity: "warn",
        reason: `First invoice is above ${INVOICE_CHECK_CONFIG.firstInvoiceAmount} (config). Large first bills are a reported trigger — attach a contract if you can.`,
      });
    }
  } else {
    const median = medianOf(paid.slice(0, INVOICE_CHECK_CONFIG.recentPaidLimit));
    if (median > 0 && input.amount > median * INVOICE_CHECK_CONFIG.amountMedianMultiplier) {
      flags.push({
        code: "amount_spike",
        severity: "warn",
        reason: `Amount is more than ${INVOICE_CHECK_CONFIG.amountMedianMultiplier}× your recent paid median (${median.toFixed(2)}).`,
      });
    }
  }

  const country = (input.clientCountry ?? "").trim().toUpperCase();
  if (country) {
    const known = new Set(input.knownClientCountries.map((c) => c.trim().toUpperCase()).filter(Boolean));
    if (!known.has(country)) {
      flags.push({
        code: "new_client_country",
        severity: "info",
        reason: `Client country ${country} has not appeared on this account before.`,
      });
    }
  }

  if (input.projectCompletenessPercent < INVOICE_CHECK_CONFIG.minProjectCompleteness) {
    flags.push({
      code: "low_completeness",
      severity: "warn",
      reason: `Project evidence completeness is ${input.projectCompletenessPercent}% (below ${INVOICE_CHECK_CONFIG.minProjectCompleteness}%).`,
    });
  }

  const profile = (input.profileLegalName || input.profileName || "").trim().toLowerCase();
  const seller = (input.sellerName || "").trim().toLowerCase();
  if (profile && seller && profile !== seller && !seller.includes(profile) && !profile.includes(seller)) {
    flags.push({
      code: "seller_mismatch",
      severity: "warn",
      reason: "Seller details on this invoice differ from your profile legal name.",
    });
  }

  if (!input.hasContractForClient) {
    flags.push({
      code: "no_contract",
      severity: "warn",
      reason: "No contract on file for this client yet.",
    });
  }

  return flags;
}

function medianOf(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length === 0) return 0;
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1]! + sorted[mid]!) / 2;
  }
  return sorted[mid]!;
}
