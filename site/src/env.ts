import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

/**
 * `@t3-oss/env-core`, not `env-nextjs`: this site has no `NEXT_PUBLIC_*`
 * client vars, so the Next.js wrapper's literal-runtimeEnv-listing dance
 * (needed only to survive build-time client-bundle inlining) doesn't apply
 * here -- every var below is server-only.
 *
 * `TYPESAFE_API_KEY` is optional at the schema level on purpose: this file
 * loads at module scope, so a required var here would crash the entire site
 * -- including static pages -- in any environment where it isn't set (a
 * fresh clone, a preview deploy without secrets configured yet). The
 * terminal playground's route handler re-checks for it at request time and
 * falls back to the local deterministic demo when it's missing, rather than
 * failing the request. Matches the same reasoning as dukkani's `aiModule`.
 */
export const env = createEnv({
  server: {
    TYPESAFE_API_KEY: z.string().min(1).optional(),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
  skipValidation: process.env.SKIP_ENV_VALIDATION === "true" || process.env.NODE_ENV === "test",
});
