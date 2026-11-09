/**
 * Purpose: Evidence Vault shell.
 * Inputs: none yet.
 * Outputs: placeholder card.
 */
import { PhasePlaceholder } from "@/components/phase-placeholder";

/** Vault placeholder. */
export default function VaultPage() {
  return (
    <PhasePlaceholder
      title="Evidence Vault"
      phase={2}
      description="Private uploads, SHA-256 hashes, the auditor, and the AG Grid ledger will be built in Phase 2."
    />
  );
}
