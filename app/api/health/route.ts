/**
 * Purpose: Liveness endpoint for Render and local smoke tests.
 * Inputs: GET with no body. Does not require auth or a healthy database.
 * Outputs: JSON `{ ok: true, service, time }`.
 */
export const dynamic = "force-dynamic";

/**
 * Return OK so a blank deploy is reachable before PayPal or Postgres is wired.
 */
export async function GET(): Promise<Response> {
  return Response.json({
    ok: true,
    service: "craft",
    time: new Date().toISOString(),
  });
}
