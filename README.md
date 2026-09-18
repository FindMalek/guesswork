<p align="center">
  <img src="https://shieldcn.dev/header/gradient.svg?title=guesswork&subtitle=Fish-style+autosuggestions+for+zsh+%E2%80%94+but+the+shell+actually+guesses+right&logo=typescript&align=center&theme=violet" alt="guesswork" width="720" />
</p>

<p align="center">
  <a href="https://github.com/findmalek/guesswork/blob/main/LICENSE"><img src="https://shieldcn.dev/github/license/findmalek/guesswork.svg?variant=secondary" alt="License" /></a>
  <a href="https://github.com/findmalek/guesswork/commits/main"><img src="https://shieldcn.dev/github/last-commit/findmalek/guesswork.svg?variant=secondary" alt="Last commit" /></a>
  <a href="https://nodejs.org"><img src="https://shieldcn.dev/badge/node-22%2B-339933.svg?logo=nodedotjs&logoColor=white&variant=secondary" alt="Node 22+" /></a>
  <a href="https://www.zsh.org"><img src="https://shieldcn.dev/badge/zsh-5.9%2B-4E9A06.svg?variant=secondary" alt="zsh 5.9+" /></a>
  <a href="https://www.typescriptlang.org"><img src="https://shieldcn.dev/badge/made%20with-typescript-3178C6.svg?logo=typescript&logoColor=white&variant=secondary" alt="Made with TypeScript" /></a>
</p>

Prefix-matching history search has a blind spot: it only works if you remember
how the command *started*. You know you ran something with `--dir blog` in it
last week, but you don't remember whether it began with `amp`, `npm`, or `git`.

guesswork closes that gap. As you type, it sends your recent shell history to
an AI model and asks which command you're most likely retyping — including
abbreviations (`gst` → `git status`) and fuzzy matches, not just literal
prefixes. The best guess appears inline, fish-style, grey text after your
cursor with its confidence score attached. Press <kbd>→</kbd> to accept it.

```
% git st▌atus  [0.970]                        prefix mode: literal completion
% last 5 commits▌  ⇢ git log --oneline -5  [1.000]   replace mode: no entry starts with the input
```

(That's a real transcript, not a mockup — regenerate it yourself with
`demo/make-demo.sh`, which needs `vhs`, `ffmpeg`, and `TYPESAFE_API_KEY`; it
runs against a fabricated history, never your real one.)

## Why not just fzf / prefix search?

Those are still the right tool for *searching* history on demand. guesswork is
for the moment you don't even think to search — a suggestion just appears,
the way fish's or zsh's `autosuggestions` plugin already does, except the
ranking understands intent instead of only comparing characters.

## Install

One-liner (clones the repo, installs dependencies, and launches an
arrow-key setup wizard):

```sh
git clone https://github.com/findmalek/guesswork.git ~/.zsh/guesswork
~/.zsh/guesswork/install.sh
```

