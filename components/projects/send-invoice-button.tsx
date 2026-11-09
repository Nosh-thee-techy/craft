/**
 * Purpose: Send a PayPal sandbox invoice for a draft/invoiced project.
 * Inputs: project id; server action talks to PayPal.
 * Outputs: success refresh, or the Kenya-account workaround message.
 */
"use client";

import { useActionState } from "react";
import { sendInvoiceAction } from "@/lib/projects/actions";
import type { InvoiceActionState } from "@/lib/projects/schemas";
import { Button } from "@/components/ui/button";

const initialState: InvoiceActionState = {};

type SendInvoiceButtonProps = {
  projectId: string;
  disabled?: boolean;
};

/**
 * Bind the project id into the server action and show PayPal errors inline.
 */
export function SendInvoiceButton({ projectId, disabled }: SendInvoiceButtonProps) {
  const action = sendInvoiceAction.bind(null, projectId);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-3">
      <Button type="submit" disabled={disabled || pending}>
        {pending ? "Sending via PayPal…" : "Send PayPal invoice"}
      </Button>
      {state.ok ? (
        <p className="text-sm text-teal">
          Invoice sent. Pay it as the sandbox buyer and this brief will light up as funded.
        </p>
      ) : null}
      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
    </form>
  );
}
