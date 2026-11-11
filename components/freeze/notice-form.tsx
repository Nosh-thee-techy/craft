/**
 * Purpose: Paste a PayPal limitation notice and run Freeze Shield.
 * Inputs: optional sample notice text; server action pasteNoticeAction.
 * Outputs: form state handed to FreezeResult for mapping/letter/approve/export.
 */
"use client";

import { useActionState } from "react";
import { pasteNoticeAction } from "@/lib/freeze/actions";
import type { FreezeFormState } from "@/lib/freeze/schemas";
import { FreezeResult } from "@/components/freeze/result";
import { Button } from "@/components/ui/button";
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

const initial: FreezeFormState = {};

type NoticeFormProps = {
  sampleNotice?: string;
  initialPack?: FreezeFormState | null;
};

/**
 * Client form: paste → parse/map/verify. Result panel handles approve/export.
 */
export function FreezeNoticeForm({ sampleNotice, initialPack }: NoticeFormProps) {
  const [state, action, pending] = useActionState(pasteNoticeAction, initialPack ?? initial);
  const active = state.ok ? state : initialPack?.ok ? initialPack : state;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <p className="text-xs uppercase tracking-[0.22em] text-primary">Notice</p>
          <CardTitle>Paste what PayPal sent</CardTitle>
          <CardDescription>
            CRAFT maps the ask onto vault files you already uploaded. It never invents a file,
            hash, or deadline.
          </CardDescription>
        </CardHeader>
        <form action={action}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rawText">Limitation notice</Label>
              <Textarea
                id="rawText"
                name="rawText"
                required
                rows={12}
                defaultValue={sampleNotice ?? ""}
                placeholder="Paste the PayPal limitation or restriction email here…"
                className="min-h-[220px] font-mono text-xs leading-relaxed"
              />
            </div>
            {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Reading notice…" : "Build response pack"}
            </Button>
          </CardFooter>
        </form>
      </Card>

      {active?.ok && active.packId ? <FreezeResult state={active} /> : null}
    </div>
  );
}
