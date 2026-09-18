# Decisions log

A running, dated record of decisions made on this project — what was decided and why, in one or two sentences. Not a spec: for full detail, follow the linked issue. Keep entries short; if a decision needs paragraphs to explain, that belongs in the issue or a dedicated doc under `docs/`, with a link back to it here.

Add a new entry every time something non-obvious gets decided — a name, a technical approach, a scope boundary. The point is that nobody, human or AI, should have to re-derive or re-litigate something already settled here.

---

**2026-09-18 — Forked `mrnugget/jev-shell-history` (MIT) as the base, rebranding to an independent project.** Same core mechanism (fish-style zsh autosuggestions ranked by an AI model instead of prefix matching); new identity, a rewritten README, and an easier setup story, not a from-scratch rewrite.

**2026-09-18 — Kept TypeSafe's Jev as the backend rather than swapping to Claude/Anthropic.** Considered genericizing the backend at the start; decided to rebrand and polish the install/setup story instead of an architecture rewrite, since the original's Choice/Noul primitives and gating logic already worked well.

**2026-09-18 — Name: `guesswork`.** Chosen over `zsh-clairvoyant`, `sixth-sense`, and `oraculum` — short, stands alone as a brand, availabile under the `findmalek` GitHub account.

**2026-09-18 — Added Cloudflare Workers AI as a second provider, not a replacement for TypeSafe.** Discovered Cloudflare hosts the same Jev model behind its own account-scoped `ai/run` endpoint, same request/response envelope shape as TypeSafe's own `/v1/systemone` API. `src/cloudflare.ts` swaps only `TypeSafeClient`'s transport (`fetch` option) to translate between the two, so retries/timeouts/logging all keep working unchanged.

**2026-09-18 — Setup is an interactive wizard (`src/setup.ts`), not raw CLI flags.** First pass used `rl.question()` with manual character-by-character password masking; replaced with `@clack/prompts` for real arrow-key select menus, proper masking, and a spinner during the live credential check. Stays fully scriptable: non-interactive runs (no TTY, or every flag already passed) skip the TUI and just print plain status lines.

**2026-09-18 — `install.sh` mirrored at `guesswork.findmalek.com` via GitHub Pages, not Vercel.** Considered both; GitHub Pages needs zero extra infrastructure for a single static file (a `CNAME` file + a DNS record), whereas a Vercel project would be one more dashboard to maintain for no functional benefit here. DNS: one CNAME record (`guesswork` → `findmalek.github.io`) added directly by the user in Cloudflare (where `findmalek.com`'s DNS is hosted).

**2026-09-18 — Filed #1 to investigate self-hosting Jev; no official path exists today.** TypeSafe's own site/docs only document the hosted API. Their GitHub org has forks of `vllm-project/vllm` and `ML-GSAI/LLaDA` (suggestive R&D signal, not actionable). Found a real adjacent option instead: `typesafe-ai/system-one-adapter-python` — an official "bring your own LLM" adapter reimplementing the same Choice/Noul/Score contract on top of OpenAI/Anthropic models. No JS/TS port exists yet; porting it would be new work, not a dependency swap.

**2026-09-18 — GH workflow: hard rule, no work without a linked issue.** Replicated `findmalek/noch`, `findmalek/dukkani`, and `findmalek/sonaraem`'s conventions as closely as possible (see #2): the "Guesswork" Project (#14) with Status (Thought/Backlog/Ready/In progress/On hold/In review/Done), Priority (P0–P3), and Size (XS–XL) fields matching Noch's exactly; a single `detailed-task.md` issue template (not split bug/feature) with `blank_issues_enabled: false`; a shared PR template skeleton (`🧠 Overview` / `Closes #` / checklist / `🔍 Additional Notes`); and `pr-link-issue.yml`, which infers the issue number from the branch name and appends `Closes #N` to the PR body automatically if nothing already links one, so the "always linked" rule holds even when someone forgets.

**2026-09-18 — Install metric: GitHub clone count, not telemetry.** `curl | bash` installers are inherently anonymous (no registry, no phone-home call) — a real "installs" number would require adding telemetry to `install.sh` and disclosing it, which is a real privacy decision this project isn't making right now. Went with the GitHub Traffic API instead: zero privacy cost, already available, no new infrastructure. Only caveat: the API's 14-day rolling window meant building a small persisted-history mechanism (`.github/clone-history.json`, summed on read) so the number is a true running total instead of resetting every two weeks. See #5.
