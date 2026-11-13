/**
 * Purpose: Zod contracts for Phase 5 onboarding steps.
 * Inputs: form fields for profile, links, splits, visibility, profile draft.
 * Outputs: typed payloads safe for client components.
 */
import { z } from "zod";
import {
  DEFAULT_TRUST_VISIBILITY,
  trustVisibilitySchema,
} from "@/lib/delivery/schemas";

export const onboardingPlatformSchema = z.enum([
  "github",
  "youtube",
  "rss",
  "export",
]);

export type OnboardingPlatform = z.infer<typeof onboardingPlatformSchema>;

export const profileStepSchema = z.object({
  name: z.string().trim().min(2, "Tell us your name."),
  legalName: z.string().trim().min(2, "Legal name as on your ID.").optional().or(z.literal("")),
  craft: z.string().trim().min(2, "What do you make?"),
  country: z.string().trim().length(2).default("KE"),
  addressEstate: z.string().trim().optional().or(z.literal("")),
  addressRoad: z.string().trim().optional().or(z.literal("")),
  addressBuilding: z.string().trim().optional().or(z.literal("")),
  addressLandmark: z.string().trim().optional().or(z.literal("")),
  addressTown: z.string().trim().optional().or(z.literal("")),
  addressCounty: z.string().trim().optional().or(z.literal("")),
  plusCode: z.string().trim().optional().or(z.literal("")),
});

export const linkedAccountInputSchema = z.object({
  platform: onboardingPlatformSchema,
  handle: z.string().trim().min(1, "Enter a handle or feed URL."),
  url: z.string().trim().url("Enter a public URL.").optional(),
});

export const splitRulesSchema = z
  .object({
    taxPct: z.coerce.number().min(0).max(100),
    savingsPct: z.coerce.number().min(0).max(100),
    expensesPct: z.coerce.number().min(0).max(100),
  })
  .superRefine((value, ctx) => {
    const total = value.taxPct + value.savingsPct + value.expensesPct;
    if (Math.abs(total - 100) > 0.01) {
      ctx.addIssue({
        code: "custom",
        message: "Tax, savings, and expenses must add up to 100%.",
        path: ["expensesPct"],
      });
    }
  });

export const profileDraftSchema = z.object({
  summary: z.string(),
  services: z.array(z.string()).max(12),
  timeline: z.array(z.string()).max(12),
});

export type ProfileDraft = z.infer<typeof profileDraftSchema>;

export type OnboardingFormState = {
  error?: string;
  ok?: boolean;
  challengeCode?: string;
  linkedAccountId?: string;
  verified?: boolean;
  draft?: ProfileDraft;
  publicSlug?: string;
};

export type LinkedAccountRow = {
  id: string;
  platform: string;
  handle: string;
  url: string;
  challengeCode: string | null;
  status: "pending" | "verified" | "failed";
  verifiedAt: string | null;
};

export type OnboardingSnapshot = {
  name: string | null;
  legalName: string | null;
  craft: string | null;
  country: string;
  addressEstate: string | null;
  addressRoad: string | null;
  addressBuilding: string | null;
  addressLandmark: string | null;
  addressTown: string | null;
  addressCounty: string | null;
  plusCode: string | null;
  paypalConnected: boolean;
  linkedAccounts: LinkedAccountRow[];
  draft: ProfileDraft | null;
  draftApproved: boolean;
  splitRules: { taxPct: string; savingsPct: string; expensesPct: string } | null;
  publicSlug: string | null;
  visibility: z.infer<typeof trustVisibilitySchema>;
  completedAt: string | null;
};

export { DEFAULT_TRUST_VISIBILITY, trustVisibilitySchema };
