/**
 * Purpose: Settings shell (visibility, splits, linked accounts).
 * Inputs: none yet.
 * Outputs: placeholder room.
 */
import { Settings } from "lucide-react";
import { PhasePlaceholder } from "@/components/phase-placeholder";

/** Settings placeholder. */
export default function SettingsPage() {
  return (
    <PhasePlaceholder
      kicker="The house rules"
      title="Settings"
      phase={5}
      icon={<Settings className="size-6" strokeWidth={1.6} />}
      description="Profile, verified link ownership, split rules, and what the public trust page is allowed to show."
    />
  );
}
