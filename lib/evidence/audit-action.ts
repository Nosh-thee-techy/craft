/**
 * Purpose: Server action that runs the evidence auditor for one project.
 * Inputs: project id from the vault form.
 * Outputs: questions plus the code-computed completeness, or an error.
 */
"use server";

import { requireUserId } from "@/lib/auth/session";
import { auditProject, type AuditReport } from "@/lib/ai/auditor";

export type AuditFormState = {
  error?: string;
  report?: AuditReport;
};

/**
 * Audit one owned project. Missing types come from code, not the LLM.
 */
export async function auditProjectAction(
  _prev: AuditFormState,
  formData: FormData,
): Promise<AuditFormState> {
  const userId = await requireUserId();
  const projectId = String(formData.get("projectId") ?? "");
  if (!projectId) {
    return { error: "Choose a project to audit." };
  }
  try {
    const report = await auditProject(userId, projectId);
    return { report };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not audit this project." };
  }
}
