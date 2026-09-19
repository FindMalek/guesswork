/**
 * The hero's ambient background: two overlapping soft glow shapes easing
 * down from the top of the viewport, layered under a dithered dot screen
 * (`.bg-dither-matrix`, globals.css) so it reads as a grainy printed
 * gradient rather than a smooth CSS blur. Fixed, behind everything
 * (`-z-10`), and non-interactive.
 *
 * All color comes from `--primary` via `color-mix()` in globals.css -- no
 * hex literals here, so this stays correct if the theme's accent changes.
 */
export function AmbientBackground() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden select-none">
      <div className="absolute -top-32 inset-x-0 h-[480px] opacity-75 dark:opacity-60 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,color-mix(in_oklch,var(--primary)_18%,transparent),transparent)]" />
      <div className="absolute -top-20 -left-1/4 w-[150%] h-[380px] opacity-60 dark:opacity-40 blur-xl bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,color-mix(in_oklch,var(--primary)_12%,transparent),transparent)]" />
      <div className="absolute inset-0 bg-dither-matrix opacity-65 dark:opacity-50" />
    </div>
  );
}
