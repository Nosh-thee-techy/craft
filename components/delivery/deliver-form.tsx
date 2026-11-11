/**
 * Purpose: Upload the final file, optional publish links, mark the project delivered.
 * Inputs: project id; server action hashes and stores.
 * Outputs: confirm URL + match-check feedback.
 */
"use client";

import { useActionState } from "react";
import { deliverProjectAction } from "@/lib/delivery/actions";
import type { DeliverFormState, DeliverableRow } from "@/lib/delivery/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const initial: DeliverFormState = {};

type DeliverFormProps = {
  projectId: string;
  canDeliver: boolean;
  deliverables: DeliverableRow[];
};

/**
 * Delivery door on the project page. Private vault files stay private.
 */
export function DeliverForm({ projectId, canDeliver, deliverables }: DeliverFormProps) {
  const [state, action, pending] = useActionState(deliverProjectAction, initial);

  return (
    <Card>
      <CardHeader>
        <p className="text-xs uppercase tracking-[0.22em] text-teal">Delivery</p>
        <CardTitle>Send the final file</CardTitle>
        <CardDescription>
          Hashed on the server with a timestamp. We check it against the brief, then give you a
          one-click confirm link for the client.
        </CardDescription>
      </CardHeader>
      {canDeliver ? (
        <form action={action}>
          <CardContent className="space-y-4">
            <input type="hidden" name="projectId" value={projectId} />
            <div className="space-y-2">
              <Label htmlFor="file">Final file</Label>
              <Input id="file" name="file" type="file" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="publishLinks">Publish links (optional)</Label>
              <Textarea
                id="publishLinks"
                name="publishLinks"
                placeholder="https://… one per line"
                className="min-h-24"
              />
              <p className="text-xs text-muted-foreground">
                Public links only. Private vault files are never exposed on confirm or trust pages.
              </p>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Hashing and checking…" : "Mark delivered"}
            </Button>
          </CardFooter>
        </form>
      ) : (
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Fund the invoice first, then you can deliver the final file.
          </p>
        </CardContent>
      )}
      {state.error ? <p className="px-6 pb-4 text-sm text-destructive">{state.error}</p> : null}
      {state.ok && state.confirmUrl ? (
        <CardContent className="space-y-2 border-t border-border pt-4">
          <p className="text-sm text-teal">Delivered. Share this confirm link with your client:</p>
          <a className="break-all text-sm text-primary underline" href={state.confirmUrl}>
            {state.confirmUrl}
          </a>
        </CardContent>
      ) : null}
      {deliverables.length > 0 ? (
        <CardContent className="space-y-3 border-t border-border pt-4">
          {deliverables.map((row) => (
            <div key={row.id} className="rounded-2xl border border-border bg-background/40 px-4 py-3 text-sm">
              <p className="font-medium">{row.fileName ?? "Deliverable"}</p>
              <p className="font-mono text-xs text-muted-foreground">
                {row.sha256?.slice(0, 16)}… · {row.deliveredAt}
              </p>
              {row.matchCheck ? (
                <p className={`mt-2 text-xs ${row.matchCheck.matches ? "text-teal" : "text-accent"}`}>
                  {row.matchCheck.matches ? "Matches the brief" : "Mismatch noted"}:{" "}
                  {row.matchCheck.summary}
                </p>
              ) : null}
              {row.matchCheck && row.matchCheck.mismatches.length > 0 ? (
                <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-muted-foreground">
                  {row.matchCheck.mismatches.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
              {row.clientConfirmedAt ? (
                <p className="mt-2 text-xs text-teal">Client confirmed {row.clientConfirmedAt}</p>
              ) : (
                <a
                  className="mt-2 inline-block text-xs text-primary underline"
                  href={`/c/${row.confirmToken}`}
                >
                  Open confirm link
                </a>
              )}
            </div>
          ))}
        </CardContent>
      ) : null}
    </Card>
  );
}
