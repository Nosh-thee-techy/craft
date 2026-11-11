/**
 * Purpose: Seed the judge demo creative (Phase 7).
 * Inputs: data/seed/demo-creative.json + DATABASE_URL / .env.local.
 * Outputs: one user with 5 projects, evidence (with gaps), payments,
 * synthetic payment history, and a pasted limitation notice.
 *
 * Idempotent: deletes the previous judge@craft.demo user (cascade) then re-inserts.
 * Run: npm run db:seed
 */
import { createHash, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../lib/db/schema";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

type SeedProject = {
  key: string;
  clientName: string;
  clientEmail: string;
  scope: string;
  currency: string;
  amount: string;
  status: "draft" | "invoiced" | "funded" | "delivered" | "closed";
  showOnTrust: boolean;
  evidence: string[];
  payment: { amount: string; monthsAgo: number; source: string } | null;
  deliverable?: { confirmed: boolean };
};

type SeedFile = {
  user: {
    email: string;
    password: string;
    name: string;
    craft: string;
    country: string;
    publicSlug: string;
  };
  splitRules: { taxPct: string; savingsPct: string; expensesPct: string };
  plannerInputs: {
    currency: string;
    monthlyEssentialExpenses: string;
    currentBuffer: string;
    debtsJson: { label: string; balance: string; minMonthly: string; aprPct: number }[];
  };
  projects: SeedProject[];
  syntheticPaymentHistory: {
    clientName: string;
    invoiceDaysAgo: number;
    paidDaysAfter: number | null;
  }[];
  limitationNoticeFile: string;
};

/**
 * Load KEY=value pairs without overriding process.env.
 */
function loadEnvFile(fileName: string): void {
  const path = resolve(root, fileName);
  if (!existsSync(path)) {
    return;
  }
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) {
      continue;
    }
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

/**
 * Hex SHA-256 of UTF-8 text (seed files are plain text).
 */
function sha256Hex(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

/**
 * Trust slug like the app: slugified client name + short uuid.
 */
function makeTrustSlug(clientName: string): string {
  const base = clientName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 24);
  return `${base || "project"}-${randomUUID().slice(0, 8)}`;
}

/**
 * Months ago → Date at mid-month UTC.
 */
function monthsAgoDate(monthsAgo: number): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - monthsAgo, 12, 10, 0, 0));
}

/**
 * Days ago → Date.
 */
function daysAgoDate(daysAgo: number): Date {
  return new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
}

/**
 * Sample extracted text for a checklist type so the verifier has source material.
 */
function sampleText(type: string, project: SeedProject): string {
  const lines: Record<string, string> = {
    contract: `Agreement between ${project.clientName} and Amina Otieno studio. Scope: ${project.scope}`,
    invoice: `Invoice for ${project.clientName}. Amount ${project.amount} ${project.currency}. Itemised photography services.`,
    payment: `PayPal payout receipt for ${project.amount} ${project.currency} from ${project.clientEmail}.`,
    deliverable: `Final deliverable gallery for ${project.clientName}. Edited files delivered.`,
    comms: `Email thread with ${project.clientEmail} confirming dates and delivery.`,
    portfolio_link: `https://amina-studio.example/portfolio/${project.key}`,
  };
  return lines[type] ?? `${type} for ${project.clientName}`;
}

/**
 * Seed the demo creative. Safe to re-run.
 */
