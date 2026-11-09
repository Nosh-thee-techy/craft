/**
 * Purpose: Shared "not built yet" screen for Phase 0 route shells.
 * Inputs: title, phase number, and a one-line description.
 * Outputs: a Card explaining what will land in a later phase.
 */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type PhasePlaceholderProps = {
  title: string;
  phase: number;
  description: string;
};

/**
 * Render a placeholder so the App Router tree matches CRAFT_BUILD_PLAN.md
 * without implementing feature logic yet.
 */
export function PhasePlaceholder({ title, phase, description }: PhasePlaceholderProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>Phase {phase} — not built yet</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
