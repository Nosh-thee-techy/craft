/**
 * Purpose: Pre-invoice flags + seller snapshot immutability (Phase 2 D).
 * Inputs: pure checkInvoice / snapshot helpers.
 * Outputs: each flag code covered; snapshot object is not mutated by helpers.
 */
import { describe, expect, it } from "vitest";
import { checkInvoice } from "@/lib/readiness/invoice-check";
import {
  buildSellerLocationSnapshot,
  snapshotToPayPalAddress,
} from "@/lib/readiness/seller-snapshot";

describe("checkInvoice", () => {
  it("flags a large first invoice and a new client country", () => {
    const flags = checkInvoice({
      amount: 2000,
      clientCountry: "US",
      sellerName: "Amina Otieno",
      profileLegalName: "Amina Otieno",
      profileName: "Amina Otieno",
      recentPaidAmounts: [],
      knownClientCountries: ["KE"],
      projectCompletenessPercent: 80,
      hasContractForClient: true,
    });
    expect(flags.map((f) => f.code)).toEqual(
      expect.arrayContaining(["amount_spike", "new_client_country"]),
    );
  });

  it("flags amount over 3x median of recent paid", () => {
    const flags = checkInvoice({
      amount: 900,
      clientCountry: "US",
      sellerName: "Amina",
      profileLegalName: "Amina",
      profileName: "Amina",
      recentPaidAmounts: [100, 100, 100],
      knownClientCountries: ["US"],
      projectCompletenessPercent: 80,
      hasContractForClient: true,
    });
    expect(flags.some((f) => f.code === "amount_spike")).toBe(true);
  });

  it("flags low completeness", () => {
    const flags = checkInvoice({
      amount: 50,
      clientCountry: "US",
      sellerName: "Amina",
      profileLegalName: "Amina",
      profileName: "Amina",
      recentPaidAmounts: [50],
      knownClientCountries: ["US"],
      projectCompletenessPercent: 20,
      hasContractForClient: true,
    });
    expect(flags.some((f) => f.code === "low_completeness")).toBe(true);
  });

  it("flags seller mismatch", () => {
    const flags = checkInvoice({
      amount: 50,
      clientCountry: "US",
      sellerName: "Other Studio LLC",
      profileLegalName: "Amina Otieno",
      profileName: "Amina",
      recentPaidAmounts: [50],
      knownClientCountries: ["US"],
      projectCompletenessPercent: 80,
      hasContractForClient: true,
    });
    expect(flags.some((f) => f.code === "seller_mismatch")).toBe(true);
  });

  it("flags missing contract", () => {
    const flags = checkInvoice({
      amount: 50,
      clientCountry: "US",
      sellerName: "Amina",
      profileLegalName: "Amina",
      profileName: "Amina",
      recentPaidAmounts: [50],
      knownClientCountries: ["US"],
      projectCompletenessPercent: 80,
      hasContractForClient: false,
    });
    expect(flags.some((f) => f.code === "no_contract")).toBe(true);
  });
});

describe("seller location snapshot", () => {
  it("builds an immutable-shaped snapshot and maps to PayPal address fields", () => {
    const snap = buildSellerLocationSnapshot({
      legalName: "Amina Otieno",
      country: "KE",
      addressEstate: "Kilimani",
      addressRoad: "Ngong Road",
      addressLandmark: "Near Junction",
      addressTown: "Nairobi",
      addressCounty: "Nairobi",
      now: new Date("2026-11-13T10:00:00.000Z"),
    });
    expect(snap.capturedAt).toBe("2026-11-13T10:00:00.000Z");
    const frozen = Object.freeze({ ...snap });
    expect(() => {
      // @ts-expect-error intentional immutability check
      frozen.estate = "Westlands";
    }).toThrow();

    const paypal = snapshotToPayPalAddress(snap);
    expect(paypal?.address_line_1).toContain("Ngong Road");
    expect(paypal?.admin_area_2).toBe("Nairobi");
    expect(paypal?.country_code).toBe("KE");
  });
});
