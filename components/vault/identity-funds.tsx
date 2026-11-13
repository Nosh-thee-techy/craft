/**
 * Purpose: Account-level Identity and funds uploads (optional, private).
 * Inputs: existing account evidence rows; server action for new files.
 * Outputs: per-type upload cards. Never shown on /t or /c.
 */
"use client";

import { useActionState } from "react";
import { uploadAccountEvidenceAction } from "@/lib/evidence/actions";
import {
  ACCOUNT_EVIDENCE_REASONS,
  ACCOUNT_EVIDENCE_TYPES,
  EVIDENCE_TYPE_LABELS,
  type AccountEvidenceType,
  type EvidenceFormState,
  type EvidenceRow,
} from "@/lib/evidence/schemas";
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

const initial: EvidenceFormState = {};

type IdentityFundsProps = {
  rows: EvidenceRow[];
};

/**
 * Optional private vault for Kenya-reported PayPal asks.
 */
export function IdentityFundsSection({ rows }: IdentityFundsProps) {
  return (
    <section className="mb-8 space-y-4" data-testid="identity-funds">
      <div>
        <p className="text-xs uppercase tracking-[0.22em] text-primary">Private</p>
        <h2 className="font-display text-2xl tracking-tight">Identity and funds</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Optional. Each file stays off your public trust page. Redact card numbers and full
          bank account numbers before you upload — we do not need them and we will not store
          them from the form.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {ACCOUNT_EVIDENCE_TYPES.map((type) => (
          <AccountUploadCard
            key={type}
            type={type}
            existing={rows.filter((row) => row.type === type)}
          />
        ))}
      </div>
    </section>
  );
}

function AccountUploadCard({
  type,
  existing,
}: {
  type: AccountEvidenceType;
  existing: EvidenceRow[];
}) {
  const [state, action, pending] = useActionState(uploadAccountEvidenceAction, initial);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{EVIDENCE_TYPE_LABELS[type]}</CardTitle>
        <CardDescription>{ACCOUNT_EVIDENCE_REASONS[type]}</CardDescription>
      </CardHeader>
      <form action={action}>
        <CardContent className="space-y-3">
          <input type="hidden" name="type" value={type} />
          {existing.length > 0 ? (
            <ul className="space-y-1 text-xs text-muted-foreground">
              {existing.map((row) => (
                <li key={row.id} className="truncate font-mono">
                  {row.fileName ?? row.id.slice(0, 8)} · {row.sha256?.slice(0, 10)}…
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">Not uploaded yet — optional.</p>
          )}
          <div className="space-y-2">
            <Label htmlFor={`${type}-file`}>File</Label>
            <Input
              id={`${type}-file`}
              name="file"
              type="file"
              required
              accept=".pdf,.png,.jpg,.jpeg"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${type}-holder`}>Name on document</Label>
            <Input id={`${type}-holder`} name="holderName" placeholder="As printed" />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${type}-issuer`}>Issuer</Label>
            <Input
              id={`${type}-issuer`}
              name="issuer"
              placeholder={type === "address_proof" ? "e.g. KPLC" : "Optional"}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${type}-date`}>Document date</Label>
            <Input id={`${type}-date`} name="docDate" type="date" />
          </div>
          {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
          {state.ok ? <p className="text-sm text-teal">Stored privately. Hash on record.</p> : null}
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={pending} variant="outline" className="w-full">
            {pending ? "Hashing…" : "Upload (optional)"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
