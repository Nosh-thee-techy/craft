/**
 * Purpose: Zod contracts for delivery, confirm, and trust visibility.
 * Inputs: form fields and stored JSON.
 * Outputs: typed shapes safe to share with client components.
 */
import { z } from "zod";

export const publishLinkSchema = z.string().trim().url("Publish links must be full URLs.");

export const deliverFormSchema = z.object({
  projectId: z.string().uuid(),
  publishLinks: z.array(publishLinkSchema).max(8).default([]),
});

export type DeliverFormState = {
  error?: string;
  ok?: boolean;
  confirmUrl?: string;
  deliverableId?: string;
};

export const matchCheckSchema = z.object({
  matches: z.boolean(),
  summary: z.string(),
  mismatches: z.array(z.string()).max(12),
});

export type MatchCheck = z.infer<typeof matchCheckSchema>;

export type DeliverableRow = {
  id: string;
  projectId: string;
  evidenceItemId: string | null;
  confirmToken: string;
  publishLinks: string[];
  matchCheck: MatchCheck | null;
  deliveredAt: string | null;
  clientConfirmedAt: string | null;
  fileName: string | null;
  sha256: string | null;
};

export const trustVisibilitySchema = z.object({
  showCounts: z.boolean().default(true),
  showPortfolio: z.boolean().default(true),
  showCheckout: z.boolean().default(true),
});

export type TrustVisibility = z.infer<typeof trustVisibilitySchema>;

export const DEFAULT_TRUST_VISIBILITY: TrustVisibility = {
  showCounts: true,
  showPortfolio: true,
  showCheckout: true,
};

export type TrustFormState = {
  error?: string;
  ok?: boolean;
};
