# guesswork

Fish-style zsh history autosuggestions, ranked by an AI model instead of
prefix matching. See README.md for how it works.

## Setting this up for a user

There are two providers for the underlying model (same model, same request
shape, different account/billing): **TypeSafe** direct (`TYPESAFE_API_KEY`)
or **Cloudflare Workers AI** (`CLOUDFLARE_ACCOUNT_ID` + `CLOUDFLARE_API_TOKEN`).
Ask the user which they'd rather use if they haven't said, or check what
credentials they already have on hand.

Run the installer non-interactively, in one shot, passing everything after `--`:

```sh
./install.sh -- --provider typesafe --api-key sk-...
# or
./install.sh -- --provider cloudflare --account-id <id> --api-token <token>
```

- Don't run it without credentials unless the user explicitly wants to
  configure them later (`./install.sh -- --provider typesafe --api-key '' --skip-test`
  isn't a real path — just skip running it at all until they have a key, or
  point them at `npm run setup` to run the interactive wizard themselves).
- The wizard makes one live request to verify the credentials actually work
  before writing anything; a failure prints the real error message.
- Both the installer and the wizard (`src/setup.ts`) are idempotent: safe to
  re-run, clone/pull only if needed, and replace their own block in
  `~/.zshrc` (between the `# >>> guesswork >>>` / `# <<< guesswork <<<`
  markers) rather than duplicating it. Re-running with a different
  `--provider` cleanly switches.
- After it finishes, tell the user to run `exec zsh` or open a new terminal —
  don't try to `source ~/.zshrc` yourself on their behalf from a non-interactive
  shell, it won't affect their actual terminal session.
- Node 22+ and zsh 5.9+ are hard requirements; the installer checks both and
  fails with a clear message if they're missing.
- The plugin only works in zsh — it hooks zle directly. If the user's
  `$SHELL` isn't zsh, the wizard still writes the config but warns them they
  need to actually run zsh to see suggestions.

## Development

- `npm test` — unit tests
- `npm run typecheck`
- `npm run test:e2e` — drives a real zsh in a pty; needs `TYPESAFE_API_KEY`
- Env vars are `GUESSWORK_*` (see README's Configuration table), not `JEV_*`
  — this project was rebranded from `jev-shell-history` but still runs on
  TypeSafe's Jev model under the hood, so "Jev" still refers to the model
  itself in comments/docs, never to the plugin.
