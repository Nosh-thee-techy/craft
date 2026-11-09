/**
 * Purpose: Evidence Vault — hashed uploads, checklist, ledger.
 * Inputs: the signed-in user's projects and evidence rows.
 * Outputs: the Phase 2 vault workspace.
 */
import { requireUserId } from "@/lib/auth/session";
import { completenessFromTypes } from "@/lib/evidence/completeness";
import { listEvidence } from "@/lib/evidence/service";
import { listProjects } from "@/lib/projects/service";
import { PageHeader } from "@/components/brand/page-header";
import { EvidenceChecklist } from "@/components/vault/checklist";
import { EvidenceGrid } from "@/components/vault/evidence-grid";
import { VaultUploadForm } from "@/components/vault/upload-form";

/**
 * Load the ledger on the server. Completeness is code, not the LLM.
 */
export default async function VaultPage() {
  const userId = await requireUserId();
  const [projects, rows] = await Promise.all([listProjects(userId), listEvidence(userId)]);
  const completeness = completenessFromTypes(rows.map((row) => row.type));

  return (
    <div>
      <PageHeader
        kicker="Records"
        title="Evidence Vault"
        lede="Every file gets a hash and a server timestamp. The AI may only read what you put here. It never creates proof."
      />
      <div className="mb-6">
        <EvidenceChecklist completeness={completeness} />
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <EvidenceGrid rows={rows} />
        <VaultUploadForm projects={projects} />
      </div>
    </div>
  );
}
