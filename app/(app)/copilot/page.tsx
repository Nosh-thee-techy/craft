/**
 * Purpose: Copilot chat shell.
 * Inputs: none yet.
 * Outputs: placeholder room.
 */
import { Sparkles } from "lucide-react";
import { PhasePlaceholder } from "@/components/phase-placeholder";

/** Copilot placeholder. */
export default function CopilotPage() {
  return (
    <PhasePlaceholder
      kicker="A second pair of eyes"
      title="Copilot"
      phase={6}
      icon={<Sparkles className="size-6" strokeWidth={1.6} />}
      description="A studio assistant over projects, evidence, payments, forecast, and plan. It never calculates money or invents proof."
    />
  );
}
