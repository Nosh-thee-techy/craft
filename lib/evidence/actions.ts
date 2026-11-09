/**
 * Purpose: Server actions for adding vault files and portfolio links.
 * Inputs: FormData from the vault page; Auth.js session.
 * Outputs: field errors, or a revalidated vault.
 */
"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth/session";
import { logAgentAction } from "@/lib/ai/log";
import {
  addLinkSchema,
  evidenceTypeSchema,
  type EvidenceFormState,
} from "@/lib/evidence/schemas";
import { addFileEvidence, addLinkEvidence } from "@/lib/evidence/service";

/**
 * Upload a file into the vault. The AI never creates this row.
 */
export async function uploadEvidenceAction(
  _prev: EvidenceFormState,
  formData: FormData,
): Promise<EvidenceFormState> {
  const userId = await requireUserId();
  const projectId = String(formData.get("projectId") ?? "");
  const typeParsed = evidenceTypeSchema.safeParse(formData.get("type"));
  if (!typeParsed.success || typeParsed.data === "portfolio_link") {
    return { error: "Choose a file type (not a portfolio link) for uploads." };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a file to put in the vault." };
  }

  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    const row = await addFileEvidence(userId, projectId, typeParsed.data, {
      name: file.name,
      type: file.type || "application/octet-stream",
      bytes,
    });
    await logAgentAction({
      userId,
      action: "evidence.upload",
      input: { projectId, type: typeParsed.data, name: file.name },
      output: { id: row.id, sha256: row.sha256 },
    });
    revalidatePath("/vault");
    revalidatePath(`/projects/${projectId}`);
    return { ok: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not store that file." };
  }
}

/**
 * Record a public portfolio URL. Hashed as a string; nothing is fetched.
 */
export async function addPortfolioLinkAction(
  _prev: EvidenceFormState,
  formData: FormData,
): Promise<EvidenceFormState> {
  const userId = await requireUserId();
  const parsed = addLinkSchema.safeParse({
    projectId: formData.get("projectId"),
    type: "portfolio_link",
    url: formData.get("url"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Enter a project and a public URL." };
  }

  try {
    const row = await addLinkEvidence(userId, parsed.data.projectId, parsed.data.url);
    await logAgentAction({
      userId,
      action: "evidence.link",
      input: { projectId: parsed.data.projectId, url: parsed.data.url },
      output: { id: row.id, sha256: row.sha256 },
    });
    revalidatePath("/vault");
    revalidatePath(`/projects/${parsed.data.projectId}`);
    return { ok: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not store that link." };
  }
}
