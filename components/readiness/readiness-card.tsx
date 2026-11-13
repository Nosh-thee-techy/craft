/**
 * Purpose: Dashboard Account Readiness checklist — N of M ready, not a score.
 * Inputs: readiness result + nudges from computeReadiness.
 * Outputs: checklist UI. Avoid freeze-prediction wording in user-facing copy.
 */
import Link from "next/link";
import type { ReadinessPlan } from "@/lib/ai/readiness-coach-core";
import type { Nudge } from "@/lib/readiness/nudges";
import type { ReadinessResult } from "@/lib/readiness/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type ReadinessCardProps = {
  result: ReadinessResult;
  nudges: Nudge[];
  /** Optional F5 coach plan — failed checks only, worded for next steps. */
  plan?: ReadinessPlan;
};

/**
 * Checklist card. Advice only — does not predict freezes.
 */
export function ReadinessCard({ result, nudges, plan }: ReadinessCardProps) {
  const failed = result.checks.filter((check) => check.state !== "ok");

  return (
    <Card className="mb-6" data-testid="readiness-card">
      <CardHeader>
        <p className="text-xs uppercase tracking-[0.22em] text-primary">Prepare</p>
        <CardTitle>Account readiness</CardTitle>
        <CardDescription>
          {result.summary}. A checklist of steps that reduce avoidable flag reasons — not a
          prediction, not a credit score.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="font-display text-3xl tracking-tight">{result.summary}</p>
        <ul className="space-y-2">
          {result.checks.map((check) => (
            <li key={check.id} className="flex items-start gap-3 text-sm">
              <span
                className={`mt-0.5 font-mono text-xs uppercase ${
                  check.state === "ok"
                    ? "text-teal"
                    : check.state === "stale" || check.state === "mismatch"
                      ? "text-accent"
                      : "text-muted-foreground"
                }`}
              >
                {check.state}
              </span>
              <span>
                <span className="font-medium">{check.label}</span>
                <span className="block text-muted-foreground">{check.detail}</span>
              </span>
            </li>
          ))}
        </ul>
        {plan ? (
          <div
            className="rounded-2xl border border-border/70 bg-background/40 p-3"
            data-testid="readiness-coach"
          >
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
              Coach · {plan.source}
            </p>
            <p className="mt-1 text-sm font-medium">{plan.headline}</p>
            <ol className="mt-2 list-inside list-decimal space-y-1 text-sm text-muted-foreground">
              {plan.steps.slice(0, 5).map((step) => (
                <li key={step.slice(0, 48)}>{step}</li>
              ))}
            </ol>
          </div>
        ) : null}
        {nudges.length > 0 ? (
          <div className="rounded-2xl border border-border/70 bg-background/40 p-3">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Nudges</p>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              {nudges.slice(0, 4).map((nudge) => (
                <li key={nudge.id}>{nudge.message}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {failed.length > 0 ? (
          <Button asChild variant="outline">
            <Link href="/vault">Open Identity and funds →</Link>
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
