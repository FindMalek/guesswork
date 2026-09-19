import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import { plugin as shadcn } from "@shadcn/lint";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // @shadcn/lint, registered but with no rules enabled -- this project's
    // parser is already set up by eslint-config-next/typescript above, so
    // this block only makes the `shadcn/*` rules available. Which ones (if
    // any) to turn on, and what to allow, is a design-system policy
    // decision for the project, not something to default into on setup.
    // See https://github.com/shadcn-ui/lint#rules.
    files: ["**/*.{js,jsx,ts,tsx}"],
    plugins: { shadcn },
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
