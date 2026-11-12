/**
 * Purpose: Layer 1 studio profile — stable creative surface + work proofs for the dashboard.
 * Inputs: signed-in user id.
 * Outputs: profile summary, verified link ownership, hash-bound work proofs, trust URL/QR.
 *
 * Wording: verified link ownership and work provenance — never "verified identity".
 * Work proofs are hash certificates (NFT-like provenance), not tradeable on-chain tokens yet.
 */
import "server-only";
import { and, count, desc, eq, isNotNull } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  deliverables,
  evidenceItems,
  linkedAccounts,
  projects,
  users,
} from "@/lib/db/schema";
import { env } from "@/lib/env";
import { proofTokenFromHash } from "@/lib/studio/proof-token";
import { trustQrDataUrl } from "@/lib/trust/qr";
import { getTrustSettings } from "@/lib/trust/service";

export type VerifiedLink = {
  platform: string;
  handle: string;
  url: string;
  verifiedAt: string;
};

export type WorkProof = {
  id: string;
  projectId: string;
  clientLabel: string;
  scope: string;
  sha256: string;
  deliveredAt: string | null;
  clientConfirmed: boolean;
  showOnTrust: boolean;
  /** Short public token id derived from the hash — certificate feel without a chain. */
  proofToken: string;
};

export type StudioProfile = {
  name: string | null;
  craft: string | null;
  country: string;
  email: string;
  publicSlug: string | null;
  trustUrl: string | null;
  qrDataUrl: string | null;
  verifiedLinks: VerifiedLink[];
  workProofs: WorkProof[];
  stats: {
    projectCount: number;
    deliveredCount: number;
    confirmedCount: number;
    verifiedLinkCount: number;
    publishedProofCount: number;
  };
  nextStep: {
    key: "onboarding" | "publish" | "bill" | "deliver" | "ready";
    title: string;
    body: string;
    href: string;
  };
};

/**
 * Load the Layer 1 studio profile for the signed-in creative.
 */
export async function getStudioProfile(userId: string): Promise<StudioProfile> {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) {
    throw new Error("User not found.");
  }

  const settings = await getTrustSettings(userId);
  const publicSlug = settings.publicSlug ?? user.publicSlug;
  const trustUrl = publicSlug ? `${env.APP_URL}/t/${publicSlug}` : null;
  const qrDataUrl = trustUrl ? await trustQrDataUrl(trustUrl) : null;

  const linkRows = await db
    .select()
    .from(linkedAccounts)
    .where(and(eq(linkedAccounts.userId, userId), eq(linkedAccounts.status, "verified")));

  const verifiedLinks: VerifiedLink[] = linkRows.map((row) => ({
    platform: row.platform,
    handle: row.handle,
    url: row.url,
    verifiedAt: row.verifiedAt?.toISOString() ?? row.updatedAt.toISOString(),
  }));

  const projectRows = await db
    .select()
    .from(projects)
    .where(eq(projects.userId, userId))
    .orderBy(desc(projects.updatedAt));

  const workProofs: WorkProof[] = [];
  for (const project of projectRows) {
    const rows = await db
      .select({
        deliverable: deliverables,
        sha256: evidenceItems.sha256,
      })
      .from(deliverables)
      .leftJoin(evidenceItems, eq(deliverables.evidenceItemId, evidenceItems.id))
      .where(eq(deliverables.projectId, project.id))
      .orderBy(desc(deliverables.deliveredAt));

    for (const row of rows) {
      if (!row.sha256) continue;
      workProofs.push({
        id: row.deliverable.id,
        projectId: project.id,
        clientLabel: project.clientName,
        scope: project.scope,
        sha256: row.sha256,
        deliveredAt: row.deliverable.deliveredAt?.toISOString() ?? null,
        clientConfirmed: Boolean(row.deliverable.clientConfirmedAt),
        showOnTrust: project.showOnTrust,
        proofToken: proofTokenFromHash(row.sha256),
      });
    }
  }

  const [confirmRow] = await db
    .select({ value: count() })
    .from(deliverables)
    .innerJoin(projects, eq(deliverables.projectId, projects.id))
    .where(and(eq(projects.userId, userId), isNotNull(deliverables.clientConfirmedAt)));

  const deliveredCount = projectRows.filter(
    (p) => p.status === "delivered" || p.status === "closed",
  ).length;

  const stats = {
    projectCount: projectRows.length,
    deliveredCount,
    confirmedCount: Number(confirmRow?.value ?? 0),
    verifiedLinkCount: verifiedLinks.length,
    publishedProofCount: workProofs.filter((p) => p.showOnTrust).length,
  };

  return {
    name: user.name,
    craft: user.craft,
    country: user.country,
    email: user.email,
    publicSlug,
    trustUrl,
    qrDataUrl,
    verifiedLinks,
    workProofs,
    stats,
    nextStep: pickNextStep({
      onboardingDone: Boolean(user.onboardingCompletedAt),
      publicSlug,
      verifiedLinkCount: stats.verifiedLinkCount,
      projectCount: stats.projectCount,
      workProofCount: workProofs.length,
      publishedProofCount: stats.publishedProofCount,
    }),
  };
}

