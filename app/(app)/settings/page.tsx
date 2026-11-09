/**
 * Purpose: Settings shell (visibility, splits, linked accounts).
 * Inputs: none yet.
 * Outputs: placeholder card.
 */
import { PhasePlaceholder } from "@/components/phase-placeholder";

/** Settings placeholder. */
export default function SettingsPage() {
  return (
    <PhasePlaceholder
      title="Settings"
      phase={5}
      description="Profile, verified link ownership, split rules, and trust-page visibility will be configurable from Phase 5."
    />
  );
}
