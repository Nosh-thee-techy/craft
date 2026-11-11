/**
 * Purpose: Persist onboarding steps — profile, PayPal marker, links, splits, draft, done.
 * Inputs: signed-in user id + step payloads.
 * Outputs: OnboardingSnapshot. Challenge checks go through lib/verify/challenge.ts.
 */
import "server-only";
import { eq } from "drizzle-orm";
import { draftProfileFromVerifiedLinks } from "@/lib/ai/profile";
import { logAgentAction } from "@/lib/ai/log";
import { db } from "@/lib/db/client";
import { linkedAccounts, splitRules, users } from "@/lib/db/schema";
import { env } from "@/lib/env";
import {
  DEFAULT_TRUST_VISIBILITY,
  profileDraftSchema,
  trustVisibilitySchema,
  type LinkedAccountRow,
  type OnboardingSnapshot,
  type ProfileDraft,
} from "@/lib/onboarding/schemas";
import { saveTrustSettings } from "@/lib/trust/service";
import {
  checkChallenge,
  generateChallengeCode,
  resolvePublicUrl,
  type ChallengePlatform,
} from "@/lib/verify/challenge";

/**
 * Load everything the onboarding UI needs in one round trip.
 */
export async function getOnboardingSnapshot(userId: string): Promise<OnboardingSnapshot> {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) {
    throw new Error("User not found.");
  }

  const links = await db
    .select()
    .from(linkedAccounts)
    .where(eq(linkedAccounts.userId, userId));

  const [rules] = await db.select().from(splitRules).where(eq(splitRules.userId, userId)).limit(1);

  const visibility = trustVisibilitySchema.safeParse(
    user.trustVisibilityJson ?? DEFAULT_TRUST_VISIBILITY,
  );

  let draft: ProfileDraft | null = null;
  if (user.profileDraftJson) {
    const parsed = profileDraftSchema.safeParse(user.profileDraftJson);
    draft = parsed.success ? parsed.data : null;
  }

  return {
    name: user.name,
    craft: user.craft,
    country: user.country,
    paypalConnected: Boolean(user.paypalSandboxConnectedAt),
    linkedAccounts: links.map(toLinkedRow),
    draft,
    draftApproved: Boolean(user.profileDraftApprovedAt),
    splitRules: rules
      ? {
          taxPct: rules.taxPct,
          savingsPct: rules.savingsPct,
          expensesPct: rules.expensesPct,
        }
      : null,
    publicSlug: user.publicSlug,
    visibility: visibility.success ? visibility.data : DEFAULT_TRUST_VISIBILITY,
    completedAt: user.onboardingCompletedAt?.toISOString() ?? null,
  };
}

/**
 * Step 1 — who you are.
 */
