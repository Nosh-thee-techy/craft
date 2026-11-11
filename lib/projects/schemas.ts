/**
 * Purpose: Zod schemas for project create/list payloads.
 * Inputs: form fields and API bodies.
 * Outputs: parsed project input or field errors.
 *
 * Money is validated here but never calculated by an LLM.
 */
import { z } from "zod";

export const projectStatusSchema = z.enum([
  "draft",
  "invoiced",
  "funded",
  "delivered",
  "closed",
]);

export const createProjectSchema = z.object({
  clientName: z.string().trim().min(2, "Client name is required."),
  clientEmail: z.string().trim().email("Enter a valid client email."),
  scope: z.string().trim().min(4, "Describe the work in a short scope."),
  amount: z.coerce.number().positive("Amount must be greater than zero."),
  currency: z
    .string()
    .trim()
    .length(3)
    .transform((value) => value.toUpperCase())
    .default("USD"),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export type ProjectFormState = {
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

export type InvoiceActionState = {
  error?: string;
  ok?: boolean;
};

/** Serializable project row for the AG Grid (safe to import from client components). */
export type ProjectRow = {
  id: string;
  clientName: string;
  clientEmail: string;
  scope: string;
  currency: string;
  amount: string;
  status: "draft" | "invoiced" | "funded" | "delivered" | "closed";
  trustSlug: string;
  showOnTrust: boolean;
  createdAt: string;
};
