/**
 * Purpose: Thin HTTP API for one project owned by the current user.
 * Inputs: route param `id` + session.
 * Outputs: project, invoices, and payments, or 404.
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getProjectForUser, listInvoices, listPayments } from "@/lib/projects/service";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/projects/:id
 */
export async function GET(_request: Request, context: RouteContext): Promise<Response> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const project = await getProjectForUser(session.user.id, id);
  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [invoiceRows, paymentRows] = await Promise.all([
    listInvoices(project.id),
    listPayments(project.id),
  ]);

  return NextResponse.json({
    project,
    invoices: invoiceRows,
    payments: paymentRows,
  });
}
