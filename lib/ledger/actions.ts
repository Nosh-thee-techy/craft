/**
 * Purpose: Server actions for approving or rejecting split proposals on /money.
 * Inputs: form fields (entryId or paymentId); Auth.js session.
 * Outputs: a serializable LedgerFormState for the Money UI.
 */
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUserId } from "@/lib/auth/session";
import {
  approveAllProposedForPayment,
  approveLedgerEntry,
  rejectLedgerEntry,
} from "@/lib/ledger/service";

export type LedgerFormState = {
  ok: boolean;
  message: string;
};

const idSchema = z.string().uuid("Pick a valid ledger entry.");

/**
 * Approve one proposed bucket row.
 */
export async function approveLedgerEntryAction(
  _prev: LedgerFormState,
  formData: FormData,
): Promise<LedgerFormState> {
  const userId = await requireUserId();
  const parsed = idSchema.safeParse(String(formData.get("entryId") ?? ""));
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid entry." };
  }
  try {
    const result = await approveLedgerEntry(userId, parsed.data);
    revalidatePath("/money");
    return { ok: true, message: `Approved ${result.bucket}.` };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Could not approve that split.",
    };
  }
}

/**
 * Reject one proposed bucket row.
 */
export async function rejectLedgerEntryAction(
  _prev: LedgerFormState,
  formData: FormData,
): Promise<LedgerFormState> {
  const userId = await requireUserId();
  const parsed = idSchema.safeParse(String(formData.get("entryId") ?? ""));
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid entry." };
  }
  try {
    const result = await rejectLedgerEntry(userId, parsed.data);
    revalidatePath("/money");
    return { ok: true, message: `Rejected ${result.bucket}.` };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Could not reject that split.",
    };
  }
}

/**
 * Approve every proposed bucket for one payment.
 */
export async function approvePaymentSplitsAction(
  _prev: LedgerFormState,
  formData: FormData,
): Promise<LedgerFormState> {
  const userId = await requireUserId();
  const parsed = idSchema.safeParse(String(formData.get("paymentId") ?? ""));
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid payment." };
  }
  try {
    const result = await approveAllProposedForPayment(userId, parsed.data);
    revalidatePath("/money");
    return {
      ok: true,
      message:
        result.approved === 0
          ? "No proposed splits left on this payment."
          : `Approved ${result.approved} bucket${result.approved === 1 ? "" : "s"}.`,
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Could not approve those splits.",
    };
  }
}
