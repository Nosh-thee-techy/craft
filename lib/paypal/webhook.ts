/**
 * Purpose: Verify a PayPal webhook, store it once, and mark the project funded.
 * Inputs: raw POST body + PayPal signature headers.
 * Outputs: { duplicate, handled } after idempotent processing.
 *
 * Confirmed 2026-11-09 against PayPal webhook docs:
 * - Verify: POST /v1/notifications/verify-webhook-signature
 *   (docs sample host is api.sandbox.paypal.com; we use api-m.sandbox.paypal.com).
 * - Invoice paid event name: INVOICING.INVOICE.PAID (resource.id is INV2-…).
 * - Capture event name: PAYMENT.CAPTURE.COMPLETED (resource.id is the capture id).
 *
 * Fail closed: unverified signatures are rejected. Duplicate event ids are ignored.
 */
import "server-only";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { env } from "@/lib/env";
import { db } from "@/lib/db/client";
import { invoices, payments, paypalEvents, projects } from "@/lib/db/schema";
import { proposeSplitsForProjectPayment } from "@/lib/ledger/service";
import { PAYPAL_VERIFY_PATH, paypalFetch } from "@/lib/paypal/client";

const moneySchema = z.object({
  currency_code: z.string().min(3),
  value: z.string().min(1),
});

const webhookEventSchema = z.object({
  id: z.string().min(1),
  event_type: z.string().min(1),
  resource: z.unknown(),
});

const invoicePaidResourceSchema = z.object({
  id: z.string().min(1),
  status: z.string().optional(),
  amount: moneySchema.optional(),
  payments: z
    .union([
      z.array(
        z.object({
          payment_id: z.string().optional(),
          amount: moneySchema.optional(),
        }),
      ),
      z.object({
        transactions: z
          .array(
            z.object({
              payment_id: z.string().optional(),
              amount: moneySchema.optional(),
            }),
          )
          .optional(),
      }),
    ])
    .optional(),
});

const captureCompletedResourceSchema = z.object({
  id: z.string().min(1),
  status: z.string().optional(),
  amount: moneySchema.optional(),
  invoice_id: z.string().optional(),
  custom_id: z.string().optional(),
  supplementary_data: z
    .object({
      related_ids: z
        .object({
          order_id: z.string().optional(),
        })
        .optional(),
    })
    .optional(),
});

export type WebhookHeaders = {
  transmissionId: string;
  transmissionTime: string;
  certUrl: string;
  authAlgo: string;
  transmissionSig: string;
};

export class WebhookVerifyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WebhookVerifyError";
  }
}

/**
 * Read the five PayPal signature headers. Missing any of them fails closed.
 */
export function readPaypalHeaders(request: Request): WebhookHeaders {
  const transmissionId = request.headers.get("paypal-transmission-id");
  const transmissionTime = request.headers.get("paypal-transmission-time");
  const certUrl = request.headers.get("paypal-cert-url");
  const authAlgo = request.headers.get("paypal-auth-algo");
  const transmissionSig = request.headers.get("paypal-transmission-sig");
  if (!transmissionId || !transmissionTime || !certUrl || !authAlgo || !transmissionSig) {
    throw new WebhookVerifyError("Missing PayPal signature headers.");
  }
  return { transmissionId, transmissionTime, certUrl, authAlgo, transmissionSig };
}

/**
 * Post the event back to PayPal's verify-webhook-signature API.
 * `webhook_event` is the parsed JSON object from the raw body (PayPal's postback method).
 */
export async function verifyPaypalSignature(
  rawBody: string,
  headers: WebhookHeaders,
  webhookEvent: unknown,
): Promise<void> {
  void rawBody;
  const webhookId = env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) {
    throw new WebhookVerifyError("PAYPAL_WEBHOOK_ID is not configured.");
  }

  const result = await paypalFetch<{ verification_status?: string }>(PAYPAL_VERIFY_PATH, {
    method: "POST",
    body: {
      transmission_id: headers.transmissionId,
      transmission_time: headers.transmissionTime,
      cert_url: headers.certUrl,
      auth_algo: headers.authAlgo,
      transmission_sig: headers.transmissionSig,
      webhook_id: webhookId,
      webhook_event: webhookEvent,
    },
  });

  if (result.verification_status !== "SUCCESS") {
    throw new WebhookVerifyError(
      `PayPal signature verification returned ${result.verification_status ?? "unknown"}.`,
    );
  }
}

/**
 * Insert the event id (unique). Returns false when this delivery is a duplicate.
 */
async function recordEventOnce(
  eventId: string,
  eventType: string,
  payload: unknown,
): Promise<boolean> {
  const inserted = await db
    .insert(paypalEvents)
    .values({
      eventId,
      eventType,
      payload,
    })
    .onConflictDoNothing({ target: paypalEvents.eventId })
    .returning({ eventId: paypalEvents.eventId });
  return inserted.length > 0;
}

/**
 * Record a payment and set the project to funded. Capture id is unique so
 * a second webhook (or a retry) cannot insert a second payment.
 */
