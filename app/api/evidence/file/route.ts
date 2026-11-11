/**
 * Purpose: Serve one vault object after verifying the HMAC-signed query.
 * Inputs: `key`, `exp`, `sig` query params from `signEvidenceUrl`.
 * Outputs: the file bytes, or 400/401/404.
 *
 * WHY not a public bucket: evidence is private. The signature expires.
 */
import { NextResponse } from "next/server";
import { getEvidenceObject, verifyLocalSignature } from "@/lib/evidence/storage";

export const dynamic = "force-dynamic";

/**
 * GET /api/evidence/file?key=&exp=&sig=
 */
export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const key = url.searchParams.get("key") ?? "";
  const exp = url.searchParams.get("exp") ?? "";
  const sig = url.searchParams.get("sig") ?? "";

  if (!verifyLocalSignature(key, exp, sig)) {
    return NextResponse.json({ error: "This download link is invalid or expired." }, { status: 401 });
  }

  try {
    const object = await getEvidenceObject(key);
    const fileName = key.split("/").pop() || "download";
    return new NextResponse(new Uint8Array(object.bytes), {
      headers: {
        "Content-Type": object.contentType,
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }
}
