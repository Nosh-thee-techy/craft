/**
 * Purpose: Public trust page data and creative visibility controls.
 * Inputs: public slug, or signed-in user for settings.
 * Outputs: only fields the creative marked visible. Never private files.
 */
import "server-only";
import { and, count, eq, isNotNull } from "drizzle-orm";
import { logAgentAction } from "@/lib/ai/log";
import { db } from "@/lib/db/client";
import { deliverables, evidenceItems, projects, users } from "@/lib/db/schema";
import {
  DEFAULT_TRUST_VISIBILITY,
  trustVisibilitySchema,
  type TrustVisibility,
} from "@/lib/delivery/schemas";

export type TrustPortfolioItem = {
  clientLabel: string;
  scope: string;
  status: string;
  confirmed: boolean;
  portfolioLinks: string[];
};

export type TrustPageData = {
  slug: string;
  name: string | null;
  craft: string | null;
  visibility: TrustVisibility;
  verifiedProjectCount: number | null;
  deliveryRate: number | null;
  clientConfirmations: number | null;
  portfolio: TrustPortfolioItem[] | null;
  showCheckout: boolean;
};

/**
 * Ensure the user has a public slug (created lazily on first trust save).
 */
export function makePublicSlug(seed: string): string {
  const base = seed
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 28);
  return `${base || "studio"}-${crypto.randomUUID().slice(0, 6)}`;
}

/**
 * Load visibility settings for the signed-in creative.
 */
export async function getTrustSettings(userId: string): Promise<{
  publicSlug: string | null;
  visibility: TrustVisibility;
  projects: { id: string; clientName: string; showOnTrust: boolean; status: string }[];
}> {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const projectRows = await db
    .select({
      id: projects.id,
      clientName: projects.clientName,
      showOnTrust: projects.showOnTrust,
      status: projects.status,
    })
    .from(projects)
    .where(eq(projects.userId, userId));

  return {
    publicSlug: user?.publicSlug ?? null,
    visibility: parseVisibility(user?.trustVisibilityJson),
    projects: projectRows,
  };
}

/**
 * Save visibility flags, public slug seed, and which projects appear.
 */
export async function saveTrustSettings(
  userId: string,
  input: {
    visibility: TrustVisibility;
    visibleProjectIds: string[];
    slugSeed?: string;
  },
): Promise<{ publicSlug: string }> {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) {
    throw new Error("User not found.");
  }

  let publicSlug = user.publicSlug;
  if (!publicSlug) {
    publicSlug = makePublicSlug(input.slugSeed || user.name || user.email || "studio");
  }

  await db
    .update(users)
    .set({
      publicSlug,
      trustVisibilityJson: input.visibility,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  const owned = await db.select({ id: projects.id }).from(projects).where(eq(projects.userId, userId));
  const ownedIds = new Set(owned.map((row) => row.id));
  const visible = new Set(input.visibleProjectIds.filter((id) => ownedIds.has(id)));

  for (const row of owned) {
    await db
      .update(projects)
      .set({ showOnTrust: visible.has(row.id), updatedAt: new Date() })
      .where(eq(projects.id, row.id));
  }

  await logAgentAction({
    userId,
    action: "trust.settings",
    input: { visibleCount: visible.size, visibility: input.visibility },
    output: { publicSlug },
  });

  return { publicSlug };
}

/**
 * Public trust page for a creative slug. Hidden sections stay null.
 */
export async function getTrustPage(slug: string): Promise<TrustPageData | null> {
  const [user] = await db.select().from(users).where(eq(users.publicSlug, slug)).limit(1);
  if (!user) {
    return null;
  }

  const visibility = parseVisibility(user.trustVisibilityJson);
  const projectRows = await db
    .select()
    .from(projects)
    .where(eq(projects.userId, user.id));

  const total = projectRows.length;
  const delivered = projectRows.filter(
    (row) => row.status === "delivered" || row.status === "closed",
  ).length;

  const [confirmRow] = await db
    .select({ value: count() })
    .from(deliverables)
    .innerJoin(projects, eq(deliverables.projectId, projects.id))
    .where(and(eq(projects.userId, user.id), isNotNull(deliverables.clientConfirmedAt)));

  const portfolioProjects = projectRows.filter((row) => row.showOnTrust);
  const portfolio: TrustPortfolioItem[] = [];

  for (const project of portfolioProjects) {
    const links = await db
      .select({ storageKey: evidenceItems.storageKey })
      .from(evidenceItems)
      .where(
        and(
          eq(evidenceItems.projectId, project.id),
          eq(evidenceItems.type, "portfolio_link"),
        ),
      );
    const [confirmed] = await db
      .select({ id: deliverables.id })
      .from(deliverables)
      .where(
        and(
          eq(deliverables.projectId, project.id),
          isNotNull(deliverables.clientConfirmedAt),
        ),
      )
      .limit(1);

    portfolio.push({
      clientLabel: redactClient(project.clientName),
      scope: project.scope,
      status: project.status,
      confirmed: Boolean(confirmed),
      portfolioLinks: links
        .map((row) => row.storageKey)
        .filter((value): value is string => Boolean(value)),
    });
  }

  return {
    slug,
    name: user.name,
    craft: user.craft,
    visibility,
    verifiedProjectCount: visibility.showCounts ? total : null,
    deliveryRate: visibility.showCounts
      ? total === 0
        ? 0
        : Math.round((delivered / total) * 100)
      : null,
    clientConfirmations: visibility.showCounts ? Number(confirmRow?.value ?? 0) : null,
    portfolio: visibility.showPortfolio ? portfolio : null,
    showCheckout: visibility.showCheckout,
  };
}

/**
 * Parse stored visibility with defaults.
 */
function parseVisibility(value: unknown): TrustVisibility {
  const parsed = trustVisibilitySchema.safeParse(value ?? DEFAULT_TRUST_VISIBILITY);
  return parsed.success ? parsed.data : DEFAULT_TRUST_VISIBILITY;
}

/**
 * Public pages show a soft client label, not a full private name dump.
 */
function redactClient(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return `${parts[0]?.slice(0, 1) ?? "C"}.`;
  }
  return `${parts[0]} ${parts[parts.length - 1]?.slice(0, 1)}.`;
}
