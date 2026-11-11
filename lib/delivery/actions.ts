/**
 * Purpose: Server actions for marking a project delivered.
 * Inputs: FormData with file + optional publish links; Auth.js session.
 * Outputs: DeliverFormState with the public confirm URL, or an error.
 */
"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth/session";
import { confirmUrlFor, deliverProject } from "@/lib/delivery/service";
import { deliverFormSchema, type DeliverFormState } from "@/lib/delivery/schemas";

/**
 * Hash the final file into the vault, open a confirm link, mark the project delivered.
 */
export async function deliverProjectAction(
  _prev: DeliverFormState,
  formData: FormData,
): Promise<DeliverFormState> {
  const userId = await requireUserId();
  const rawLinks = String(formData.get("publishLinks") ?? "")
    .split(/\n|,/)
    .map((link) => link.trim())
    .filter(Boolean);

  const parsed = deliverFormSchema.safeParse({
    projectId: formData.get("projectId"),
    publishLinks: rawLinks,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the project and links." };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose the final file to deliver." };
  }

  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    const row = await deliverProject(
      userId,
      parsed.data.projectId,
      { name: file.name, type: file.type || "application/octet-stream", bytes },
      parsed.data.publishLinks,
    );
    revalidatePath(`/projects/${parsed.data.projectId}`);
    revalidatePath("/projects");
    revalidatePath("/vault");
    return {
      ok: true,
      deliverableId: row.id,
      confirmUrl: confirmUrlFor(row.confirmToken),
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Could not mark this project delivered.",
    };
  }
}
