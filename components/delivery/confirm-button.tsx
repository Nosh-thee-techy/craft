/**
 * Purpose: One-click public confirm control for /c/[token].
 * Inputs: confirm token; optional already-confirmed timestamp.
 * Outputs: stamps client_confirmed_at via server action.
 */
"use client";

import { useActionState } from "react";
import {
  confirmReceiptAction,
  type ConfirmActionState,
} from "@/lib/delivery/confirm-action";
import { Button } from "@/components/ui/button";

const initial: ConfirmActionState = {};

type ConfirmButtonProps = {
  token: string;
  alreadyConfirmedAt: string | null;
};

/**
 * No login. Repeat clicks stay idempotent.
 */
export function ConfirmButton({ token, alreadyConfirmedAt }: ConfirmButtonProps) {
  const action = confirmReceiptAction.bind(null, token);
  const [state, formAction, pending] = useActionState(action, initial);
  const confirmedAt = state.confirmedAt ?? alreadyConfirmedAt;

  if (confirmedAt) {
    return (
      <p className="rounded-2xl border border-teal/35 bg-teal/10 px-4 py-3 text-sm text-teal">
        Receipt confirmed at {confirmedAt}
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-3">
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Saving…" : "Confirm I received the work"}
      </Button>
      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
    </form>
  );
}
