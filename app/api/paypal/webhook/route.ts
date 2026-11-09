/**
 * Purpose: PayPal webhook intake stub.
 * Inputs: PayPal POST (signature headers + JSON body) — ignored in Phase 0.
 * Outputs: 501 until Phase 1 implements verification + idempotent storage.
 *
 * Confirm endpoint paths and event names against PayPal's current docs in Phase 1
 * before handling INVOICING.INVOICE.PAID / PAYMENT.CAPTURE.COMPLETED.
 */
export const dynamic = "force-dynamic";

/**
 * Reject event processing until the Phase 1 round trip is implemented.
 * Returning 501 (not 200) avoids PayPal marking unverified events as delivered.
 */
export async function POST(): Promise<Response> {
  return Response.json(
    {
      ok: false,
      error: "PayPal webhook handling is not implemented until Phase 1.",
    },
    { status: 501 },
  );
}
