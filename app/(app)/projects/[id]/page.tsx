/**
 * Purpose: Project detail shell.
 * Inputs: route param `id` (unused until Phase 1).
 * Outputs: placeholder card.
 */
import { PhasePlaceholder } from "@/components/phase-placeholder";

type ProjectDetailProps = {
  params: Promise<{ id: string }>;
};

/** Project detail placeholder. */
export default async function ProjectDetailPage({ params }: ProjectDetailProps) {
  await params;
  return (
    <PhasePlaceholder
      title="Project"
      phase={1}
      description="Invoice send, payment status, and evidence for a single project will live here in Phase 1."
    />
  );
}