async function fundProject(params: {
  projectId: string;
  invoiceId: string | null;
  amount: string;
  currency: string;
  captureId: string;
  source: string;
}): Promise<void> {
  const now = new Date();

  const [existingPayment] = await db
    .select({ id: payments.id })
    .from(payments)
    .where(eq(payments.projectId, params.projectId))
    .limit(1);

  // WHY skip a second insert: INVOICING.INVOICE.PAID and PAYMENT.CAPTURE.COMPLETED
  // can both fire for one sandbox payment, with different ids.
  if (!existingPayment) {
    await db
      .insert(payments)
      .values({
        projectId: params.projectId,
        paypalCaptureId: params.captureId,
        amount: params.amount,
        currency: params.currency,
        receivedAt: now,
        source: params.source,
      })
      .onConflictDoNothing({ target: payments.paypalCaptureId });
  }

  await db
    .update(projects)
    .set({ status: "funded", updatedAt: now })
    .where(and(eq(projects.id, params.projectId), eq(projects.status, "invoiced")));

  if (params.invoiceId) {
    await db
      .update(invoices)
      .set({ status: "paid", paidAt: now, updatedAt: now })
      .where(eq(invoices.id, params.invoiceId));
  }

  // Propose tax/savings/expenses once the payment exists. Idempotent on (payment, bucket).
  try {
    await proposeSplitsForProjectPayment({ projectId: params.projectId });
  } catch {
    // Funding must not fail if split rules are missing or invalid — Money UI can preview later.
  }
}

/**
 * INVOICING.INVOICE.PAID — resource.id is the PayPal invoice id.
 */
async function handleInvoicePaid(resource: unknown): Promise<void> {
  const parsed = invoicePaidResourceSchema.safeParse(resource);
  if (!parsed.success) {
    return;
  }

  const [invoice] = await db
    .select()
    .from(invoices)
    .where(eq(invoices.paypalInvoiceId, parsed.data.id))
    .limit(1);
  if (!invoice) {
    return;
  }

  const txn =
    Array.isArray(parsed.data.payments)
      ? parsed.data.payments[0]
      : parsed.data.payments?.transactions?.[0];

  const captureId = txn?.payment_id ?? `inv:${parsed.data.id}`;
  const amount = txn?.amount?.value ?? parsed.data.amount?.value ?? invoice.amount;
  const currency = txn?.amount?.currency_code ?? parsed.data.amount?.currency_code ?? invoice.currency;

  await fundProject({
    projectId: invoice.projectId,
    invoiceId: invoice.id,
    amount,
    currency,
    captureId,
    source: "paypal_invoice_paid",
  });
}

/**
 * PAYMENT.CAPTURE.COMPLETED — resource.id is the capture id.
 * We only fund a project when we can map the capture to a stored invoice
 * (invoice_id / custom_id = our project id). Unmapped captures are stored
 * as events but do not create payments.
 */
async function handleCaptureCompleted(resource: unknown): Promise<void> {
  const parsed = captureCompletedResourceSchema.safeParse(resource);
  if (!parsed.success) {
    return;
  }

  const paypalInvoiceId = parsed.data.invoice_id;
  const customId = parsed.data.custom_id;

  const invoice = paypalInvoiceId
    ? (
        await db
          .select()
          .from(invoices)
          .where(eq(invoices.paypalInvoiceId, paypalInvoiceId))
          .limit(1)
      )[0]
    : undefined;

  const project = !invoice && customId
    ? (await db.select().from(projects).where(eq(projects.id, customId)).limit(1))[0]
    : undefined;

  const projectId = invoice?.projectId ?? project?.id;
  if (!projectId) {
    return;
  }

  const amount = parsed.data.amount?.value ?? invoice?.amount ?? project?.amount;
  const currency = parsed.data.amount?.currency_code ?? invoice?.currency ?? project?.currency;
  if (!amount || !currency) {
    return;
  }

  await fundProject({
    projectId,
    invoiceId: invoice?.id ?? null,
    amount,
    currency,
    captureId: parsed.data.id,
    source: "paypal_capture_completed",
  });
}

/**
 * Verify, dedupe, then handle invoice-paid / capture-completed.
 */
export async function processPaypalWebhook(
  rawBody: string,
  headers: WebhookHeaders,
): Promise<{ duplicate: boolean; eventType: string }> {
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawBody) as unknown;
  } catch {
    throw new WebhookVerifyError("Webhook body is not JSON.");
  }

  await verifyPaypalSignature(rawBody, headers, parsedJson);

  const event = webhookEventSchema.parse(parsedJson);
  const isNew = await recordEventOnce(event.id, event.event_type, parsedJson);
  if (!isNew) {
    return { duplicate: true, eventType: event.event_type };
  }

  if (event.event_type === "INVOICING.INVOICE.PAID") {
    await handleInvoicePaid(event.resource);
  } else if (event.event_type === "PAYMENT.CAPTURE.COMPLETED") {
    await handleCaptureCompleted(event.resource);
  }

  return { duplicate: false, eventType: event.event_type };
}
