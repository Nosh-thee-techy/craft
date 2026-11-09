/**
 * Purpose: Authenticated app chrome. Second line of defence after Proxy.
 * Inputs: child (app) pages; Auth.js session.
 * Outputs: sidebar + main, or a redirect to /login.
 */
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppNav } from "@/components/app-nav";

/**
 * Require a session before rendering any (app) route.
 */
export default async function AppLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const userName = session.user.name ?? session.user.email ?? "Creative";

  return (
    <div className="flex min-h-full">
      <AppNav userName={userName} />
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