/**
 * Public-facing trust extras for /t/[slug]: verified links + published work proofs.
 */
export async function getPublicProvenance(slug: string): Promise<{
  verifiedLinks: VerifiedLink[];
  workProofs: Array<Omit<WorkProof, "clientLabel" | "projectId" | "showOnTrust"> & { clientLabel: string }>;
} | null> {
  const [user] = await db.select().from(users).where(eq(users.publicSlug, slug)).limit(1);
  if (!user) return null;

  const linkRows = await db
    .select()
    .from(linkedAccounts)
    .where(and(eq(linkedAccounts.userId, user.id), eq(linkedAccounts.status, "verified")));

  const verifiedLinks: VerifiedLink[] = linkRows.map((row) => ({
    platform: row.platform,
    handle: row.handle,
    url: row.url,
    verifiedAt: row.verifiedAt?.toISOString() ?? row.updatedAt.toISOString(),
  }));

  const published = await db
    .select()
    .from(projects)
    .where(and(eq(projects.userId, user.id), eq(projects.showOnTrust, true)));

  const workProofs: Array<
    Omit<WorkProof, "clientLabel" | "projectId" | "showOnTrust"> & { clientLabel: string }
  > = [];

  for (const project of published) {
    const rows = await db
      .select({
        deliverable: deliverables,
        sha256: evidenceItems.sha256,
      })
      .from(deliverables)
      .leftJoin(evidenceItems, eq(deliverables.evidenceItemId, evidenceItems.id))
      .where(eq(deliverables.projectId, project.id))
      .orderBy(desc(deliverables.deliveredAt))
      .limit(1);

    const row = rows[0];
    if (!row?.sha256) continue;
    workProofs.push({
      id: row.deliverable.id,
      clientLabel: softClient(project.clientName),
      scope: project.scope,
      sha256: row.sha256,
      deliveredAt: row.deliverable.deliveredAt?.toISOString() ?? null,
      clientConfirmed: Boolean(row.deliverable.clientConfirmedAt),
      proofToken: proofTokenFromHash(row.sha256),
    });
  }

  return { verifiedLinks, workProofs };
}

/**
 * Build the shareable client-verify payload for a project bill screen.
 */
export async function getClientVerifyCard(userId: string): Promise<{
  trustUrl: string | null;
  qrDataUrl: string | null;
  publicSlug: string | null;
  verifiedLinkCount: number;
  publishedProofCount: number;
} | null> {
  const profile = await getStudioProfile(userId);
  return {
    trustUrl: profile.trustUrl,
    qrDataUrl: profile.qrDataUrl,
    publicSlug: profile.publicSlug,
    verifiedLinkCount: profile.stats.verifiedLinkCount,
    publishedProofCount: profile.stats.publishedProofCount,
  };
}

function softClient(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return `${parts[0]?.slice(0, 1) ?? "C"}.`;
  return `${parts[0]} ${parts[parts.length - 1]?.slice(0, 1)}.`;
}

function pickNextStep(input: {
  onboardingDone: boolean;
  publicSlug: string | null;
  verifiedLinkCount: number;
  projectCount: number;
  workProofCount: number;
  publishedProofCount: number;
}): StudioProfile["nextStep"] {
  if (!input.onboardingDone || input.verifiedLinkCount === 0) {
    return {
      key: "onboarding",
      title: "Stabilize your creative profile",
      body: "Finish onboarding and verify link ownership so clients can check who you are before they pay.",
      href: "/onboarding",
    };
  }
  if (!input.publicSlug || input.publishedProofCount === 0) {
    return {
      key: "publish",
      title: "Publish work proofs on your trust page",
      body: "Turn on visibility and mark projects to show. Clients scan your QR to verify provenance.",
      href: "/settings",
    };
  }
  if (input.projectCount === 0) {
    return {
      key: "bill",
      title: "Bill a client",
      body: "Your verify card is ready. Create a project and share the scan link before you send the PayPal bill.",
      href: "/projects",
    };
  }
  if (input.workProofCount === 0) {
    return {
      key: "deliver",
      title: "Deliver and mint a work proof",
      body: "After payment, hash the final file. That SHA-256 becomes your Work Proof Token certificate.",
      href: "/projects",
    };
  }
  return {
    key: "ready",
    title: "Layer 1 is live",
    body: "Profile, proofs, and client verify are ready. Bill the next client and grow confirmed deliveries.",
    href: "/projects",
  };
}
