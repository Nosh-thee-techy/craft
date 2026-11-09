/**
 * Purpose: Sun/moon control that switches dusk and white studio modes.
 * Inputs: next-themes resolved theme; optional visible label.
 * Outputs: a control people can find on the landing page; spacer until mounted.
 */
"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

type ThemeToggleProps = {
  labeled?: boolean;
};

/**
 * True only after client hydration — theme cannot be known on the server.
 */
function useIsClient() {
  return useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
}

/**
 * Toggle between dusk (dark) and light (white). Landing uses the labeled version.
 */
export function ThemeToggle({ labeled = false }: ThemeToggleProps) {
  const isClient = useIsClient();
  const { resolvedTheme, setTheme } = useTheme();

  if (!isClient) {
    return (
      <span
        className={labeled ? "inline-block h-9 w-24" : "inline-block size-10"}
        aria-hidden="true"
      />
    );
  }

  const light = resolvedTheme === "light";

  return (
    <Button
      type="button"
      variant={labeled ? "outline" : "ghost"}
      size={labeled ? "sm" : "icon"}
      aria-label={light ? "Switch to dark mode" : "Switch to light mode"}
      onClick={() => setTheme(light ? "dark" : "light")}
    >
      {light ? <Moon strokeWidth={1.7} /> : <Sun strokeWidth={1.7} />}
      {labeled ? <span>{light ? "Dark" : "Light"}</span> : null}
    </Button>
  );
}
