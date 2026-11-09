/**
 * Purpose: Signed-in navigation for (app) routes.
 * Inputs: the current user's name/email.
 * Outputs: a sidebar of links plus a sign-out control.
 */
import Link from "next/link";
import { signOutAction } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/projects", label: "Projects" },
  { href: "/vault", label: "Vault" },
  { href: "/freeze-shield", label: "Freeze Shield" },
  { href: "/money", label: "Money" },
  { href: "/copilot", label: "Copilot" },
  { href: "/settings", label: "Settings" },
  { href: "/onboarding", label: "Onboarding" },
] as const;

type AppNavProps = {
  userName: string;
};

/**
 * Persistent nav for authenticated pages. Feature routes are shells until
 * their phase is implemented.
 */
export function AppNav({ userName }: AppNavProps) {
  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-border bg-card/40 p-4">
      <Link href="/dashboard" className="mb-6 text-sm font-semibold tracking-wide">
        CRAFT
      </Link>
      <nav className="flex flex-1 flex-col gap-1">
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          >
            {link.label}
          </Link>
        ))}
      </nav>
      <div className="mt-4 space-y-2 border-t border-border pt-4">
        <p className="truncate text-xs text-muted-foreground">{userName}</p>
        <form action={signOutAction}>
          <Button type="submit" variant="outline" size="sm" className="w-full">
            Sign out
          </Button>
        </form>
      </div>
    </aside>
  );
}
