/**
 * Purpose: Send a PayPal sandbox invoice for a draft/invoiced project.
 * Inputs: project id; optional precomputed flags; server action talks to PayPal.
 * Outputs: success refresh, flags (advice only), or the Kenya-account workaround message.
 */
"use client";

import { useActionState } from "react";
import { sendInvoiceAction } from "@/lib/projects/actions";
import type { InvoiceActionState, InvoiceFlagView } from "@/lib/projects/schemas";
import { Button } from "@/components/ui/button";

const initialState: InvoiceActionState = {};

type SendInvoiceButtonProps = {
  projectId: string;
  disabled?: boolean;
  /** Shown before send — flags are advice, never a block. */
  initialFlags?: InvoiceFlagView[];
};

/**
 * Bind the project id into the server action and show PayPal errors inline.
 */
export function SendInvoiceButton({
  projectId,
  disabled,
  initialFlags = [],
}: SendInvoiceButtonProps) {
  const action = sendInvoiceAction.bind(null, projectId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const flags = state.flags ?? initialFlags;

  return (
    <form action={formAction} className="space-y-3">
      {flags.length > 0 ? (
        <div
          className="rounded-2xl border border-border/70 bg-background/40 p-3 space-y-2"
          data-testid="invoice-flags"
        >
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
            Pre-invoice check · advice only
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {flags.map((flag) => (
              <li key={flag.code}>
                <span className="font-mono text-xs uppercase text-accent">{flag.severity}</span>{" "}
                {flag.sentence ?? flag.reason}
                {flag.attachFirst ? (
                  <span className="mt-0.5 block text-xs">
                    Attach first: {flag.attachFirst}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">
            Thresholds are config values. You can still send after reading these.
          </p>
        </div>
      ) : null}
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
