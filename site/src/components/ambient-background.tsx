/**
 * The hero's ambient background, matching tester.army/e2e's actual layering
 * recipe (extracted from its shipped CSS, not guessed):
 *   1. A grainy, dithered glow easing down from the top.
 *   2. A darkening overlay tinting everything toward the theme's own
 *      --background, via color-mix -- their version uses a fixed rgb(22 22
 *      22) since their landing page never leaves dark mode; using
 *      var(--background) here keeps this correct in light mode too.
 *   3. A bottom-anchored fade to fully solid --background, so content below
 *      the glow sits on a clean, flat surface rather than a hard cutoff.
 *
 * The one thing NOT copied: their actual bg-texture.png file. That's a
 * specific image asset they created, not a reusable technique -- this
 * reproduces the visual effect from scratch (SVG feTurbulence + a dithered
 * radial dot screen, see .bg-dither-matrix in globals.css) instead of
 * embedding their file in this repo.
 */
export function AmbientBackground() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden select-none">
      <div className="absolute -top-32 inset-x-0 h-[480px] opacity-75 dark:opacity-60 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,color-mix(in_oklch,var(--primary)_18%,transparent),transparent)]" />
      <div className="absolute -top-20 -left-1/4 w-[150%] h-[380px] opacity-60 dark:opacity-40 blur-xl bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,color-mix(in_oklch,var(--primary)_12%,transparent),transparent)]" />
      <div className="absolute inset-0 bg-dither-matrix opacity-65 dark:opacity-50" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_36%,color-mix(in_oklch,var(--background)_70%,transparent)_90%)]" />
      <div className="absolute inset-x-0 bottom-0 h-[500px] bg-[linear-gradient(to_bottom,transparent_2%,var(--background)_68%)]" />
    </div>
  );
}
