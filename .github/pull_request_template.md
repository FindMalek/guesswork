## What & why

<!-- What does this change, and what problem does it solve? -->

## How to verify

<!-- Commands you ran, or steps to reproduce the behavior manually. -->

```sh
npm test
npm run typecheck
```

## Checklist

- [ ] `npm test` and `npm run typecheck` pass
- [ ] Touched `zsh/guesswork.plugin.zsh`? Ran `zsh -n zsh/guesswork.plugin.zsh` and, ideally, `npm run test:e2e` locally (needs a real provider key — CI can't run this)
- [ ] Updated the README/CLAUDE.md if behavior, flags, or env vars changed
