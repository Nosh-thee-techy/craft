/**
 * Purpose: Thin HTTP API for listing and creating projects.
 * Inputs: session cookie; POST JSON body validated with zod.
 * Outputs: project rows, or 401/400.
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createProjectSchema } from "@/lib/projects/schemas";
import { createProject, listProjects } from "@/lib/projects/service";

export const dynamic = "force-dynamic";

/**
 * GET /api/projects — current user's projects.
 */
export async function GET(): Promise<Response> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const rows = await listProjects(session.user.id);
  return NextResponse.json({ projects: rows });
}

/**
 * POST /api/projects — create a draft project.
 */
export async function POST(request: Request): Promise<Response> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json: unknown = await request.json().catch(() => null);
  const parsed = createProjectSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const project = await createProject(session.user.id, parsed.data);
  return NextResponse.json({ project }, { status: 201 });
}
