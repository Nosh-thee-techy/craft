/**
 * Purpose: Server actions to confirm AI-read document fields (Phase 2 F1).
 * Inputs: FormData from the confirm panel; Auth.js session.
 * Outputs: ok/error; revalidates vault.
 */
"use server";

import { revalidatePath } from "next/cache";
import { confirmDocumentExtraction } from "@/lib/ai/doc-reader";
import { confirmExtractionSchema } from "@/lib/ai/doc-reader-schemas";
import { requireUserId } from "@/lib/auth/session";

export type ConfirmFormState = {
  error?: string;
  ok?: boolean;
};

/**
 * User edits and confirms AI-read fields. Only then may readiness use them.
 */
export async function confirmExtractionAction(
  _prev: ConfirmFormState,
  formData: FormData,
): Promise<ConfirmFormState> {
  const userId = await requireUserId();
  const parsed = confirmExtractionSchema.safeParse({
    evidenceId: formData.get("evidenceId"),
    holderName: formData.get("holderName") || "",
    issuer: formData.get("issuer") || "",
    docDate: formData.get("docDate") || "",
    addressText: formData.get("addressText") || "",
    amount: formData.get("amount") || "",
    summary: formData.get("summary") || "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the fields." };
  }

  try {
    await confirmDocumentExtraction(userId, parsed.data.evidenceId, parsed.data);
    revalidatePath("/vault");
    return { ok: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not confirm." };
  }
}
