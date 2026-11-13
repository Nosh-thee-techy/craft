/**
 * Purpose: Show mapping, letter, verifier, and approve/export gates.
 * Inputs: FreezeFormState from paste/approve/export actions.
 * Outputs: human-readable pack UI. Export button stays off until approved.
 */
"use client";

import { useActionState } from "react";
import {
  approvePackAction,
  exportPackAction,
  followUpReplyAction,
} from "@/lib/freeze/actions";
import type { FreezeFormState } from "@/lib/freeze/schemas";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type FreezeResultProps = {
  state: FreezeFormState;
};

/**
 * Result room after a notice is parsed. Approve then export — never the reverse.
 */
export function FreezeResult({ state }: FreezeResultProps) {
  const [approveState, approveAction, approvePending] = useActionState(
    approvePackAction,
    state,
  );
  const [exportState, exportAction, exportPending] = useActionState(exportPackAction, state);
  const [followState, followAction, followPending] = useActionState(
    followUpReplyAction,
    state,
  );

  const view =
    (followState.ok && followState.packId ? followState : null) ??
    (exportState.ok && exportState.packId === state.packId ? exportState : null) ??
    (approveState.ok && approveState.packId === state.packId ? approveState : null) ??
    state;

  const canApprove = view.status === "verified";
  const canExport = view.status === "approved" || view.status === "exported";
  const error = approveState.error ?? exportState.error ?? followState.error;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <p className="text-xs uppercase tracking-[0.22em] text-primary">Parsed</p>
          <CardTitle>What PayPal asked for</CardTitle>
          <CardDescription>
            Tone: {view.parsed?.tone}
            {view.parsed?.deadline ? ` · deadline ${view.parsed.deadline}` : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="text-muted-foreground">{view.parsed?.summary}</p>
          <ul className="list-inside list-disc space-y-1">
            {view.parsed?.requests.map((request) => (
              <li key={request.id}>
                {request.label}{" "}
                <span className="text-muted-foreground">({request.documentType})</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <p className="text-xs uppercase tracking-[0.22em] text-primary">Vault map</p>
          <CardTitle>Covered and missing</CardTitle>
          <CardDescription>
            Only uploaded files can cover a request. Identity documents stay missing on purpose.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="mb-2 text-xs uppercase tracking-[0.18em] text-teal">Covered</p>
            {view.mapping?.covered.length ? (
              <ul className="space-y-2 text-sm">
                {view.mapping.covered.map((item) => (
                  <li key={item.request.id} className="rounded-2xl border border-border/70 p-3">
                    <p className="font-medium">{item.request.label}</p>
                    <p className="mt-1 text-muted-foreground">
                      {item.matches[0]?.fileName ?? item.matches[0]?.type} · SHA-256{" "}
                      {item.matches[0]?.sha256?.slice(0, 12) ?? "—"}…
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Nothing covered yet.</p>
            )}
          </div>
          <div>
            <p className="mb-2 text-xs uppercase tracking-[0.18em] text-accent">Missing</p>
            {view.mapping?.missing.length ? (
              <ul className="space-y-2 text-sm">
                {view.mapping.missing.map((item) => (
                  <li key={item.request.id} className="rounded-2xl border border-border/70 p-3">
                    <p className="font-medium">{item.request.label}</p>
                    <p className="mt-1 text-muted-foreground">{item.reason}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Every request has a vault match.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {view.reviewGaps && view.reviewGaps.length > 0 ? (
        <Card data-testid="pack-review-gaps">
          <CardHeader>
            <p className="text-xs uppercase tracking-[0.22em] text-primary">Pack review</p>
            <CardTitle>What a reviewer may still ask for</CardTitle>
            <CardDescription>
              Second pass over the mapped pack
              {view.reviewSource ? ` · ${view.reviewSource}` : ""}. Every gap cites a
              missing request — nothing invented.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {view.reviewGaps.map((gap) => (
                <li
                  key={`${gap.citesRequestLabel}-${gap.label}`}
                  className="rounded-2xl border border-border/70 p-3"
                >
                  <p className="font-medium">{gap.label}</p>
                  <p className="mt-1 text-muted-foreground">{gap.reason}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Cites: {gap.citesRequestLabel}
                  </p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <p className="text-xs uppercase tracking-[0.22em] text-primary">Letter</p>
          <CardTitle>Draft reply</CardTitle>
          <CardDescription>
            Status: {view.status}
            {view.report?.passed
              ? " · verifier passed"
              : " · verifier blocked — export stays closed"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="whitespace-pre-wrap rounded-2xl border border-border/70 bg-[var(--field)] p-4 text-xs leading-relaxed">
            {view.draft?.letter}
          </pre>
          <ul className="mt-4 space-y-1 text-xs text-muted-foreground">
            {view.report?.claims.map((claim, index) => (
              <li key={`${index}-${claim.claim.slice(0, 24)}`}>
                {claim.passed ? "PASS" : "FAIL"} · {claim.reason}
              </li>
            ))}
          </ul>
        </CardContent>
        <CardFooter className="flex flex-wrap gap-3">
          <form action={approveAction}>
            <input type="hidden" name="packId" value={view.packId ?? ""} />
            <Button type="submit" disabled={!canApprove || approvePending}>
              {approvePending ? "Approving…" : "I approve this pack"}
            </Button>
          </form>
          <form action={exportAction}>
            <input type="hidden" name="packId" value={view.packId ?? ""} />
            <Button type="submit" variant="outline" disabled={!canExport || exportPending}>
              {exportPending ? "Exporting…" : "Export PDF"}
            </Button>
          </form>
          {view.downloadUrl ? (
            <Button asChild variant="secondary">
              <a href={view.downloadUrl}>Download pack</a>
            </Button>
          ) : null}
          {error ? <p className="w-full text-sm text-destructive">{error}</p> : null}
        </CardFooter>
      </Card>

      <Card data-testid="follow-up-reply">
        <CardHeader>
          <p className="text-xs uppercase tracking-[0.22em] text-primary">Follow-up</p>
          <CardTitle>Reply assistant</CardTitle>
          <CardDescription>
            Paste a PayPal follow-up. CRAFT drafts from vault cites only, then runs the
            same verifier and approve gate.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={followAction} className="space-y-3">
            <input type="hidden" name="packId" value={view.packId ?? ""} />
            <textarea
              name="followUp"
              rows={4}
              placeholder="Paste the follow-up from PayPal…"
              className="w-full rounded-2xl border border-border/70 bg-[var(--field)] p-3 text-sm"
              required
            />
            <Button type="submit" variant="outline" disabled={!view.packId || followPending}>
              {followPending ? "Drafting…" : "Draft follow-up reply"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
