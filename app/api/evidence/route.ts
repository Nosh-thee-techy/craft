/**
 * Purpose: Thin HTTP API for listing vault items.
 * Inputs: session cookie; optional `projectId` query.
 * Outputs: evidence rows, or 401.
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { listEvidence } from "@/lib/evidence/service";

export const dynamic = "force-dynamic";

/**
 * GET /api/evidence — current user's vault ledger.
 */
export async function GET(request: Request): Promise<Response> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const projectId = new URL(request.url).searchParams.get("projectId") ?? undefined;
  const items = await listEvidence(session.user.id, projectId);
  return NextResponse.json({ items });
}
