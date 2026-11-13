/**
 * Purpose: Compact Account Readiness — N of M ready, not a score.
 * Inputs: readiness result + optional coach plan.
 * Outputs: short checklist of what is still open. No freeze-prediction wording.
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
 * Slim checklist. Advice only — does not predict freezes.
 */
export function ReadinessCard({ result, nudges, plan }: ReadinessCardProps) {
  const failed = result.checks.filter((check) => check.state !== "ok");
  const nextSteps =
    plan?.steps.slice(0, 2) ??
    failed.slice(0, 2).map((check) => check.label) ??
    [];

  // Nudges stay available for callers; home only shows the top open items.
  void nudges;

  if (failed.length === 0) {
    return (
      <Card className="mb-6" data-testid="readiness-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">{result.summary}</CardTitle>
          <CardDescription>Checklist complete — keep address proof fresh.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="mb-6" data-testid="readiness-card">
      <CardHeader className="pb-3">
        <p className="text-xs uppercase tracking-[0.22em] text-primary">Next</p>
        <CardTitle className="text-xl">{result.summary}</CardTitle>
        <CardDescription>Finish these, then bill. Not a credit score.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ol className="list-inside list-decimal space-y-1.5 text-sm text-muted-foreground">
          {nextSteps.map((step) => (
            <li key={step.slice(0, 48)}>{step}</li>
          ))}
        </ol>
        <div data-testid="readiness-coach" className="sr-only">
          {plan?.headline}
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/vault">Open vault</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
