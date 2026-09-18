# guesswork

Fish-style zsh history autosuggestions, ranked by an AI model instead of
prefix matching. See README.md for how it works.

## Setting this up for a user

Run the installer, non-interactively, in one shot:

```sh
TYPESAFE_API_KEY=<their key> ./install.sh
```

- If they haven't given you a key yet, ask for one (or point them to
  https://typesafe.ai) before running the installer — don't run it without a
  key unless they explicitly want to configure it later (`./install.sh --no-key`).
- The installer is idempotent: safe to re-run, clones only if not already
  present, and replaces its own block in `~/.zshrc` (between the
  `# >>> guesswork >>>` / `# <<< guesswork <<<` markers) rather than duplicating it.
- After it finishes, tell the user to run `exec zsh` or open a new terminal —
  don't try to `source ~/.zshrc` yourself on their behalf from a non-interactive
  shell, it won't affect their actual terminal session.
- Node 22+ and zsh 5.9+ are hard requirements; the installer checks both and
  fails with a clear message if they're missing.

## Development

- `npm test` — unit tests
- `npm run typecheck`
- `npm run test:e2e` — drives a real zsh in a pty; needs `TYPESAFE_API_KEY`
- Env vars are `GUESSWORK_*` (see README's Configuration table), not `JEV_*`
  — this project was rebranded from `jev-shell-history` but still runs on
  TypeSafe's Jev model under the hood, so "Jev" still refers to the model
  itself in comments/docs, never to the plugin.
