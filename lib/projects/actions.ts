/**
 * Purpose: Server actions for creating a project and sending its PayPal invoice.
 * Inputs: FormData from the projects UI; Auth.js session.
 * Outputs: field errors or a redirect / ok flag.
 */
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUserId } from "@/lib/auth/session";
import { createAndSendInvoice } from "@/lib/paypal/invoices";
import {
  type InvoiceActionState,
  type ProjectFormState,
  createProjectSchema,
} from "@/lib/projects/schemas";
import { createProject } from "@/lib/projects/service";

/**
 * Validate the create form, insert a draft project, then go to its detail page.
 */
export async function createProjectAction(
  _prev: ProjectFormState,
  formData: FormData,
): Promise<ProjectFormState> {
  const userId = await requireUserId();
  const parsed = createProjectSchema.safeParse({
    clientName: formData.get("clientName"),
    clientEmail: formData.get("clientEmail"),
    scope: formData.get("scope"),
    amount: formData.get("amount"),
    currency: formData.get("currency") || "USD",
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  let project;
  try {
    project = await createProject(userId, parsed.data);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Could not create the project.",
    };
  }

  redirect(`/projects/${project.id}`);
}

/**
 * Create and send a PayPal sandbox invoice for this project.
 */
export async function sendInvoiceAction(
  projectId: string,
  prev: InvoiceActionState,
  formData: FormData,
): Promise<InvoiceActionState> {
  void prev;
  void formData;
  const userId = await requireUserId();
  try {
    const { precheckProjectInvoice } = await import("@/lib/readiness/invoice-precheck-service");
    const flags = await precheckProjectInvoice(userId, projectId);
    await createAndSendInvoice(userId, projectId);
    revalidatePath(`/projects/${projectId}`);
    revalidatePath("/projects");
    return {
      ok: true,
      flags: flags.map((flag) => ({
        code: flag.code,
        severity: flag.severity,
        reason: flag.reason,
        sentence: flag.sentence,
        attachFirst: flag.attachFirst,
      })),
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Could not send the invoice.",
    };
  }
}
