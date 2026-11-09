/**
 * Purpose: Money / forecast / score shell.
 * Inputs: none yet.
 * Outputs: placeholder room.
 */
import { Wallet } from "lucide-react";
import { PhasePlaceholder } from "@/components/phase-placeholder";

/** Money placeholder. */
export default function MoneyPage() {
  return (
    <PhasePlaceholder
      kicker="Funds"
      title="Money"
      phase={6}
      icon={<Wallet className="size-6" strokeWidth={1.6} />}
      description="Income stability, a cash-flow band, split proposals, and a simulated investing plan — educational, never invented."
    />
  );
}
