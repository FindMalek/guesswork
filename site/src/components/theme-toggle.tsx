"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

const subscribeNever = () => () => {};

/**
 * True only after hydration. Avoids a hydration mismatch (the server always
 * renders the default theme, so the icon must too until the client has read
 * the real preference) without an effect-body `setState`, which is what the
 * common `useState` + `useEffect(() => setMounted(true), [])` version does.
 */
function useIsMounted(): boolean {
  return useSyncExternalStore(subscribeNever, () => true, () => false);
}

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useIsMounted();

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle theme"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      {mounted && resolvedTheme === "dark" ? (
        <Sun className="size-4" />
      ) : (
        <Moon className="size-4" />
      )}
    </Button>
  );
}
