/**
 * Purpose: Signed-in studio rail — collapsible on desktop, compact strip on mobile.
 * Inputs: the current user's name; current pathname.
 * Outputs: icon+label rail (or icons-only when collapsed). Preference in localStorage.
 */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Archive,
  Compass,
  FolderKanban,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
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

const NAV_KEY = "craft-nav-collapsed";

const LINKS = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/vault", label: "Vault", icon: Archive },
  { href: "/freeze-shield", label: "Freeze", icon: Shield },
  { href: "/money", label: "Money", icon: Wallet },
  { href: "/copilot", label: "Copilot", icon: Sparkles },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/onboarding", label: "Setup", icon: Compass },
] as const;

/**
 * Read collapse preference once on the client (SSR stays expanded).
 */
function readCollapsed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(NAV_KEY) === "1";
  } catch {
    return false;
  }
}

type AppNavProps = {
  userName: string;
};

/**
 * Persistent nav. Collapse to icons on desktop to give the studio floor more room.
 */
export function AppNav({ userName }: AppNavProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(readCollapsed);

  /**
   * Toggle and remember the desktop rail width.
   */
  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(NAV_KEY, next ? "1" : "0");
      } catch {
        // Preference is best-effort.
      }
      return next;
    });
  }

  return (
    <>
      <aside
        className={cn(
          "glass hidden shrink-0 flex-col rounded-[28px] transition-[width] duration-200 md:flex",
          collapsed ? "w-[4.75rem] p-3" : "w-64 p-5",
        )}
      >
        <div
          className={cn(
            "mb-6 flex items-center gap-2",
            collapsed ? "flex-col px-0" : "justify-between px-1",
          )}
        >
          {!collapsed ? <BrandMark href="/dashboard" size="sm" /> : null}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="shrink-0"
            onClick={toggleCollapsed}
            aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
            aria-expanded={!collapsed}
          >
            {collapsed ? (
              <PanelLeftOpen className="size-4" strokeWidth={1.7} />
            ) : (
              <PanelLeftClose className="size-4" strokeWidth={1.7} />
            )}
          </Button>
          {collapsed ? (
            <Link
              href="/dashboard"
              aria-label="CRAFT home"
              className="font-display text-sm tracking-tight text-primary"
            >
              C
            </Link>
          ) : null}
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          {LINKS.map((link) => (
            <NavLink
              key={link.href}
              {...link}
              collapsed={collapsed}
              active={isActive(pathname, link.href)}
            />
          ))}
        </nav>
        <SignOut userName={userName} collapsed={collapsed} />
      </aside>

      <div className="glass flex max-w-full items-center gap-1 overflow-x-auto rounded-[22px] p-2 md:hidden">
        <BrandMark href="/dashboard" size="sm" className="shrink-0 px-1" />
        <nav className="flex min-w-0 flex-1 gap-0.5">
          {LINKS.map((link) => (
            <NavLink
              key={link.href}
              {...link}
              compact
              active={isActive(pathname, link.href)}
            />
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
  collapsed?: boolean;
};

/**
 * One studio-room link. Gold when you are in the room.
 */
function NavLink({ href, label, icon: Icon, active, compact, collapsed }: NavLinkProps) {
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm transition",
        compact && "shrink-0 px-2.5",
        collapsed && "justify-center px-2",
        active
          ? "bg-primary/18 text-primary"
          : "text-muted-foreground hover:bg-foreground/8 hover:text-foreground",
      )}
    >
      <Icon className="size-4 shrink-0" strokeWidth={1.7} />
      <span
        className={cn(
          compact ? "hidden sm:inline sm:whitespace-nowrap" : undefined,
          collapsed && "sr-only",
        )}
      >
        {label}
      </span>
    </Link>
  );
}

/**
 * Name + sign-out, used on the desktop rail.
 */
function SignOut({ userName, collapsed }: { userName: string; collapsed?: boolean }) {
  if (collapsed) {
    return (
      <div className="mt-4 space-y-2 border-t border-border pt-3">
        <ThemeToggle />
        <form action={signOutAction}>
          <Button type="submit" variant="ghost" size="sm" className="w-full px-0" title="Sign out">
            Out
          </Button>
        </form>
      </div>
    );
  }

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
