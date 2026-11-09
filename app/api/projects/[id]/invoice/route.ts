/**
 * Purpose: Thin HTTP API to create and send a PayPal sandbox invoice.
 * Inputs: route param `id` + session.
 * Outputs: PayPal invoice id, or 4xx with a user-facing error.
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createAndSendInvoice } from "@/lib/paypal/invoices";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/projects/:id/invoice
 */
export async function POST(_request: Request, context: RouteContext): Promise<Response> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  try {
    const result = await createAndSendInvoice(session.user.id, id);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not send the invoice.";
    const status = message.includes("not found") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
