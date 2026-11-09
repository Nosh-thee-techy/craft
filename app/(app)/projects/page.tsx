/**
 * Purpose: Projects index — AG Grid ledger plus create form.
 * Inputs: the signed-in user's projects from Postgres.
 * Outputs: the Phase 1 projects workspace.
 */
import { requireUserId } from "@/lib/auth/session";
import { listProjects } from "@/lib/projects/service";
import { PageHeader } from "@/components/brand/page-header";
import { ProjectsGrid } from "@/components/projects/projects-grid";
import { CreateProjectForm } from "@/components/projects/create-project-form";

/**
 * Load projects on the server, then hydrate the grid on the client.
 */
export default async function ProjectsPage() {
  const userId = await requireUserId();
  const rows = await listProjects(userId);

  return (
    <div>
      <PageHeader
        kicker="The work"
        title="Projects"
        lede="Name the client and the work, then send a PayPal bill."
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <ProjectsGrid rows={rows} />
        <CreateProjectForm />
      </div>
    </div>
  );
}
