/**
 * Purpose: Server actions for trust-page visibility.
 * Inputs: FormData from settings / project trust toggles.
 * Outputs: TrustFormState and a public slug.
 */
"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth/session";
import {
  DEFAULT_TRUST_VISIBILITY,
  type TrustFormState,
  trustVisibilitySchema,
} from "@/lib/delivery/schemas";
import { saveTrustSettings } from "@/lib/trust/service";

/**
 * Save which stats and projects appear on /t/[slug].
 */
export async function saveTrustSettingsAction(
  _prev: TrustFormState,
  formData: FormData,
): Promise<TrustFormState> {
  const userId = await requireUserId();
  const visibility = trustVisibilitySchema.parse({
    showCounts: formData.get("showCounts") === "on",
    showPortfolio: formData.get("showPortfolio") === "on",
    showCheckout: formData.get("showCheckout") === "on",
  });

  const visibleProjectIds = formData
    .getAll("visibleProjectIds")
    .map(String)
    .filter(Boolean);

  const slugSeed = String(formData.get("slugSeed") ?? "").trim() || undefined;

  try {
    const { publicSlug } = await saveTrustSettings(userId, {
      visibility: visibility ?? DEFAULT_TRUST_VISIBILITY,
      visibleProjectIds,
      slugSeed,
    });
    revalidatePath("/settings");
    revalidatePath(`/t/${publicSlug}`);
    return { ok: true };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Could not save trust settings.",
    };
  }
}
