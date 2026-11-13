/**
 * Purpose: Server actions for Freeze Shield — paste, approve, export.
 * Inputs: form fields from the freeze page; Auth.js session.
 * Outputs: a serializable FreezeFormState. Export stays off until verify + approve.
 */
"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth/session";
import { z } from "zod";
import { pasteNoticeSchema, type FreezeFormState } from "@/lib/freeze/schemas";
import { draftFollowUpPack } from "@/lib/freeze/reply-service";
import {
  approvePack,
  exportPack,
  runFreezeShield,
  toFormState,
} from "@/lib/freeze/service";

const followUpSchema = z.object({
  packId: z.string().uuid(),
  followUp: z
    .string()
    .trim()
    .min(20, "Paste the follow-up — a sentence or two at least.")
    .max(8_000, "That follow-up is too long."),
});

const initialError = (message: string): FreezeFormState => ({ error: message });

/**
 * Paste a PayPal limitation notice and run parse → map → letter → verifier.
 */
export async function pasteNoticeAction(
  _prev: FreezeFormState,
  formData: FormData,
): Promise<FreezeFormState> {
  const userId = await requireUserId();
  const parsed = pasteNoticeSchema.safeParse({ rawText: formData.get("rawText") });
  if (!parsed.success) {
    return initialError(parsed.error.issues[0]?.message ?? "Paste the notice first.");
  }

  try {
    const pack = await runFreezeShield(userId, parsed.data.rawText);
    revalidatePath("/freeze-shield");
    return toFormState(pack);
  } catch (error) {
    return initialError(error instanceof Error ? error.message : "Could not read that notice.");
  }
}

/**
 * Human approval after every claim has passed.
 */
export async function approvePackAction(
  _prev: FreezeFormState,
  formData: FormData,
): Promise<FreezeFormState> {
  const userId = await requireUserId();
  const packId = String(formData.get("packId") ?? "");
  if (!packId) {
    return initialError("No pack to approve.");
  }
  try {
    const pack = await approvePack(userId, packId);
    revalidatePath("/freeze-shield");
    return toFormState(pack);
  } catch (error) {
    return initialError(error instanceof Error ? error.message : "Could not approve this pack.");
  }
}

/**
 * F4: draft a reply to a PayPal follow-up from vault cites only.
 */
export async function followUpReplyAction(
  _prev: FreezeFormState,
  formData: FormData,
): Promise<FreezeFormState> {
  const userId = await requireUserId();
  const parsed = followUpSchema.safeParse({
    packId: formData.get("packId"),
    followUp: formData.get("followUp"),
  });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Paste the follow-up first.",
    };
  }

  try {
    const pack = await draftFollowUpPack(
      userId,
      parsed.data.packId,
      parsed.data.followUp,
    );
    revalidatePath("/freeze-shield");
    return toFormState(pack);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Could not draft that reply.",
    };
  }
}

/**
 * Build the PDF. Disabled in the UI unless status is approved.
 */
export async function exportPackAction(
  _prev: FreezeFormState,
  formData: FormData,
): Promise<FreezeFormState> {
  const userId = await requireUserId();
  const packId = String(formData.get("packId") ?? "");
  if (!packId) {
    return initialError("No pack to export.");
  }
  try {
    const pack = await exportPack(userId, packId);
    revalidatePath("/freeze-shield");
    return toFormState(pack);
  } catch (error) {
    return initialError(error instanceof Error ? error.message : "Could not export this pack.");
  }
}
