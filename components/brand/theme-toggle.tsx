/**
 * Purpose: Sun/moon control that switches dusk and white studio modes.
 * Inputs: next-themes resolved theme.
 * Outputs: an icon button; a spacer on the server to avoid flicker.
 */
"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

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
 * Toggle between dusk (dark) and white (light). Label is spoken, not shown.
 */
export function ThemeToggle() {
  const isClient = useIsClient();
  const { resolvedTheme, setTheme } = useTheme();

  if (!isClient) {
    return <span className="inline-block size-10" aria-hidden="true" />;
  }

  const light = resolvedTheme === "light";

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={light ? "Switch to dusk mode" : "Switch to white mode"}
      onClick={() => setTheme(light ? "dark" : "light")}
    >
      {light ? <Moon strokeWidth={1.7} /> : <Sun strokeWidth={1.7} />}
    </Button>
  );
}
