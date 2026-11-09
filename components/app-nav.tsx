/**
 * Purpose: Signed-in studio rail with active states and glass chrome.
 * Inputs: the current user's name; current pathname.
 * Outputs: a floating sidebar on desktop and a scrolling strip on mobile.
 */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Archive,
  Compass,
  FolderKanban,
  LayoutDashboard,
  Settings,
  Shield,
  Sparkles,
  Wallet,
} from "lucide-react";
import { signOutAction } from "@/lib/auth/actions";
import { BrandMark } from "@/components/brand/mark";
import { ThemeToggle } from "@/components/brand/theme-toggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/vault", label: "Vault", icon: Archive },
  { href: "/freeze-shield", label: "Freeze Shield", icon: Shield },
  { href: "/money", label: "Money", icon: Wallet },
  { href: "/copilot", label: "Copilot", icon: Sparkles },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/onboarding", label: "Onboarding", icon: Compass },
] as const;

type AppNavProps = {
  userName: string;
};

/**
 * Persistent nav for authenticated pages. Feature routes are shells until
 * their phase is implemented.
 */
export function AppNav({ userName }: AppNavProps) {
  const pathname = usePathname();

  return (
    <>
      <aside className="glass hidden w-64 shrink-0 flex-col rounded-[28px] p-5 md:flex">
        <BrandMark href="/dashboard" size="sm" className="mb-8 px-1" />
        <nav className="flex flex-1 flex-col gap-1">
          {LINKS.map((link) => (
            <NavLink key={link.href} {...link} active={isActive(pathname, link.href)} />
          ))}
        </nav>
        <SignOut userName={userName} />
      </aside>

      <div className="glass flex max-w-full items-center gap-1 overflow-x-auto rounded-[22px] p-2 md:hidden">
        <BrandMark href="/dashboard" size="sm" className="shrink-0 px-1" />
        <nav className="flex min-w-0 flex-1 gap-0.5">
          {LINKS.map((link) => (
            <NavLink key={link.href} {...link} compact active={isActive(pathname, link.href)} />
          ))}
        </nav>
        <ThemeToggle />
        <form action={signOutAction} className="shrink-0">
          <Button type="submit" variant="ghost" size="sm">
            Out
          </Button>
        </form>
      </div>
    </>
  );
}

type NavLinkProps = (typeof LINKS)[number] & {
  active: boolean;
  compact?: boolean;
};

/**
 * One studio-room link. Gold when you are in the room.
 */
function NavLink({ href, label, icon: Icon, active, compact }: NavLinkProps) {
  return (
    <Link
      href={href}
      aria-label={label}
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm transition",
        compact && "shrink-0 px-2.5",
        active
          ? "bg-primary/18 text-primary"
          : "text-muted-foreground hover:bg-foreground/8 hover:text-foreground",
      )}
    >
      <Icon className="size-4 shrink-0" strokeWidth={1.7} />
      <span className={cn(compact ? "hidden sm:inline sm:whitespace-nowrap" : undefined)}>
        {label}
      </span>
    </Link>
  );
}

/**
 * Name + sign-out, used on the desktop rail.
 */
function SignOut({ userName }: { userName: string }) {
  return (
    <div className="mt-4 space-y-3 border-t border-border pt-4">
      <div className="flex items-center justify-between gap-2 px-1">
        <p className="truncate text-xs text-muted-foreground">{userName}</p>
        <ThemeToggle />
      </div>
      <form action={signOutAction}>
        <Button type="submit" variant="outline" size="sm" className="w-full">
          Sign out
        </Button>
      </form>
    </div>
  );
}

/**
 * Treat nested project routes as still inside Projects.
 */
function isActive(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
