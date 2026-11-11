/**
 * Purpose: Drizzle schema for every CRAFT table listed in CRAFT_BUILD_PLAN.md §4.
 * Inputs: none (declarative table definitions).
 * Outputs: typed table objects used by queries, migrations, and Auth.js.
 *
 * WHY uuid PKs: IDs appear in public URLs (trust slugs, confirm tokens later)
 * and must not leak a row count. WHY numeric for money: never store currency
 * in floating point. WHY created_at/updated_at on every table: audit trail.
 */
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  vector,
} from "drizzle-orm/pg-core";

/** Shared created/updated timestamps. Application code must bump updated_at on writes. */
const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

export const projectStatusEnum = pgEnum("project_status", [
  "draft",
  "invoiced",
  "funded",
  "delivered",
  "closed",
]);

export const evidenceTypeEnum = pgEnum("evidence_type", [
  "contract",
  "invoice",
  "payment",
  "deliverable",
  "comms",
  "portfolio_link",
]);

export const linkedAccountStatusEnum = pgEnum("linked_account_status", [
  "pending",
  "verified",
  "failed",
]);

export const ledgerBucketEnum = pgEnum("ledger_bucket", [
  "tax",
  "savings",
  "expenses",
]);

export const packStatusEnum = pgEnum("pack_status", [
  "draft",
  "verified",
  "approved",
  "exported",
]);

/**
 * Creative accounts. `passwordHash` is not in the plan table list; it is
 * required for Auth.js email+password login in Phase 0 (no mail provider yet).
 */
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    email: text("email").notNull(),
    name: text("name"),
    craft: text("craft"),
    country: text("country").notNull().default("KE"),
    passwordHash: text("password_hash"),
    /** Public /t/[slug] handle. Null until the creative opens a trust page. */
    publicSlug: text("public_slug"),
    /**
     * What the trust page is allowed to show. Stored as JSON so Phase 5
     * settings can deepen it without another migration.
     */
    trustVisibilityJson: jsonb("trust_visibility_json"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("users_email_uidx").on(table.email),
    uniqueIndex("users_public_slug_uidx").on(table.publicSlug),
  ],
);

/** External profiles whose link ownership can be challenged (Phase 5). */
export const linkedAccounts = pgTable(
  "linked_accounts",
  {
    id: uuid("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    platform: text("platform").notNull(),
    handle: text("handle").notNull(),
    url: text("url").notNull(),
    challengeCode: text("challenge_code"),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    status: linkedAccountStatusEnum("status").notNull().default("pending"),
    ...timestamps,
  },
  (table) => [
    index("linked_accounts_user_idx").on(table.userId),
    uniqueIndex("linked_accounts_user_platform_handle_uidx").on(
      table.userId,
      table.platform,
      table.handle,
    ),
  ],
);

/** A piece of paid work with one client. `trustSlug` powers the public /t/[slug] page. */
export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    clientName: text("client_name").notNull(),
    clientEmail: text("client_email").notNull(),
    scope: text("scope").notNull(),
    currency: text("currency").notNull().default("USD"),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    status: projectStatusEnum("status").notNull().default("draft"),
    trustSlug: text("trust_slug").notNull(),
    /** Creative must opt a project into the public trust portfolio. */
    showOnTrust: boolean("show_on_trust").notNull().default(false),
    ...timestamps,
  },
  (table) => [
    index("projects_user_idx").on(table.userId),
    uniqueIndex("projects_trust_slug_uidx").on(table.trustSlug),
  ],
);

/** PayPal Invoicing API records tied to a project. */
export const invoices = pgTable(
  "invoices",
  {
    id: uuid("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    paypalInvoiceId: text("paypal_invoice_id"),
    status: text("status").notNull().default("draft"),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    currency: text("currency").notNull().default("USD"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index("invoices_project_idx").on(table.projectId),
    uniqueIndex("invoices_paypal_invoice_id_uidx").on(table.paypalInvoiceId),
  ],
);

/**
 * Money received. `paypalCaptureId` is unique so duplicate webhook deliveries
 * cannot insert a second payment even if application-level idempotency misses.
 */
export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    paypalCaptureId: text("paypal_capture_id"),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    currency: text("currency").notNull().default("USD"),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
    source: text("source").notNull(),
    ...timestamps,
  },
  (table) => [
    index("payments_project_idx").on(table.projectId),
    uniqueIndex("payments_paypal_capture_id_uidx").on(table.paypalCaptureId),
  ],
);

/**
 * Raw PayPal webhook events. `eventId` unique constraint is the idempotency key:
 * insert, and on conflict do nothing.
 */
