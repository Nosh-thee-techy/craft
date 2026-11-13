/**
 * Purpose: Server actions for adding vault files and portfolio links.
 * Inputs: FormData from the vault page; Auth.js session.
 * Outputs: field errors, or a revalidated vault.
 */
"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth/session";
import { extractDocument } from "@/lib/ai/doc-reader";
import { logAgentAction } from "@/lib/ai/log";
import {
  ACCOUNT_EVIDENCE_TYPES,
  addLinkSchema,
  evidenceTypeSchema,
  isAccountEvidenceType,
  type EvidenceFormState,
} from "@/lib/evidence/schemas";
import {
  addAccountFileEvidence,
  addFileEvidence,
  addLinkEvidence,
} from "@/lib/evidence/service";

/**
 * Upload a project file into the vault. The AI never creates this row.
 */
export async function uploadEvidenceAction(
  _prev: EvidenceFormState,
  formData: FormData,
): Promise<EvidenceFormState> {
  const userId = await requireUserId();
  const projectId = String(formData.get("projectId") ?? "");
  const typeParsed = evidenceTypeSchema.safeParse(formData.get("type"));
  if (
    !typeParsed.success ||
    typeParsed.data === "portfolio_link" ||
    isAccountEvidenceType(typeParsed.data)
  ) {
    return { error: "Choose a project file type (not Identity and funds) for this upload." };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a file to put in the vault." };
  }

  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    const mime = file.type || "application/octet-stream";
    const row = await addFileEvidence(userId, projectId, typeParsed.data, {
      name: file.name,
      type: mime,
      bytes,
    });
    await logAgentAction({
      userId,
      action: "evidence.upload",
      input: { projectId, type: typeParsed.data, name: file.name },
      output: { id: row.id, sha256: row.sha256 },
    });
    // F1 doc-reader: never roll back the hash if extraction fails or times out.
    if (row.sha256) {
      await extractDocument({
        userId,
        evidenceId: row.id,
        type: typeParsed.data,
        sha256: row.sha256,
        bytes,
        mimeType: mime,
      }).catch(() => undefined);
    }
    revalidatePath("/vault");
    revalidatePath(`/projects/${projectId}`);
    return { ok: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not store that file." };
  }
}

/**
 * Upload an optional account-level Identity and funds file (no project).
 */
export async function uploadAccountEvidenceAction(
  _prev: EvidenceFormState,
  formData: FormData,
): Promise<EvidenceFormState> {
  const userId = await requireUserId();
  const typeRaw = String(formData.get("type") ?? "");
  if (!(ACCOUNT_EVIDENCE_TYPES as readonly string[]).includes(typeRaw)) {
    return { error: "Choose an Identity and funds document type." };
  }
  const type = typeRaw as (typeof ACCOUNT_EVIDENCE_TYPES)[number];

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a file to upload. Redact card and account numbers first." };
  }

  const holderName = String(formData.get("holderName") ?? "").trim() || undefined;
  const issuer = String(formData.get("issuer") ?? "").trim() || undefined;
  const docDateRaw = String(formData.get("docDate") ?? "").trim();
  let docDate: Date | null = null;
  if (docDateRaw) {
    const parsed = new Date(`${docDateRaw}T00:00:00.000Z`);
    if (Number.isNaN(parsed.getTime())) {
      return { error: "Document date must be a valid calendar day." };
    }
    docDate = parsed;
  }

  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    const mime = file.type || "application/octet-stream";
    const row = await addAccountFileEvidence(userId, type, {
      name: file.name,
      type: mime,
      bytes,
    }, { holderName, issuer, docDate });
    await logAgentAction({
      userId,
      action: "evidence.account_upload",
      input: { type, name: file.name },
      output: { id: row.id, sha256: row.sha256 },
    });
    if (row.sha256) {
      await extractDocument({
        userId,
        evidenceId: row.id,
        type,
        sha256: row.sha256,
        bytes,
        mimeType: mime,
      }).catch(() => undefined);
    }
    revalidatePath("/vault");
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
