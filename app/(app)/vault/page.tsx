/**
 * Purpose: Evidence Vault shell.
 * Inputs: none yet.
 * Outputs: placeholder room.
 */
import { Archive } from "lucide-react";
import { PhasePlaceholder } from "@/components/phase-placeholder";

/** Vault placeholder. */
export default function VaultPage() {
  return (
    <PhasePlaceholder
      kicker="Records"
      title="Evidence Vault"
      phase={2}
      icon={<Archive className="size-6" strokeWidth={1.6} />}
      description="Private uploads, SHA-256 hashes, the auditor, and a ledger of every file you might one day need to prove."
    />
  );
}