export async function saveProfileStep(
  userId: string,
  input: { name: string; craft: string; country: string },
): Promise<void> {
  await db
    .update(users)
    .set({
      name: input.name,
      craft: input.craft,
      country: input.country,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
  await logAgentAction({
    userId,
    action: "onboarding.profile",
    input,
    output: { ok: true },
  });
}

/**
 * Step 2 — mark PayPal sandbox as connected when env keys exist (or allow skip).
 */
export async function connectPayPalSandbox(userId: string): Promise<{ connected: boolean; detail: string }> {
  const ready = Boolean(env.PAYPAL_CLIENT_ID && env.PAYPAL_CLIENT_SECRET);
  if (!ready) {
    return {
      connected: false,
      detail: "Add PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET to .env.local, then try again. You can skip for now.",
    };
  }
  await db
    .update(users)
    .set({ paypalSandboxConnectedAt: new Date(), updatedAt: new Date() })
    .where(eq(users.id, userId));
  await logAgentAction({
    userId,
    action: "onboarding.paypal",
    input: { env: "sandbox" },
    output: { connected: true },
  });
  return { connected: true, detail: "PayPal sandbox keys are present. Connection marked." };
}

/**
 * Step 3 — add a link and issue a challenge code.
 */
export async function addLinkedAccount(
  userId: string,
  input: { platform: ChallengePlatform; handle: string; url?: string },
): Promise<LinkedAccountRow> {
  const challengeCode = generateChallengeCode();
  const url = resolvePublicUrl(input.platform, input.handle, input.url);
  const [row] = await db
    .insert(linkedAccounts)
    .values({
      userId,
      platform: input.platform,
      handle: input.handle.replace(/^@/, ""),
      url,
      challengeCode,
      status: "pending",
    })
    .onConflictDoUpdate({
      target: [linkedAccounts.userId, linkedAccounts.platform, linkedAccounts.handle],
      set: {
        url,
        challengeCode,
        status: "pending",
        verifiedAt: null,
        publicDataJson: null,
        updatedAt: new Date(),
      },
    })
    .returning();

  if (!row) {
    throw new Error("Could not save the linked account.");
  }
  await logAgentAction({
    userId,
    action: "onboarding.link_add",
    input: { platform: input.platform, handle: input.handle },
    output: { id: row.id, challengeCode },
  });
  return toLinkedRow(row);
}

/**
 * Check the challenge against official public sources.
 */
export async function verifyLinkedAccount(
  userId: string,
  linkedAccountId: string,
  exportText?: string,
): Promise<LinkedAccountRow> {
  const [row] = await db
    .select()
    .from(linkedAccounts)
    .where(eq(linkedAccounts.id, linkedAccountId))
    .limit(1);
  if (!row || row.userId !== userId) {
    throw new Error("Linked account not found.");
  }
  if (!row.challengeCode) {
    throw new Error("No challenge code on this link.");
  }

  const result = await checkChallenge({
    platform: row.platform as ChallengePlatform,
    handle: row.handle,
    url: row.url,
    challengeCode: row.challengeCode,
    exportText,
  });

  const [updated] = await db
    .update(linkedAccounts)
    .set({
      status: result.passed ? "verified" : "failed",
      verifiedAt: result.passed ? new Date() : null,
      publicDataJson: result.publicData ?? null,
      updatedAt: new Date(),
    })
    .where(eq(linkedAccounts.id, linkedAccountId))
    .returning();

  await logAgentAction({
    userId,
    action: "onboarding.link_verify",
    input: { linkedAccountId, platform: row.platform },
    output: result,
    verifierPassed: result.passed,
  });

  if (!updated) {
    throw new Error("Could not update link ownership status.");
  }
  if (!result.passed) {
    throw new Error(result.reason);
  }
  return toLinkedRow(updated);
}

/**
 * Step 5 — draft from verified links only.
 */
export async function createProfileDraft(userId: string): Promise<ProfileDraft> {
  const snap = await getOnboardingSnapshot(userId);
  const verified = await db
    .select()
    .from(linkedAccounts)
    .where(eq(linkedAccounts.userId, userId));

  const draft = await draftProfileFromVerifiedLinks({
    userId,
    name: snap.name,
    craft: snap.craft,
    verifiedLinks: verified
      .filter((row) => row.status === "verified")
      .map((row) => ({
        platform: row.platform,
        handle: row.handle,
        url: row.url,
        publicData: (row.publicDataJson as Record<string, unknown> | null) ?? null,
      })),
  });

  await db
    .update(users)
    .set({
      profileDraftJson: draft,
      profileDraftApprovedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  return draft;
}

/**
 * User edits and approves the draft.
 */
export async function approveProfileDraft(userId: string, draft: ProfileDraft): Promise<void> {
  const parsed = profileDraftSchema.parse(draft);
  await db
    .update(users)
    .set({
      profileDraftJson: parsed,
      profileDraftApprovedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
  await logAgentAction({
    userId,
    action: "onboarding.profile_approve",
    input: parsed,
    output: { approved: true },
    approvedByUser: true,
  });
}

/**
 * Step 7 — split rules (deterministic percentages only).
 */
export async function saveSplitRules(
  userId: string,
  input: { taxPct: number; savingsPct: number; expensesPct: number },
): Promise<void> {
  await db
    .insert(splitRules)
    .values({
      userId,
      taxPct: input.taxPct.toFixed(2),
      savingsPct: input.savingsPct.toFixed(2),
      expensesPct: input.expensesPct.toFixed(2),
    })
    .onConflictDoUpdate({
      target: splitRules.userId,
      set: {
        taxPct: input.taxPct.toFixed(2),
        savingsPct: input.savingsPct.toFixed(2),
        expensesPct: input.expensesPct.toFixed(2),
        updatedAt: new Date(),
      },
    });
  await logAgentAction({
    userId,
    action: "onboarding.splits",
    input,
    output: { ok: true },
  });
}

/**
 * Step 8 — visibility via existing trust settings helper.
 */
export async function saveOnboardingVisibility(
  userId: string,
  input: {
    visibility: OnboardingSnapshot["visibility"];
    slugSeed?: string;
  },
): Promise<{ publicSlug: string }> {
  return saveTrustSettings(userId, {
    visibility: input.visibility,
    visibleProjectIds: [],
    slugSeed: input.slugSeed,
  });
}

/**
 * Finish onboarding.
 */
export async function completeOnboarding(userId: string): Promise<void> {
  await db
    .update(users)
    .set({ onboardingCompletedAt: new Date(), updatedAt: new Date() })
    .where(eq(users.id, userId));
  await logAgentAction({
    userId,
    action: "onboarding.complete",
    input: {},
    output: { ok: true },
  });
}

/**
 * Map DB row to client shape.
 */
function toLinkedRow(row: typeof linkedAccounts.$inferSelect): LinkedAccountRow {
  return {
    id: row.id,
    platform: row.platform,
    handle: row.handle,
    url: row.url,
    challengeCode: row.challengeCode,
    status: row.status,
    verifiedAt: row.verifiedAt?.toISOString() ?? null,
  };
}
