/**
 * Purpose: Public server action for one-click receipt confirmation.
 * Inputs: confirm token (no login).
 * Outputs: refreshed confirm view flag, or an error.
 */
"use server";

import { revalidatePath } from "next/cache";
import { confirmReceipt } from "@/lib/delivery/confirm";

export type ConfirmActionState = {
  error?: string;
  ok?: boolean;
  confirmedAt?: string;
};

/**
 * Client presses one button. Timestamp is server-side only.
 */
export async function confirmReceiptAction(
  token: string,
  _prev: ConfirmActionState,
  _formData: FormData,
): Promise<ConfirmActionState> {
  void _prev;
  void _formData;
  try {
    const view = await confirmReceipt(token);
    if (!view) {
      return { error: "This confirm link is not valid." };
    }
    revalidatePath(`/c/${token}`);
    return { ok: true, confirmedAt: view.clientConfirmedAt ?? undefined };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Could not confirm receipt.",
    };
  }
}
