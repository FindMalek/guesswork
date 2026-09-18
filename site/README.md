# guesswork.findmalek.com

The marketing/landing page for [guesswork](../README.md) — a Next.js (App
Router, TypeScript, Tailwind) app scaffolded with `create-next-app`, living
in this directory so the main repo doesn't need a second one wired up.

## Develop

```sh
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
npm run lint
```

## What's here

- Hero, an interactive terminal playground, a feature grid, and a footer —
  see `src/components/`.
- `src/lib/suggest-core.ts` is ported as-is from the repo root's
  `src/suggest.ts` (the parts with no Node-only APIs: `selectCandidates()`
  and `pickSuggestion()`). `src/lib/fake-rank.ts` is the deterministic
  scoring stand-in used in place of a real AI call in the playground — read
  the comment at the top of that file for exactly what's real and what's
  fabricated.
- `src/lib/fake-history.ts` is a curated, fabricated command history, not
  fetched from anywhere.

## Deploying

Not deployed yet. This app is meant to be its own Vercel project with **Root
Directory** set to `site/` in the project settings (Vercel's standard way of
deploying a subdirectory of a monorepo — no extra config needed here for
that). Domain (e.g. a subdomain of `findmalek.com`, matching the
`guesswork.findmalek.com` pattern already used for `install.sh`) is a
decision for the repo owner.
