import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import { plugin as shadcn } from "@shadcn/lint";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // @shadcn/lint -- this project's parser is already set up by
    // eslint-config-next/typescript above, so this block only makes the
    // `shadcn/*` rules available and turns on the ones this project has
    // actually decided on (see #29). See
    // https://github.com/shadcn-ui/lint#rules.
    files: ["**/*.{js,jsx,ts,tsx}"],
    plugins: { shadcn },
    rules: {
      // Codifies the "only theme tokens, never a hardcoded hex" convention
      // from #28 as a real lint rule instead of manual discipline. Zero
      // violations at the time this was enabled -- #28 already routed every
      // raw color (including the terminal chrome) through theme tokens.
      "shadcn/no-raw-colors": "error",
      // Component primitives (button, badge, card, separator, tooltip) own
      // their color, typography, spacing, and shape; call sites may only
      // adjust layout (margin, width, flex behavior) to place them. Nothing
      // in src currently needs a wider contract for a specific component --
      // add one here if a real usage needs it, rather than opening this up
      // pre-emptively.
      "shadcn/no-restyle": ["error", { allow: ["layout"] }],
      "shadcn/no-inline-styles": "error",
      "shadcn/no-unknown-classes": "error",
      "shadcn/require-static-classes": "error",
      // shadcn/no-arbitrary-values: evaluated, left off. Most of the ~30
      // hits it produces are legitimate, not sloppy hardcoding --
      // decorative gradients built from color-mix()/calc() in
      // ambient-background.tsx, custom keyframe animation references in
      // typing-wordmark.tsx and terminal-playground.tsx, a CSS custom
      // property declaration and a grid-template list in ui/card.tsx, and
      // font sizes (11/13/15/17/54px) that are intentionally off-scale,
      // copied pixel-for-pixel from the external design reference this
      // site is matched against (see the comment atop globals.css). None
      // of that is expressible through the rule's category/contract
      // exemptions without also opening the door to real off-token
      // hardcoding, so a blanket allow would defeat the rule. The handful
      // of true duplicates it also caught (e.g. h-[480px] instead of
      // h-120) aren't worth fixing without the rule active to keep them
      // from drifting back.
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
