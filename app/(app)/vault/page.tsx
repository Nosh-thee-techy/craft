/**
 * Purpose: Evidence Vault — hashed uploads, checklist, ledger, auditor.
 * Inputs: signed-in user; optional `project` query.
 * Outputs: the Phase 2 vault workspace scoped to one project.
 */
import { requireUserId } from "@/lib/auth/session";
import { completenessFromTypes } from "@/lib/evidence/completeness";
import { listEvidence, projectCompleteness } from "@/lib/evidence/service";
import { listProjects } from "@/lib/projects/service";
import { PageHeader } from "@/components/brand/page-header";
import { AuditorPanel } from "@/components/vault/auditor-panel";
import { EvidenceChecklist } from "@/components/vault/checklist";
import { EvidenceGrid } from "@/components/vault/evidence-grid";
import { ProjectSwitcher } from "@/components/vault/project-switcher";
import { VaultUploadForm } from "@/components/vault/upload-form";

type VaultPageProps = {
  searchParams: Promise<{ project?: string }>;
};

/**
 * Load one project's ledger. Completeness is code, not the LLM.
 */
export default async function VaultPage({ searchParams }: VaultPageProps) {
  const userId = await requireUserId();
  const { project: requestedId } = await searchParams;
  const projects = await listProjects(userId);
  const selected = projects.find((project) => project.id === requestedId) ?? projects[0];

  const rows = selected ? await listEvidence(userId, selected.id) : [];
  const completeness = selected
    ? ((await projectCompleteness(userId, selected.id)) ?? completenessFromTypes([]))
    : completenessFromTypes([]);

  return (
    <div>
      <PageHeader
        kicker="Records"
        title="Evidence Vault"
        lede="Save files here. Each one gets a hash and a time. The AI can only read what you upload."
      />
      <ProjectSwitcher projects={projects} selectedId={selected?.id ?? ""} />
      <div className="mb-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <EvidenceChecklist completeness={completeness} />
        {selected ? <AuditorPanel projectId={selected.id} /> : null}
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <EvidenceGrid rows={rows} />
        <VaultUploadForm projects={projects} selectedProjectId={selected?.id} />
      </div>
    </div>
  );
}
