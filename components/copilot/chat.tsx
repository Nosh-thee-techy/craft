/**
 * Purpose: Copilot chat UI — questions grounded in vault + readiness rules.
 * Inputs: initial empty state; server action returns answer + citations.
 * Outputs: answer panel. No retrieved source → “I don't know”.
 */
"use client";

import { useActionState } from "react";
import {
  askCopilotAction,
  type CopilotFormState,
} from "@/lib/ai/copilot-actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const initial: CopilotFormState = {};

/**
 * Ask form + answer. Citations are snippet ids from retrieval only.
 */
export function CopilotChat() {
  const [state, action, pending] = useActionState(askCopilotAction, initial);

  return (
    <div className="space-y-4" data-testid="copilot-chat">
      <Card>
        <CardHeader>
          <p className="text-xs uppercase tracking-[0.22em] text-primary">Ask</p>
          <CardTitle>Studio Copilot</CardTitle>
          <CardDescription>
            Answers only from your vault and readiness rules. If nothing matches, it
            says it does not know — it never invents proof or calculates money.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={action} className="space-y-3">
            <textarea
              name="question"
              rows={3}
              placeholder='e.g. "What do I upload next?" or "Why was this flagged?"'
              className="w-full rounded-2xl border border-border/70 bg-[var(--field)] p-3 text-sm"
              required
              defaultValue={state.question ?? ""}
            />
            <Button type="submit" disabled={pending}>
              {pending ? "Looking…" : "Ask"}
            </Button>
          </form>
          {state.error ? (
            <p className="mt-3 text-sm text-destructive">{state.error}</p>
          ) : null}
        </CardContent>
      </Card>

      {state.ok && state.answer ? (
        <Card>
          <CardHeader>
            <p className="text-xs uppercase tracking-[0.22em] text-primary">
              Answer · {state.source}
            </p>
            <CardTitle>Reply</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <pre className="whitespace-pre-wrap rounded-2xl border border-border/70 bg-[var(--field)] p-4 text-sm leading-relaxed">
              {state.answer}
            </pre>
            {state.citationIds && state.citationIds.length > 0 ? (
              <p className="text-xs text-muted-foreground">
                Citations: {state.citationIds.join(", ")}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">No citations — nothing matched.</p>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
