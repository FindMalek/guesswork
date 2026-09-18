<p align="center">
  <img src="https://shieldcn.dev/header/gradient.svg?title=guesswork&subtitle=Fish-style+autosuggestions+for+zsh+%E2%80%94+but+the+shell+actually+guesses+right&logo=typescript&align=center&theme=violet" alt="guesswork" width="720" />
</p>

<p align="center">
  <a href="https://github.com/findmalek/guesswork/actions/workflows/ci.yml"><img src="https://shieldcn.dev/github/ci/findmalek/guesswork.svg?workflow=ci.yml&variant=secondary" alt="CI" /></a>
  <a href="https://github.com/findmalek/guesswork/blob/main/LICENSE"><img src="https://shieldcn.dev/github/license/findmalek/guesswork.svg?variant=secondary" alt="License" /></a>
  <a href="https://github.com/findmalek/guesswork/commits/main"><img src="https://shieldcn.dev/github/last-commit/findmalek/guesswork.svg?variant=secondary" alt="Last commit" /></a>
  <a href="https://nodejs.org"><img src="https://shieldcn.dev/badge/node-22%2B-339933.svg?logo=nodedotjs&logoColor=white&variant=secondary" alt="Node 22+" /></a>
  <a href="https://www.zsh.org"><img src="https://shieldcn.dev/badge/zsh-5.9%2B-4E9A06.svg?variant=secondary" alt="zsh 5.9+" /></a>
  <a href="https://www.typescriptlang.org"><img src="https://shieldcn.dev/badge/made%20with-typescript-3178C6.svg?logo=typescript&logoColor=white&variant=secondary" alt="Made with TypeScript" /></a>
</p>

