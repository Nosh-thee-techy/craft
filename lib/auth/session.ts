/**
 * Purpose: Load the signed-in user id for protected server code.
 * Inputs: Auth.js session cookie.
 * Outputs: user id, or a redirect to /login.
 */
import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

/**
 * Require an authenticated session and return its user id.
 */
export async function requireUserId(): Promise<string> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    redirect("/login");
  }
  return userId;
}