The wizard asks which provider to use, walks you through getting credentials
for it, makes one live request to confirm they actually work, then writes
everything into `~/.zshrc` for you — see [Choose a provider](#choose-a-provider)
below for what "provider" means here and what each one costs.

The installer (and the wizard it launches) are idempotent: safe to re-run,
and both only touch the block managed between `# >>> guesswork >>>` /
`# <<< guesswork <<<` markers in your `.zshrc` — nothing else in your
dotfiles is touched. Re-running switches providers cleanly if you change
your mind later.

**Requirements:** zsh 5.9+, Node 22+ (runs the plugin's TypeScript directly,
no build step).

### Non-interactive install

For scripting, CI, or an agent setting this up on your behalf, skip the
prompts by passing everything after `--`:

```sh
# TypeSafe
./install.sh -- --provider typesafe --api-key sk-...

# Cloudflare Workers AI
./install.sh -- --provider cloudflare --account-id <id> --api-token <token>
```

Run `./install.sh -- --help` for the full flag list (custom rc file path,
`--skip-test` to skip the live credential check, `--yes` to skip
confirmations).

### Manual install

If you'd rather do it by hand, or you're on a zsh plugin manager:

```sh
git clone https://github.com/findmalek/guesswork.git ~/.zsh/guesswork
cd ~/.zsh/guesswork && npm install
```

In `~/.zshrc` (TypeSafe shown; see the [provider table](#choose-a-provider)
for the Cloudflare equivalent):

```zsh
export TYPESAFE_API_KEY=...
source ~/.zsh/guesswork/zsh/guesswork.plugin.zsh
```

Suggestions are accepted by `forward-char`, `vi-forward-char`, `end-of-line`
and `vi-end-of-line` when the cursor is at the end of the line, so <kbd>→</kbd>
and <kbd>^E</kbd> work in both emacs and vi keymaps (in vi mode, bind `^E` to
`end-of-line` if you want it there). There's also a standalone widget,
`guesswork-accept-suggestion`, for a custom binding.

### Setting this up for someone else (Claude Code, etc.)

If an AI coding agent is doing this install for you, point it at
[`CLAUDE.md`](./CLAUDE.md) — it documents the non-interactive install path so
it can be done in one shot without back-and-forth.

## Choose a provider

guesswork talks to TypeSafe's Jev model either directly or through Cloudflare
Workers AI, which hosts the same model behind its own account-scoped API.
Same model, same request/response shape, same code path either way — pick
whichever is more convenient for you to bill and authenticate through.

| | TypeSafe (direct) | Cloudflare Workers AI |
| --- | --- | --- |
| Input price | $42 / billion tokens | $42 / billion tokens ($0.042 / million) |
| Context length | not published | 32,000 tokens |
| Credentials | one API key from [typesafe.ai](https://typesafe.ai) | an [account ID](https://dash.cloudflare.com) + an [API token](https://dash.cloudflare.com/profile/api-tokens) scoped to Workers AI |
| Billed through | TypeSafe | Cloudflare |
| Env vars | `TYPESAFE_API_KEY` | `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN` |

Prices above are both providers' own published input-token rates as of this
writing (see [What it costs](#what-it-costs)); neither publishes an output
price, and output for this task is a short probability distribution, not
prose, so it's a small fraction of the bill either way. If you already have a
Cloudflare account, that's usually the path of least friction; if you'd
rather not add another vendor, TypeSafe direct is one less account.

## Configuration

Set these before sourcing the plugin (i.e. above the `source` line in
`.zshrc`):

| Variable                  | Default | Meaning                                                            |
| -------------------------- | ------- | ------------------------------------------------------------------- |
| `GUESSWORK_HISTORY_LIMIT`  | `100`   | Recent distinct commands to consider                                |
| `GUESSWORK_MIN_CHARS`      | `2`     | Do nothing until this many characters are typed                     |
| `GUESSWORK_THRESHOLD`      | `0.5`   | Fuzzy mode: min probability that *some* entry completes the input   |
| `GUESSWORK_MIN_SCORE`      | `0.3`   | Fuzzy mode: min probability of the top candidate                    |
| `GUESSWORK_STRONG_SCORE`   | `0.9`   | Fuzzy mode: a top score this high overrides `GUESSWORK_THRESHOLD`   |
| `GUESSWORK_HIGHLIGHT`      | `fg=8`  | zle highlight spec for the suggestion                               |
| `GUESSWORK_SHOW_SCORE`     | `1`     | Append the score, e.g. `[0.87]`                                     |
| `GUESSWORK_NODE`           | `node`  | Node binary                                                         |
| `GUESSWORK_MODEL`          | *(SDK default, `jev-latest`)* | TypeSafe model override — TypeSafe provider only, ignored on Cloudflare |
| `GUESSWORK_DEBUG_LOG`      | *(unset)* | When set, every request/response is appended to this file         |

Which provider is used is decided by which credentials are set (`TYPESAFE_API_KEY`
takes priority if both happen to be set) — see [Choose a provider](#choose-a-provider).

## How it works

`zsh/guesswork.plugin.zsh` hooks `line-pre-redraw`. On every buffer change it
kills any in-flight request and starts `src/cli.ts` in the background
(`zle -F` on a process-substitution fd, so the prompt never blocks). The
result is applied only if the buffer is still what was typed when the request
started — if you kept typing past a stale request, it's silently discarded.

`src/cli.ts` does one request per keystroke to TypeSafe's Jev model:

1. **Candidates.** The last `--limit` distinct commands are read from the
   history file (extended format, multi-line entries supported). If any of
   them literally start with the typed text, only those are sent (*prefix
   mode*); otherwise all of them are (*fuzzy mode*). A single prefix match is
   suggested immediately, with no request at all.
2. **One request, two questions.** The state holds `typed_so_far` and the
   candidates as an ID-tagged list. A `Choice` over the IDs asks which one the
   user is completing (score = its probability); a `Noul` asks whether *any*
   candidate completes the input at all.
3. **Gate.** Prefix mode always suggests the top candidate. Fuzzy mode
   suggests only when the top score ≥ `GUESSWORK_MIN_SCORE` and either the
   Noul ≥ `GUESSWORK_THRESHOLD` or the top score ≥ `GUESSWORK_STRONG_SCORE`.
   The two signals fail in different places — the Noul under-fires on tiny
   histories where the Choice is decisive; on nonsense the Choice spreads out
   while the Noul is near zero — so both are used.

Exact rules — prefix matching, dedup, thresholds — live in code; the model
only makes the judgment call of *which* history entry fits. Latency is
roughly 0.7–0.9s per request, almost all of it API time (Node startup and
history parsing are ~0.1s).

## What it costs

Every request is small: your typed prefix plus ~100 short command strings in,
a probability distribution over ~100 IDs out. Both providers price Jev input
at **$42 per billion tokens** ([typesafe.ai](https://typesafe.ai),
[Cloudflare's model card](https://dash.cloudflare.com)), and TypeSafe
separately publishes **$0.000081 per request** as a representative cost for
this kind of classification task — about 245x cheaper than routing the same
request through a general-purpose chat model.

A single suggestion costs a fraction of a cent; a hundred of them in one
heavy coding day is still under a penny. Even typing enough to trigger a few
hundred requests *every single day* for a full year lands around $10 total —
not a subscription, not a line item you'll notice. Run any request with
`--json` to see the exact `usage` your own history produces:

```sh
node src/cli.ts --buffer "git ch" --json | jq .usage
```

## CLI

```sh
node src/cli.ts --buffer 'git ch' --list        # show the ranked candidates
node src/cli.ts --buffer 'git ch' --json        # full result incl. usage
node src/cli.ts --buffer 'git ch' --jev-only    # skip the prefix filter
node src/cli.ts --help
```

## Tests

```sh
npm test              # unit tests (history parsing, request shape, gating)
npm run typecheck
npm run test:e2e      # drives a real zsh in a pty; needs TYPESAFE_API_KEY
```

The e2e test types into an interactive `zsh -f` with a throwaway history file
and checks that suggestions appear, that typing along a suggestion does not
re-request, that <kbd>→</kbd> and <kbd>^E</kbd> accept and run the command (in
emacs and vi keymaps), that nonsense yields nothing, and that a stale response
is discarded when the buffer changes mid-request.

## Uninstall

```sh
sed -i.bak '/# >>> guesswork >>>/,/# <<< guesswork <<</d' ~/.zshrc
rm -rf ~/.zsh/guesswork
```

## License

MIT — see [LICENSE](./LICENSE).
