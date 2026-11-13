/**
 * Purpose: Confirm or edit AI-read document fields before readiness uses them.
 * Inputs: unconfirmed extraction rows from listUnconfirmedExtractions.
 * Outputs: form posts to confirmExtractionAction. Shows low-confidence hints.
 */
"use client";

import { useActionState } from "react";
import {
  confirmExtractionAction,
  type ConfirmFormState,
} from "@/lib/ai/doc-reader-actions";
import {
  hasLowConfidence,
  LOW_CONFIDENCE,
  type DocExtraction,
} from "@/lib/ai/doc-reader-schemas";
import { EVIDENCE_TYPE_LABELS, type EvidenceType } from "@/lib/evidence/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const initial: ConfirmFormState = {};

export type UnconfirmedRow = {
  id: string;
  type: EvidenceType;
  fileName: string | null;
  extraction: DocExtraction;
};

type ConfirmExtractionPanelProps = {
  rows: UnconfirmedRow[];
};

/**
 * One card per unconfirmed file. Empty when nothing awaits confirmation.
 */
export function ConfirmExtractionPanel({ rows }: ConfirmExtractionPanelProps) {
  if (rows.length === 0) return null;

  return (
    <section className="mb-8 space-y-4" data-testid="confirm-extractions">
      <div>
        <p className="text-xs uppercase tracking-[0.22em] text-primary">AI-read</p>
        <h2 className="font-display text-2xl tracking-tight">Confirm document fields</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Fields stay unused for readiness until you confirm. Low confidence is marked. Edit
          anything the model got wrong.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {rows.map((row) => (
          <ConfirmCard key={row.id} row={row} />
        ))}
      </div>
    </section>
  );
}

function ConfirmCard({ row }: { row: UnconfirmedRow }) {
  const [state, action, pending] = useActionState(confirmExtractionAction, initial);
  const fields = row.extraction.fields;
  const low = hasLowConfidence(fields);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {EVIDENCE_TYPE_LABELS[row.type] ?? row.type}
        </CardTitle>
        <CardDescription>
          {row.fileName ?? row.id.slice(0, 8)} · status {row.extraction.status}
          {low ? ` · some fields below ${LOW_CONFIDENCE} confidence` : ""}
          {row.extraction.error ? ` · ${row.extraction.error}` : ""}
        </CardDescription>
      </CardHeader>
      <form action={action}>
        <CardContent className="space-y-3">
          <input type="hidden" name="evidenceId" value={row.id} />
          <Field
            name="holderName"
            label="Name on document"
            defaultValue={fields.holderName?.value ?? ""}
            confidence={fields.holderName?.confidence}
          />
          <Field
            name="issuer"
            label="Issuer"
            defaultValue={fields.issuer?.value ?? ""}
            confidence={fields.issuer?.confidence}
          />
          <Field
            name="docDate"
            label="Document date (YYYY-MM-DD)"
            defaultValue={fields.docDate?.value ?? ""}
            confidence={fields.docDate?.confidence}
          />
          <Field
            name="addressText"
            label="Address text"
            defaultValue={fields.addressText?.value ?? ""}
            confidence={fields.addressText?.confidence}
          />
          <Field
            name="amount"
            label="Amount (if any)"
            defaultValue={fields.amount?.value ?? ""}
            confidence={fields.amount?.confidence}
          />
          <Field
            name="summary"
            label="Short summary"
            defaultValue={fields.summary?.value ?? ""}
            confidence={fields.summary?.confidence}
          />
          {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
          {state.ok ? <p className="text-sm text-teal">Confirmed. Readiness may use these fields.</p> : null}
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Saving…" : "Confirm fields"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

function Field({
  name,
  label,
  defaultValue,
  confidence,
}: {
  name: string;
  label: string;
  defaultValue: string;
  confidence?: number;
}) {
  const low = confidence != null && confidence < LOW_CONFIDENCE && Boolean(defaultValue);
  return (
    <div className="space-y-1">
      <Label htmlFor={name}>
        {label}
        {confidence != null && defaultValue ? (
          <span className={`ml-2 text-[10px] uppercase tracking-widest ${low ? "text-accent" : "text-muted-foreground"}`}>
            conf {confidence.toFixed(2)}
            {low ? " · low" : ""}
          </span>
        ) : null}
      </Label>
      <Input id={name} name={name} defaultValue={defaultValue} />
    </div>
  );
}
