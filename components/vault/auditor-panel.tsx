/**
 * Purpose: Run the vault auditor and show questions for missing proof.
 * Inputs: selected project id; server action.
 * Outputs: a question list. Completeness stays computed in code.
 */
"use client";

import { useActionState } from "react";
import { auditProjectAction, type AuditFormState } from "@/lib/evidence/audit-action";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const initial: AuditFormState = {};

type AuditorPanelProps = {
  projectId: string;
};

/**
 * Ask the auditor. It cannot invent files; it only talks about the checklist gaps.
 */
export function AuditorPanel({ projectId }: AuditorPanelProps) {
  const [state, action, pending] = useActionState(auditProjectAction, initial);

  return (
    <Card>
      <CardHeader>
        <p className="text-xs uppercase tracking-[0.22em] text-accent">Auditor</p>
        <CardTitle>Where is the proof thin?</CardTitle>
        <CardDescription>
          Missing types are counted in code. The model may only phrase questions about those gaps.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action}>
          <input type="hidden" name="projectId" value={projectId} />
          <Button type="submit" variant="outline" disabled={pending}>
            {pending ? "Reading the vault…" : "Ask the auditor"}
          </Button>
        </form>
        {state.error ? <p className="mt-4 text-sm text-destructive">{state.error}</p> : null}
        {state.report ? (
          <ul className="mt-5 space-y-2 text-sm">
            {state.report.questions.map((question) => (
              <li key={question} className="rounded-2xl border border-border bg-background/40 px-4 py-3">
                {question}
              </li>
            ))}
            {state.report.questions.length === 0 ? (
              <li className="text-muted-foreground">No questions. The checklist is full.</li>
            ) : null}
            {!state.report.llmEnabled ? (
              <li className="text-xs text-muted-foreground">
                LLM key not set — questions are the checklist gaps in plain language.
              </li>
            ) : null}
          </ul>
        ) : null}
      </CardContent>
    </Card>
  );
}
