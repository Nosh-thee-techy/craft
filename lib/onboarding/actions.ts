/**
 * Purpose: Server actions for each onboarding step.
 * Inputs: FormData from the onboarding wizard; Auth.js session.
 * Outputs: OnboardingFormState for the client.
 */
"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth/session";
import {
  linkedAccountInputSchema,
  onboardingPlatformSchema,
  profileDraftSchema,
  profileStepSchema,
  splitRulesSchema,
  trustVisibilitySchema,
  type OnboardingFormState,
} from "@/lib/onboarding/schemas";
import {
  addLinkedAccount,
  approveProfileDraft,
  completeOnboarding,
  connectPayPalSandbox,
  createProfileDraft,
  saveOnboardingVisibility,
  saveProfileStep,
  saveSplitRules,
  verifyLinkedAccount,
} from "@/lib/onboarding/service";

/**
 * Save name / craft / country.
 */
export async function saveProfileAction(
  _prev: OnboardingFormState,
  formData: FormData,
): Promise<OnboardingFormState> {
  const userId = await requireUserId();
  const parsed = profileStepSchema.safeParse({
    name: formData.get("name"),
    craft: formData.get("craft"),
    country: formData.get("country") || "KE",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check your profile." };
  }
  try {
    await saveProfileStep(userId, parsed.data);
    revalidatePath("/onboarding");
    return { ok: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not save profile." };
  }
}

/**
 * Mark PayPal sandbox connected when keys exist.
 */
export async function connectPayPalAction(
  _prev: OnboardingFormState,
  _formData: FormData,
): Promise<OnboardingFormState> {
  void _formData;
  const userId = await requireUserId();
  try {
    const result = await connectPayPalSandbox(userId);
    revalidatePath("/onboarding");
    return result.connected
      ? { ok: true }
      : { error: result.detail, ok: false };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "PayPal connect failed." };
  }
}

/**
 * Add a public link and issue a challenge code.
 */
export async function addLinkAction(
  _prev: OnboardingFormState,
  formData: FormData,
): Promise<OnboardingFormState> {
  const userId = await requireUserId();
  const platform = onboardingPlatformSchema.safeParse(formData.get("platform"));
  if (!platform.success) {
    return { error: "Choose GitHub, YouTube, RSS, or export." };
  }
  const parsed = linkedAccountInputSchema.safeParse({
    platform: platform.data,
    handle: formData.get("handle"),
    url: String(formData.get("url") ?? "").trim() || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the link." };
  }
  try {
    const row = await addLinkedAccount(userId, parsed.data);
    revalidatePath("/onboarding");
    return { ok: true, linkedAccountId: row.id, challengeCode: row.challengeCode ?? undefined };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not add that link." };
  }
}

/**
 * Verify link ownership against official sources.
 */
export async function verifyLinkAction(
  _prev: OnboardingFormState,
  formData: FormData,
): Promise<OnboardingFormState> {
  const userId = await requireUserId();
  const linkedAccountId = String(formData.get("linkedAccountId") ?? "");
  const exportText = String(formData.get("exportText") ?? "");
  if (!linkedAccountId) {
    return { error: "Pick a link to verify." };
  }
  try {
    await verifyLinkedAccount(userId, linkedAccountId, exportText || undefined);
    revalidatePath("/onboarding");
    return { ok: true, verified: true, linkedAccountId };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Verification failed." };
  }
}

/**
 * Draft a profile from verified link ownership.
 */
export async function draftProfileAction(
  _prev: OnboardingFormState,
  _formData: FormData,
): Promise<OnboardingFormState> {
  void _formData;
  const userId = await requireUserId();
  try {
    const draft = await createProfileDraft(userId);
    revalidatePath("/onboarding");
    return { ok: true, draft };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not draft a profile." };
  }
}

/**
 * Approve an edited profile draft.
 */
export async function approveDraftAction(
  _prev: OnboardingFormState,
  formData: FormData,
): Promise<OnboardingFormState> {
  const userId = await requireUserId();
  const services = String(formData.get("services") ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const timeline = String(formData.get("timeline") ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const parsed = profileDraftSchema.safeParse({
    summary: formData.get("summary"),
    services,
    timeline,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Fix the draft before approving." };
  }
  try {
    await approveProfileDraft(userId, parsed.data);
    revalidatePath("/onboarding");
    return { ok: true, draft: parsed.data };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not approve the draft." };
  }
}

/**
 * Save split percentages (code only — LLM never calculates these).
 */
export async function saveSplitsAction(
  _prev: OnboardingFormState,
  formData: FormData,
): Promise<OnboardingFormState> {
  const userId = await requireUserId();
  const parsed = splitRulesSchema.safeParse({
    taxPct: formData.get("taxPct"),
    savingsPct: formData.get("savingsPct"),
    expensesPct: formData.get("expensesPct"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Splits must add to 100%." };
  }
  try {
    await saveSplitRules(userId, parsed.data);
    revalidatePath("/onboarding");
    return { ok: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not save splits." };
  }
}

/**
 * Visibility choices for the public trust page.
 */
export async function saveVisibilityAction(
  _prev: OnboardingFormState,
  formData: FormData,
): Promise<OnboardingFormState> {
  const userId = await requireUserId();
  const visibility = trustVisibilitySchema.parse({
    showCounts: formData.get("showCounts") === "on",
    showPortfolio: formData.get("showPortfolio") === "on",
    showCheckout: formData.get("showCheckout") === "on",
  });
  try {
    const { publicSlug } = await saveOnboardingVisibility(userId, {
      visibility,
      slugSeed: String(formData.get("slugSeed") ?? "").trim() || undefined,
    });
    revalidatePath("/onboarding");
    revalidatePath("/settings");
    return { ok: true, publicSlug };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not save visibility." };
  }
}

/**
 * Mark onboarding complete and send the creative into the studio.
 */
export async function completeOnboardingAction(
  _prev: OnboardingFormState,
  _formData: FormData,
): Promise<OnboardingFormState> {
  void _formData;
  const userId = await requireUserId();
  try {
    await completeOnboarding(userId);
    revalidatePath("/onboarding");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not finish onboarding." };
  }
}
