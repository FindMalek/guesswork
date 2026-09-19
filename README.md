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
  <a href="https://github.com/FindMalek/guesswork"><img src="https://shieldcn.dev/badge/installs%20(approx)-449-4c1.svg?variant=secondary" alt="installs (approx)" /></a>
<!-- clone-stats:end -->
<br>
<sub>Counts real <code>git clone</code>s of this repo — every first-time <code>install.sh</code> run does one internally, plus some people who clone without installing, so treat it as a close proxy, not a byte-exact install count.</sub>
</p>

```sh
curl -fsSL https://guesswork.findmalek.com/install.sh | bash
```

Prefix-matching history search only works if you remember how a command
*started*. You know you ran something with `--dir blog` in it last week, but
not whether it began with `amp`, `npm`, or `git`. guesswork closes that gap:
as you type, it asks an AI model which recent command you're most likely
retyping — abbreviations (`gst` → `git status`) and fuzzy matches, not just
literal prefixes — and shows the best guess inline, fish-style, grey text
after your cursor. Press <kbd>→</kbd> to accept it.

```
% git st▌atus  [0.970]                        prefix mode: literal completion
% last 5 commits▌  ⇢ git log --oneline -5  [1.000]   replace mode: no entry starts with the input
```

That's a real transcript, not a mockup — regenerate it with
`demo/make-demo.sh` (needs `vhs`, `ffmpeg`, and a provider key; runs against a
fabricated history, never your real one).

