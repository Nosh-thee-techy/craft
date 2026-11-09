/**
 * Purpose: Redirect to a signed download URL for one owned vault item.
 * Inputs: session cookie; evidence id in the path.
 * Outputs: 302 to the signed URL, or 401/404.
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { downloadUrlFor } from "@/lib/evidence/service";

export const dynamic = "force-dynamic";

type DownloadContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/evidence/[id]/download
 */
export async function GET(_request: Request, context: DownloadContext): Promise<Response> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await context.params;
  const url = await downloadUrlFor(session.user.id, id);
  if (!url) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  return NextResponse.redirect(url);
}