<p align="center">
<!-- clone-stats:start -->
[![installs (approx)](https://shieldcn.dev/badge/installs%20(approx)-0-4c1.svg?variant=secondary)](https://github.com/FindMalek/guesswork)
<!-- clone-stats:end -->
</p>

<p align="center">
<sub>Counts real <code>git clone</code>s of this repo — every first-time <code>install.sh</code> run does one internally, plus some people who clone without installing, so treat it as a close proxy, not a byte-exact install count.</sub>
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

```sh
curl -fsSL https://guesswork.findmalek.com/install.sh | bash
```

That fetches [`install.sh`](./install.sh) straight from this repo (the URL is
just a friendlier alias — no separate service, nothing else to trust) and
runs it: it clones the repo to `~/.zsh/guesswork`, installs dependencies, and
launches an arrow-key setup wizard. Equivalent, if you'd rather clone by hand
first and see what you're running before it runs:

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

# Anthropic (fallback — see Choose a provider below)
./install.sh -- --provider anthropic --api-key sk-ant-...

# Groq (fallback, speed-optimized — see Choose a provider below)
./install.sh -- --provider groq --api-key gsk_...
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

### Terminal support

guesswork works in **any terminal emulator that runs zsh** — Ghostty, iTerm2,
Terminal.app, Alacritty, kitty, WezTerm, tmux, all of it. This isn't a "we
tested a few and hope the rest work" claim: the plugin hooks zsh's line
editor (`zle`) directly and draws the suggestion through `POSTDISPLAY` +
`region_highlight`, the same standard, terminal-agnostic mechanism
`zsh-autosuggestions` uses — nothing terminal-specific, no raw escape codes,
nothing that assumes a particular emulator. Verified hands-on in Ghostty
(`TERM=xterm-ghostty`) and Terminal.app (`TERM=xterm-256color`); both load
the plugin and register its widgets identically.

One real caveat, not specific to guesswork: if you SSH *from* a terminal with
its own newer `TERM` value (Ghostty's `xterm-ghostty` is a known case) *into*
a remote host whose terminfo database doesn't have that entry yet, terminal
rendering in general can misbehave until you copy the entry over — see
[Ghostty's own terminfo docs](https://ghostty.org/docs/help/terminfo). That's
an environment issue any terminal program hits, not something guesswork can
work around itself.

## Choose a provider

guesswork talks to TypeSafe's Jev model either directly or through Cloudflare
Workers AI, which hosts the same model behind its own account-scoped API —
same model, same request/response shape, same code path either way. There are
also two fallback options for when you'd rather not sign up for either:
Anthropic and Groq each substitute a real general-purpose chat model for Jev,
asked to do the same structured evaluation task (see
[#1](https://github.com/findmalek/guesswork/issues/1) for why a real
self-hosted Jev isn't possible today) — not equivalent models, fallbacks.
Groq is the speed-optimized one: it runs on Groq's custom LPU hardware and
its structured-output "strict" mode guarantees schema-valid JSON by
constrained decoding, a stronger guarantee than Anthropic's schema-constrained
(but not decoding-guaranteed) output.

| | TypeSafe (direct) | Cloudflare Workers AI | Anthropic (fallback) | Groq (fallback) |
| --- | --- | --- | --- | --- |
| Runs | Jev | Jev | a real Claude model, not Jev | a real open-weight model, not Jev |
| Input price | $42 / billion tokens | $42 / billion tokens ($0.042 / million) | Claude Haiku 4.5: $1 / million tokens | GPT-OSS 20B: ~$0.075 / million tokens (pricing not directly verified against console.groq.com — third-party-reported, treat as approximate) |
| Context length | not published | 32,000 tokens | 200,000 tokens | 128,000 tokens |
| Credentials | one API key from [typesafe.ai](https://typesafe.ai) | an [account ID + API token](#finding-your-cloudflare-account-id-and-api-token) scoped to Workers AI | one API key from [console.anthropic.com](https://console.anthropic.com/settings/keys) | one API key from [console.groq.com/keys](https://console.groq.com/keys) |
| Billed through | TypeSafe | Cloudflare | Anthropic | Groq |
| Env vars | `TYPESAFE_API_KEY` | `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN` | `ANTHROPIC_API_KEY` | `GROQ_API_KEY` |

Prices above are each provider's own published input-token rate as of this
writing (see [What it costs](#what-it-costs)) except Groq's, which wasn't
directly confirmable from Groq's own (client-rendered) pricing page on this
pass and is instead sourced from third-party pricing trackers reporting
Groq's console rates — treat it as approximate and check
[console.groq.com](https://console.groq.com) yourself before relying on it.
None publish an output price, and output for this task is a short probability
distribution, not prose, so it's a small fraction of the bill regardless of
provider. If you already have a Cloudflare account, that's usually the path
of least friction; if you'd rather not add another vendor, TypeSafe direct is
one less account. Reach for Anthropic or Groq only if you don't want a
TypeSafe or Cloudflare account at all — both are real general-purpose models
standing in for a purpose-built one, so scores may not calibrate the same way
against the default thresholds
(`GUESSWORK_THRESHOLD`/`GUESSWORK_MIN_SCORE`/`GUESSWORK_STRONG_SCORE`) and
per-keystroke latency depends on a much bigger model than Jev — Groq's LPU
hardware is built to minimize that gap, but this hasn't been benchmarked
against real Jev latency yet (no live API key available to measure it; see
[#11](https://github.com/findmalek/guesswork/issues/11)).

### Finding your Cloudflare Account ID and API Token

If you pick Cloudflare, the wizard asks for two things that are easy to miss
on first look:

- **Account ID** — open [dash.cloudflare.com](https://dash.cloudflare.com)
  and pick an account. The Account ID is the 32-character hex string right
  after `dash.cloudflare.com/` in your browser's URL bar (e.g.
  `dash.cloudflare.com/1a2b3c4d5e6f.../...`) — copy that segment. It's also
  shown under **Workers & Pages → Overview**, top right corner, next to a
  copy-to-clipboard icon, if you'd rather not read it out of the URL.
- **API Token** — go to
  [dash.cloudflare.com/profile/api-tokens](https://dash.cloudflare.com/profile/api-tokens)
  → **Create Token** → **Custom Token** → add the **Workers AI** permission
  (Read is enough) scoped to your account → **Continue** → **Create Token**.
  Copy it immediately; Cloudflare only shows it once.

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
| `GUESSWORK_MODEL`          | *(varies by provider)* | Model override — TypeSafe: Jev version; Anthropic: Claude model (default `claude-haiku-4-5`); Groq: chat model (default `openai/gpt-oss-20b`); ignored on Cloudflare |
| `GUESSWORK_DEBUG_LOG`      | *(unset)* | When set, every request/response is appended to this file         |

Which provider is used is decided by which credentials are set — TypeSafe
takes priority, then Cloudflare, then Anthropic, then Groq, if more than one
happens to be set — see [Choose a provider](#choose-a-provider).

## How it works

`zsh/guesswork.plugin.zsh` hooks `line-pre-redraw`. On every buffer change it
kills any in-flight request and starts `src/cli.ts` in the background
(`zle -F` on a process-substitution fd, so the prompt never blocks). The
result is applied only if the buffer is still what was typed when the request
started — if you kept typing past a stale request, it's silently discarded.

`src/cli.ts` does one request per keystroke to whichever provider is configured:

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
a probability distribution over ~100 IDs out. Both Jev providers price input
at **$42 per billion tokens** ([typesafe.ai](https://typesafe.ai); Cloudflare
publishes the same rate on its `typesafe/jev` model card, which sits behind a
Cloudflare login so there's no public link to point at directly), and
TypeSafe separately publishes **$0.000081 per request** as a representative
cost for this kind of classification task — about 245x cheaper than routing
the same request through a general-purpose chat model, which is exactly what
the Anthropic and Groq fallbacks do instead: Claude Haiku 4.5 runs $1 per
million input tokens (~24x TypeSafe/Cloudflare's rate), and Groq's default
model (GPT-OSS 20B) is reportedly around $0.075 per million input tokens
(~2x TypeSafe/Cloudflare's rate — cheapest of the fallbacks by a wide margin,
though this figure is third-party-reported, not confirmed directly against
Groq's own pricing page) — still cheap in absolute terms for a request this
size either way, just not purpose-built-model cheap.

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
npm run test:e2e      # drives a real zsh in a pty; needs a provider's credentials (see above)
```

The e2e test types into an interactive `zsh -f` with a throwaway history file
and checks that suggestions appear, that typing along a suggestion does not
re-request, that <kbd>→</kbd> and <kbd>^E</kbd> accept and run the command (in
emacs and vi keymaps), that nonsense yields nothing, and that a stale response
is discarded when the buffer changes mid-request.

## Contributing

Every PR needs a linked issue first — open one with the
[detailed-task template](https://github.com/findmalek/guesswork/issues/new/choose)
(context, current state, a concrete acceptance checklist) before writing code;
if the branch name follows `type/NNN-slug` or `NNN-slug`, a bot links the PR
to it automatically, otherwise add `Closes #N` to the PR body yourself. Work
is tracked on the [Guesswork project board](https://github.com/users/findmalek/projects/14).
The [PR template](.github/pull_request_template.md) covers the rest.

## Uninstall

```sh
sed -i.bak '/# >>> guesswork >>>/,/# <<< guesswork <<</d' ~/.zshrc
rm -rf ~/.zsh/guesswork
```

## License

MIT — see [LICENSE](./LICENSE).