There's also `demo/make-launch-demo.sh` / `demo/launch.tape`, a longer,
slower-paced cut of the same fabricated environment meant for a first-impression
launch video rather than a quick inline GIF — it covers the same prefix/fuzzy
suggestion beats plus a clean closing shot, and deliberately stops short of
the install one-liner and setup wizard (those need a real network fetch and
real provider credentials, so they're recorded by hand separately).

## Why not just fzf / prefix search?

Those are still the right tool for *searching* history on demand. guesswork
is for the moment you don't even think to search — a suggestion just
appears, the way fish's or zsh's `autosuggestions` plugin already does,
except the ranking understands intent instead of only comparing characters.

## Install

The one-liner above fetches [`install.sh`](./install.sh) straight from this
repo (the URL is just a friendlier alias — no separate service, nothing else
to trust), clones the repo to `~/.zsh/guesswork`, installs dependencies, and
launches an arrow-key setup wizard: pick a provider, paste credentials, it
makes one live request to confirm they work, then writes everything into
`~/.zshrc` for you. See [Choose a provider](#choose-a-provider) for what
"provider" means and what each one costs.

Both the installer and the wizard are idempotent — safe to re-run, and both
only touch the block between `# >>> guesswork >>>` / `# <<< guesswork <<<`
markers in your `.zshrc`. Re-running with a different provider switches
cleanly.

**Requirements:** zsh 5.9+, Node 22+ (runs the plugin's TypeScript directly,
no build step).

If you'd rather clone by hand first and see what you're running before it
runs:

```sh
git clone https://github.com/findmalek/guesswork.git ~/.zsh/guesswork
~/.zsh/guesswork/install.sh
```

### Non-interactive install

For scripting, CI, or an agent setting this up on your behalf, skip the
prompts by passing everything after `--`:

```sh
./install.sh -- --provider typesafe --api-key sk-...
./install.sh -- --provider cloudflare --account-id <id> --api-token <token>
./install.sh -- --provider anthropic --api-key sk-ant-...
./install.sh -- --provider groq --api-key gsk_...
```

Run `./install.sh -- --help` for the full flag list. If an AI coding agent is
doing this for you, point it at [`CLAUDE.md`](./CLAUDE.md) — it documents this
path in more detail so it can be done in one shot.

### Manual install

```sh
git clone https://github.com/findmalek/guesswork.git ~/.zsh/guesswork
cd ~/.zsh/guesswork && npm install
```

In `~/.zshrc` (TypeSafe shown — see [Choose a provider](#choose-a-provider)
for the others' env vars):

```zsh
export TYPESAFE_API_KEY=...
source ~/.zsh/guesswork/zsh/guesswork.plugin.zsh
```

Suggestions are accepted by `forward-char`, `vi-forward-char`, `end-of-line`
and `vi-end-of-line` when the cursor is at the end of the line, so <kbd>→</kbd>
and <kbd>^E</kbd> work in both emacs and vi keymaps (in vi mode, bind `^E` to
`end-of-line` if you want it there). There's also a standalone widget,
`guesswork-accept-suggestion`, for a custom binding.

### Terminal support

guesswork works in **any terminal emulator that runs zsh** — Ghostty,
iTerm2, Terminal.app, Alacritty, kitty, WezTerm, tmux, all of it. The plugin
hooks zsh's line editor (`zle`) directly and draws the suggestion through
`POSTDISPLAY` + `region_highlight`, the same terminal-agnostic mechanism
`zsh-autosuggestions` uses — nothing terminal-specific, no raw escape codes.
Verified hands-on in Ghostty (`TERM=xterm-ghostty`) and Terminal.app
(`TERM=xterm-256color`); both register the plugin's widgets identically.

One real caveat, not specific to guesswork: SSHing *from* a terminal with its
own newer `TERM` value (Ghostty's `xterm-ghostty` is a known case) *into* a
host whose terminfo database doesn't have that entry yet can misrender any
terminal program until you copy the entry over — see
[Ghostty's terminfo docs](https://ghostty.org/docs/help/terminfo).

## Choose a provider

guesswork talks to TypeSafe's Jev model either directly or through Cloudflare
Workers AI, which hosts the same model behind its own account-scoped API —
same request/response shape, same code path either way. Anthropic and Groq
are fallbacks for when you'd rather not sign up for either: each substitutes
a real general-purpose chat model for Jev, asked to do the same structured
evaluation task (see [#1](https://github.com/findmalek/guesswork/issues/1)
for why a real self-hosted Jev isn't possible today) — not equivalent
models, escape hatches. Groq is the speed-optimized fallback: its
structured-output "strict" mode guarantees schema-valid JSON by constrained
decoding on custom LPU hardware, a stronger guarantee than Anthropic's
schema-constrained (but not decoding-guaranteed) output — whether that
closes the latency gap with Jev hasn't been benchmarked yet
([#11](https://github.com/findmalek/guesswork/issues/11)).

| | TypeSafe (direct) | Cloudflare Workers AI | Anthropic (fallback) | Groq (fallback) |
| --- | --- | --- | --- | --- |
| Runs | Jev | Jev | a real Claude model | a real open-weight model |
| Input price | $42 / billion tokens | $42 / billion tokens | Haiku 4.5: $1 / million tokens | GPT-OSS 20B: ~$0.075 / million tokens¹ |
| Context length | not published | 32,000 tokens | 200,000 tokens | 128,000 tokens |
| Credentials | [API key](https://typesafe.ai) | [account ID + token](#finding-your-cloudflare-account-id-and-api-token) | [API key](https://console.anthropic.com/settings/keys) | [API key](https://console.groq.com/keys) |
| Billed through | TypeSafe | Cloudflare | Anthropic | Groq |
| Env vars | `TYPESAFE_API_KEY` | `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN` | `ANTHROPIC_API_KEY` | `GROQ_API_KEY` |

¹ Groq's own pricing page is client-rendered and wasn't directly confirmable
at the time this was written — sourced from third-party trackers instead, so
treat it as approximate and check [console.groq.com](https://console.groq.com)
before relying on it. Every other price above is that provider's own
published rate (see [What it costs](#what-it-costs) for the per-request math).

If you already have a Cloudflare account, that's usually the path of least
friction; TypeSafe direct is one less account if you don't. Reach for
Anthropic or Groq only if you want neither — both are general-purpose models
standing in for a purpose-built one, so scores may not calibrate the same way
against the default thresholds (`GUESSWORK_THRESHOLD` / `GUESSWORK_MIN_SCORE`
/ `GUESSWORK_STRONG_SCORE`).

### Finding your Cloudflare Account ID and API Token

- **Account ID** — open [dash.cloudflare.com](https://dash.cloudflare.com)
  and pick an account. It's the 32-character hex string right after
  `dash.cloudflare.com/` in the URL bar — copy that segment. Also shown under
  **Workers & Pages → Overview**, top right, with a copy icon.
- **API Token** — [dash.cloudflare.com/profile/api-tokens](https://dash.cloudflare.com/profile/api-tokens)
  → **Create Token** → **Custom Token** → add **Workers AI** (Read is enough)
  scoped to your account → **Continue** → **Create Token**. Copy it
  immediately; Cloudflare only shows it once.

## Configuration

Set these before sourcing the plugin (above the `source` line in `.zshrc`):

| Variable | Default | Meaning |
| --- | --- | --- |
| `GUESSWORK_HISTORY_LIMIT` | `100` | Recent distinct commands to consider |
| `GUESSWORK_MIN_CHARS` | `2` | Do nothing until this many characters are typed |
| `GUESSWORK_THRESHOLD` | `0.5` | Fuzzy mode: min probability that *some* entry completes the input |
| `GUESSWORK_MIN_SCORE` | `0.3` | Fuzzy mode: min probability of the top candidate |
| `GUESSWORK_STRONG_SCORE` | `0.9` | Fuzzy mode: a top score this high overrides `GUESSWORK_THRESHOLD` |
| `GUESSWORK_HIGHLIGHT` | `fg=8` | zle highlight spec for the suggestion |
| `GUESSWORK_SHOW_SCORE` | `1` | Append the score, e.g. `[0.87]` |
| `GUESSWORK_NODE` | `node` | Node binary |
| `GUESSWORK_MODEL` | *(varies)* | Model override — TypeSafe: Jev version; Anthropic: Claude model (default `claude-haiku-4-5`); Groq: chat model (default `openai/gpt-oss-20b`); ignored on Cloudflare |
| `GUESSWORK_PROJECT_SCRIPTS` | `1` | Set to `0` to stop adding `package.json`/`Makefile` commands as candidates (see [How it works](#how-it-works)) |
| `GUESSWORK_DEBUG_LOG` | *(unset)* | When set, every request/response is appended to this file |

Which provider runs is decided by which credentials are set — TypeSafe takes
priority, then Cloudflare, then Anthropic, then Groq, if more than one
happens to be set.

## How it works

`zsh/guesswork.plugin.zsh` hooks `line-pre-redraw`. On every buffer change it
kills any in-flight request and starts `src/cli.ts` in the background (`zle -F`
on a process-substitution fd, so the prompt never blocks). The result is
applied only if the buffer is still what was typed when the request started —
a stale response from a buffer you've since changed is silently discarded.

`src/cli.ts` does one request per keystroke to whichever provider is
configured:

1. **Candidates.** The last `--limit` distinct commands come from history
   (extended format, multi-line entries supported). `src/project-scripts.ts`
   adds commands you haven't necessarily *run* before: `package.json`
   `scripts` (as `npm run <name>` / `pnpm <name>` / `yarn <name>` / `bun run
   <name>`, with the package manager read from the `packageManager` field or
   the nearest lockfile) and `Makefile` targets (`make <target>`), from the
   nearest ancestor directory that has either file — a script already in
   history is left out so it isn't offered twice. Set
   `GUESSWORK_PROJECT_SCRIPTS=0` to turn this off. If any candidate literally
   starts with the typed text, only those are sent (*prefix mode*);
   otherwise all of them are (*fuzzy mode*), and a single prefix match
   answers instantly with no request at all.
2. **One request, two questions.** A `Choice` over the candidate IDs asks
   which one the user is completing (score = its probability); a `Noul` asks
   whether *any* candidate completes the input at all — without that second
   gate, the closest irrelevant command would always "win" a Choice, since
   its probabilities always sum to 1.
3. **Gate.** Prefix mode always suggests the top candidate. Fuzzy mode
   suggests only when the top score clears `GUESSWORK_MIN_SCORE` and either
   the Noul clears `GUESSWORK_THRESHOLD` or the top score clears
   `GUESSWORK_STRONG_SCORE` on its own — the Noul under-fires on tiny
   histories where the Choice is already decisive, and on nonsense the
   Choice spreads thin while the Noul correctly goes near zero, so both are
   checked.

Exact rules — prefix matching, dedup, thresholds — live in code; the model
only judges *which* candidate fits. Latency is roughly 0.7–0.9s per request,
almost all of it API time. A suggestion sourced from `package.json`/`Makefile`
gets tagged `script` rather than `prefix`/`replace` in the header line handed
to the zsh plugin, since it's something you've never actually run — the zsh
side doesn't style it differently yet, but the distinction exists for a
future pass to.

## What it costs

Every request is small: your typed prefix plus ~100 short command strings
in, a probability distribution over ~100 IDs out. TypeSafe publishes
**$0.000081 per request** as representative for this kind of task — about
245x cheaper than routing the same request through a general-purpose chat
model, which is exactly what the Anthropic and Groq fallbacks do instead (see
the [provider table](#choose-a-provider) for their per-token rates). Even
triggering a few hundred requests *every single day* for a full year on Jev
lands around $10 total — not a subscription, not a line item you'll notice.
The fallbacks cost more per token but are still cheap in absolute terms for a
request this size; just not purpose-built-model cheap.

Run any request with `--json` to see the exact `usage` your own history
produces:

```sh
node src/cli.ts --buffer "git ch" --json | jq .usage
```

## CLI

```sh
node src/cli.ts --buffer 'git ch' --list              # show the ranked candidates
node src/cli.ts --buffer 'git ch' --json              # full result incl. usage
node src/cli.ts --buffer 'git ch' --list-candidates   # show what would be sent, no request, no credentials needed
node src/cli.ts --buffer 'git ch' --jev-only          # skip the prefix filter
node src/cli.ts --help
```

## Tests

```sh
npm test              # unit tests (history parsing, request shape, gating)
npm run typecheck
npm run test:e2e      # drives a real zsh in a pty; needs a provider's credentials
```

The e2e test types into an interactive `zsh -f` with a throwaway history file
and checks that suggestions appear, that typing along a suggestion does not
re-request, that <kbd>→</kbd> and <kbd>^E</kbd> accept and run the command (in
emacs and vi keymaps), that nonsense yields nothing, and that a stale response
is discarded when the buffer changes mid-request.

## Website

A Next.js landing page with an interactive playground (a hand-built terminal
look-alike that ports the real prefix/fuzzy ranking logic client-side against
a fabricated history — see [`site/`](./site) for details) lives in this repo
under `site/`. Not yet deployed — see [`site/README.md`](./site/README.md).

## Contributing

Every PR needs a linked issue first — open one with the
[detailed-task template](https://github.com/findmalek/guesswork/issues/new/choose)
(context, current state, a concrete acceptance checklist) before writing
code; if the branch name follows `type/NNN-slug` or `NNN-slug`, a bot links
the PR to it automatically, otherwise add `Closes #N` to the PR body
yourself. Work is tracked on the
[Guesswork project board](https://github.com/users/findmalek/projects/14).
The [PR template](.github/pull_request_template.md) covers the rest.

`npm run sync-repo` fetches origin, pulls `main`, and cleans up local
branches once a PR merges — handy given the branch-per-issue workflow above.

## Uninstall

```sh
sed -i.bak '/# >>> guesswork >>>/,/# <<< guesswork <<</d' ~/.zshrc
rm -rf ~/.zsh/guesswork
```

## License

MIT — see [LICENSE](./LICENSE).