async function main(): Promise<void> {
  loadEnvFile(".env");
  loadEnvFile(".env.local");
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is required to seed.");
  }

  const seed = JSON.parse(
    readFileSync(join(root, "data/seed/demo-creative.json"), "utf8"),
  ) as SeedFile;
  const noticeText = readFileSync(join(root, seed.limitationNoticeFile), "utf8");

  const isLocal = url.includes("localhost") || url.includes("127.0.0.1");
  const sql = postgres(url, { max: 1, ssl: isLocal ? false : "require" });
  const db = drizzle(sql, { schema });

  const existing = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.email, seed.user.email))
    .limit(1);
  if (existing[0]) {
    await db.delete(schema.users).where(eq(schema.users.id, existing[0].id));
  }

  const passwordHash = await bcrypt.hash(seed.user.password, 12);
  const [user] = await db
    .insert(schema.users)
    .values({
      email: seed.user.email,
      name: seed.user.name,
      craft: seed.user.craft,
      country: seed.user.country,
      passwordHash,
      publicSlug: seed.user.publicSlug,
      onboardingCompletedAt: new Date(),
      trustVisibilityJson: {
        showCounts: true,
        showPortfolio: true,
        showCheckout: true,
      },
      profileDraftApprovedAt: new Date(),
    })
    .returning();
  if (!user) {
    throw new Error("Failed to insert demo user.");
  }

  await db.insert(schema.splitRules).values({
    userId: user.id,
    taxPct: seed.splitRules.taxPct,
    savingsPct: seed.splitRules.savingsPct,
    expensesPct: seed.splitRules.expensesPct,
  });

  await db.insert(schema.plannerInputs).values({
    userId: user.id,
    currency: seed.plannerInputs.currency,
    monthlyEssentialExpenses: seed.plannerInputs.monthlyEssentialExpenses,
    currentBuffer: seed.plannerInputs.currentBuffer,
    debtsJson: seed.plannerInputs.debtsJson,
  });

  const vaultRoot = join(root, ".data", "vault", user.id);
  mkdirSync(vaultRoot, { recursive: true });

  for (const project of seed.projects) {
    const [row] = await db
      .insert(schema.projects)
      .values({
        userId: user.id,
        clientName: project.clientName,
        clientEmail: project.clientEmail,
        scope: project.scope,
        currency: project.currency,
        amount: project.amount,
        status: project.status,
        trustSlug: makeTrustSlug(project.clientName),
        showOnTrust: project.showOnTrust,
      })
      .returning();
    if (!row) {
      throw new Error(`Failed to insert project ${project.key}`);
    }

    let deliverableEvidenceId: string | null = null;

    for (const type of project.evidence) {
      const body =
        type === "portfolio_link"
          ? sampleText(type, project)
          : `${sampleText(type, project)}\n\nSeeded for CRAFT Phase 7 demo.`;
      const digest = sha256Hex(body);
      const fileName = type === "portfolio_link" ? body : `${project.key}-${type}.txt`;
      const storageKey =
        type === "portfolio_link" ? body : `${user.id}/${row.id}/${fileName}`;

      if (type !== "portfolio_link") {
        const path = join(root, ".data", "vault", storageKey);
        mkdirSync(dirname(path), { recursive: true });
        writeFileSync(path, body, "utf8");
      }

      const [item] = await db
        .insert(schema.evidenceItems)
        .values({
          projectId: row.id,
          type: type as schema.evidenceItems.$inferInsert["type"],
          storageKey,
          sha256: digest,
          extractedText: body,
          addedBy: user.id,
        })
        .returning();
      if (item && type === "deliverable") {
        deliverableEvidenceId = item.id;
      }
    }

    if (project.payment) {
      const receivedAt = monthsAgoDate(project.payment.monthsAgo);
      await db.insert(schema.payments).values({
        projectId: row.id,
        paypalCaptureId: `SEED-${project.key}-${randomUUID().slice(0, 8)}`,
        amount: project.payment.amount,
        currency: project.currency,
        receivedAt,
        source: project.payment.source,
        refundedAmount: "0",
        disputeStatus: "none",
      });
    }

    if (project.deliverable) {
      const deliveredAt = monthsAgoDate(1);
      await db.insert(schema.deliverables).values({
        projectId: row.id,
        evidenceItemId: deliverableEvidenceId,
        confirmToken: randomUUID().replace(/-/g, ""),
        deliveredAt,
        clientConfirmedAt: project.deliverable.confirmed
          ? new Date(deliveredAt.getTime() + 86_400_000)
          : null,
        publishLinksJson: [],
      });
    }
  }

  for (const hist of seed.syntheticPaymentHistory) {
    const invoiceDate = daysAgoDate(hist.invoiceDaysAgo);
    const paidDate =
      hist.paidDaysAfter === null
        ? null
        : new Date(invoiceDate.getTime() + hist.paidDaysAfter * 86_400_000);
    await db.insert(schema.clientPaymentHistory).values({
      userId: user.id,
      clientName: hist.clientName,
      invoiceDate,
      paidDate,
      isSynthetic: true,
    });
  }

  await db.insert(schema.limitationNotices).values({
    userId: user.id,
    rawText: noticeText,
    parsedJson: null,
  });

  await sql.end();

  console.log(
    JSON.stringify(
      {
        ok: true,
        email: seed.user.email,
        password: seed.user.password,
        publicSlug: seed.user.publicSlug,
        projects: seed.projects.length,
        note: "Synthetic payment history rows are labelled is_synthetic=true.",
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
