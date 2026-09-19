"use client";

import { useEffect, useState } from "react";

/**
 * The "guesswork" wordmark as its own ghost-text demo: "g" solid, a
 * blinking cursor, "uesswork" faded -- the exact same typed/ghost visual
 * language as TerminalPlayground below it, applied to the logo itself.
 * Press ArrowLeft (or click the nudging arrow) to "accept" the rest of the
 * word, matching Tab/→ accepting a suggestion in the real terminal --
 * deliberately the opposite key, so it never fires from the same muscle
 * memory as the terminal's own accept gesture.
 *
 * One-directional: reveals once per page load, then settles. No
 * localStorage -- this is a first-impression delight, not a setting, and a
 * returning visitor reloading the page should get to see it again.
 */
export function TypingWordmark() {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (revealed) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== "ArrowLeft") return;
      // Don't hijack real cursor movement if focus is in an actual input
      // (e.g. the terminal playground's hidden buffer input below).
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      setRevealed(true);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [revealed]);

  return (
    <h1 className="flex items-baseline justify-center gap-2 font-heading text-4xl font-medium tracking-tight sm:text-[54px]">
      <span aria-hidden="true" className="inline-flex items-baseline">
        <span className="text-foreground">g</span>
        {!revealed && (
          <span className="mx-px inline-block w-[2px] self-stretch animate-[gw-blink_1s_steps(1)_infinite] bg-foreground" />
        )}
        <span className={`transition-colors duration-500 ${revealed ? "text-foreground" : "text-muted-foreground/50"}`}>
          uesswork
        </span>
      </span>
      <span className="sr-only">guesswork</span>
      {!revealed && (
        <button
          type="button"
          onClick={() => setRevealed(true)}
          aria-label="Press the left arrow key, or click here, to finish the word"
          className="inline-flex size-6 shrink-0 animate-[nudge-left_1.4s_ease-in-out_infinite] items-center justify-center self-center border border-border bg-card font-mono text-xs text-muted-foreground"
        >
          ←
        </button>
      )}
    </h1>
  );
}
