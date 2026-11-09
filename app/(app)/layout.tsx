/**
 * Purpose: Authenticated studio chrome. Second line of defence after Proxy.
 * Inputs: child (app) pages; Auth.js session.
 * Outputs: floating glass rail + canvas, or a redirect to /login.
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
    <div className="flex min-h-dvh min-w-0 flex-col gap-2 p-2 md:h-dvh md:flex-row md:gap-3 md:overflow-hidden md:p-4">
      <AppNav userName={userName} />
      <main className="studio-floor min-h-0 min-w-0 flex-1 overflow-auto rounded-[22px] p-4 md:rounded-[28px] md:p-10">
        {children}
      </main>
    </div>
  );
}
