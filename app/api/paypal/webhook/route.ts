/**
 * Purpose: PayPal sandbox webhook intake.
 * Inputs: raw JSON body + signature headers from PayPal.
 * Outputs: 200 after verify + idempotent store; 400/401 on bad signatures.
 *
 * Event names confirmed 2026-11-09:
 * - INVOICING.INVOICE.PAID
 * - PAYMENT.CAPTURE.COMPLETED
 * Unhandled event types are still stored (once) and acknowledged with 200 so
 * PayPal does not retry them for 3 days.
 */
import { NextResponse } from "next/server";
import {
  processPaypalWebhook,
  readPaypalHeaders,
  WebhookVerifyError,
} from "@/lib/paypal/webhook";
import { PayPalApiError } from "@/lib/paypal/client";

export const dynamic = "force-dynamic";

/**
 * Verify, insert paypal_events (unique event id), then fund the project.
 */
export async function POST(request: Request): Promise<Response> {
  const rawBody = await request.text();

  try {
    const headers = readPaypalHeaders(request);
    const result = await processPaypalWebhook(rawBody, headers);
    return NextResponse.json({
      ok: true,
      duplicate: result.duplicate,
      eventType: result.eventType,
    });
  } catch (error) {
    if (error instanceof WebhookVerifyError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }
    if (error instanceof PayPalApiError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 502 });
    }
    const message = error instanceof Error ? error.message : "Webhook failed.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