export const paypalEvents = pgTable(
  "paypal_events",
  {
    id: uuid("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    eventId: text("event_id").notNull(),
    eventType: text("event_type").notNull(),
    payload: jsonb("payload").notNull(),
    processedAt: timestamp("processed_at", { withTimezone: true }).notNull().defaultNow(),
    ...timestamps,
  },
  (table) => [uniqueIndex("paypal_events_event_id_uidx").on(table.eventId)],
);

/** Vault items. The AI may only read these; it never creates rows. */
export const evidenceItems = pgTable(
  "evidence_items",
  {
    id: uuid("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    type: evidenceTypeEnum("type").notNull(),
    storageKey: text("storage_key"),
    sha256: text("sha256"),
    extractedText: text("extracted_text"),
    extractedJson: jsonb("extracted_json"),
    addedBy: uuid("added_by").references(() => users.id, { onDelete: "set null" }),
    addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
    ...timestamps,
  },
  (table) => [index("evidence_items_project_idx").on(table.projectId)],
);

/** Final files delivered to a client, with optional one-click confirmation. */
export const deliverables = pgTable(
  "deliverables",
  {
    id: uuid("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    evidenceItemId: uuid("evidence_item_id").references(() => evidenceItems.id, {
      onDelete: "set null",
    }),
    /** Opaque public token for /c/[token]. Never reuse project or evidence ids. */
    confirmToken: text("confirm_token").notNull(),
    /** Public or client-facing links the creative chose to publish with the delivery. */
    publishLinksJson: jsonb("publish_links_json"),
    /** AI match of deliverable text vs invoice/scope. Never invents files. */
    matchCheckJson: jsonb("match_check_json"),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    clientConfirmedAt: timestamp("client_confirmed_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index("deliverables_project_idx").on(table.projectId),
    uniqueIndex("deliverables_confirm_token_uidx").on(table.confirmToken),
  ],
);

/** Pasted PayPal limitation notices (Phase 3). */
export const limitationNotices = pgTable(
  "limitation_notices",
  {
    id: uuid("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    rawText: text("raw_text").notNull(),
    parsedJson: jsonb("parsed_json"),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
    ...timestamps,
  },
  (table) => [index("limitation_notices_user_idx").on(table.userId)],
);

/** Reviewable Freeze Shield packs. Export stays disabled until verifier + user approve. */
export const responsePacks = pgTable(
  "response_packs",
  {
    id: uuid("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    noticeId: uuid("notice_id")
      .notNull()
      .references(() => limitationNotices.id, { onDelete: "cascade" }),
    status: packStatusEnum("status").notNull().default("draft"),
    pdfKey: text("pdf_key"),
    verifierReportJson: jsonb("verifier_report_json"),
    ...timestamps,
  },
  (table) => [index("response_packs_notice_idx").on(table.noticeId)],
);

/** User-approved split percentages. Percentages are applied in deterministic code only. */
export const splitRules = pgTable(
  "split_rules",
  {
    id: uuid("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    taxPct: numeric("tax_pct", { precision: 5, scale: 2 }).notNull(),
    savingsPct: numeric("savings_pct", { precision: 5, scale: 2 }).notNull(),
    expensesPct: numeric("expenses_pct", { precision: 5, scale: 2 }).notNull(),
    ...timestamps,
  },
  (table) => [uniqueIndex("split_rules_user_uidx").on(table.userId)],
);

/** Allocations of a payment into tax / savings / expenses buckets. */
export const ledgerEntries = pgTable(
  "ledger_entries",
  {
    id: uuid("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    paymentId: uuid("payment_id")
      .notNull()
      .references(() => payments.id, { onDelete: "cascade" }),
    bucket: ledgerBucketEnum("bucket").notNull(),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    ...timestamps,
  },
  (table) => [
    index("ledger_entries_user_idx").on(table.userId),
    index("ledger_entries_payment_idx").on(table.paymentId),
  ],
);

/**
 * Days-to-pay observations. Demo rows must set `isSynthetic` so the forecast
 * never pretends a labelled fixture is a live PayPal history.
 */
export const clientPaymentHistory = pgTable(
  "client_payment_history",
  {
    id: uuid("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    clientName: text("client_name").notNull(),
    invoiceDate: timestamp("invoice_date", { withTimezone: true }).notNull(),
    paidDate: timestamp("paid_date", { withTimezone: true }),
    isSynthetic: boolean("is_synthetic").notNull().default(false),
    ...timestamps,
  },
  (table) => [index("client_payment_history_user_idx").on(table.userId)],
);

/** Snapshots of the income stability and trust score (never called a credit score). */
export const scoreSnapshots = pgTable(
  "score_snapshots",
  {
    id: uuid("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    score: integer("score").notNull(),
    componentsJson: jsonb("components_json").notNull(),
    ...timestamps,
  },
  (table) => [index("score_snapshots_user_idx").on(table.userId)],
);

/** Monthly buffer / debt / investing plan. Numbers come from code; `explanation` is LLM prose. */
export const plans = pgTable(
  "plans",
  {
    id: uuid("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    month: text("month").notNull(),
    bufferTarget: numeric("buffer_target", { precision: 12, scale: 2 }).notNull(),
    stepsJson: jsonb("steps_json").notNull(),
    explanation: text("explanation"),
    ...timestamps,
  },
  (table) => [
    index("plans_user_idx").on(table.userId),
    uniqueIndex("plans_user_month_uidx").on(table.userId, table.month),
  ],
);

/**
 * Append-only log of every agent action. Application code must INSERT only —
 * never UPDATE or DELETE. `updatedAt` exists because the plan requires it on
 * every table; it stays equal to createdAt.
 */
export const agentActions = pgTable(
  "agent_actions",
  {
    id: uuid("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    inputJson: jsonb("input_json").notNull(),
    outputJson: jsonb("output_json"),
    verifierPassed: boolean("verifier_passed"),
    approvedByUser: boolean("approved_by_user").notNull().default(false),
    ...timestamps,
  },
  (table) => [index("agent_actions_user_idx").on(table.userId)],
);

/** Embedded chunks of uploaded evidence text for retrieval. Dimensions match the embedding model. */
export const docChunks = pgTable(
  "doc_chunks",
  {
    id: uuid("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    evidenceItemId: uuid("evidence_item_id")
      .notNull()
      .references(() => evidenceItems.id, { onDelete: "cascade" }),
    chunkText: text("chunk_text").notNull(),
    embedding: vector("embedding", { dimensions: 1536 }),
    ...timestamps,
  },
  (table) => [
    index("doc_chunks_user_idx").on(table.userId),
    index("doc_chunks_evidence_idx").on(table.evidenceItemId),
  ],
);
