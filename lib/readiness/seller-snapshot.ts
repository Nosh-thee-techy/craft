/**
 * Purpose: Immutable seller location snapshot at invoice creation.
 * Inputs: user profile address fields.
 * Outputs: JSON blob stored on invoices.seller_location_snapshot (never rewritten).
 */
import type { CanonicalAddress } from "@/lib/address";

export type SellerLocationSnapshot = CanonicalAddress & {
  legalName: string | null;
  country: string | null;
  capturedAt: string;
};

/**
 * Build a snapshot. Callers must persist it once and refuse updates.
 */
export function buildSellerLocationSnapshot(input: {
  legalName?: string | null;
  name?: string | null;
  country?: string | null;
  addressEstate?: string | null;
  addressRoad?: string | null;
  addressBuilding?: string | null;
  addressLandmark?: string | null;
  addressTown?: string | null;
  addressCounty?: string | null;
  plusCode?: string | null;
  now?: Date;
}): SellerLocationSnapshot {
  return {
    legalName: input.legalName ?? input.name ?? null,
    country: input.country ?? null,
    estate: input.addressEstate ?? null,
    road: input.addressRoad ?? null,
    building: input.addressBuilding ?? null,
    landmark: input.addressLandmark ?? null,
    town: input.addressTown ?? null,
    county: input.addressCounty ?? null,
    plusCode: input.plusCode ?? null,
    capturedAt: (input.now ?? new Date()).toISOString(),
  };
}

/**
 * Map CRAFT snapshot → PayPal Invoicing `address` object (see PHASE2_PD_PAYPAL_ADDRESS.md).
 */
export function snapshotToPayPalAddress(snapshot: SellerLocationSnapshot): {
  address_line_1: string;
  address_line_2?: string;
  admin_area_2?: string;
  admin_area_1?: string;
  country_code: string;
} | null {
  const line1 = [snapshot.estate, snapshot.road].filter(Boolean).join(", ").trim();
  const line2 = [snapshot.building, snapshot.landmark].filter(Boolean).join(", ").trim();
  if (!line1 && !line2 && !snapshot.town) return null;
  return {
    address_line_1: line1 || line2 || snapshot.town || "Address on file",
    ...(line2 && line1 ? { address_line_2: line2 } : {}),
    ...(snapshot.town ? { admin_area_2: snapshot.town } : {}),
    ...(snapshot.county ? { admin_area_1: snapshot.county } : {}),
    country_code: (snapshot.country || "KE").slice(0, 2).toUpperCase(),
  };
}
