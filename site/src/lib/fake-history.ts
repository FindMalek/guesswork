/**
 * Curated, fabricated shell history for the landing-page playground.
 *
 * Adapted from the throwaway history `demo/make-demo.sh` generates for
 * recording the README's terminal GIF — same spirit (git/docker/npm/kubectl,
 * nothing exotic), extended slightly for variety. None of this is fetched
 * from anywhere or tied to any real user; it's baked into the bundle.
 * Newest last, oldest first — reversed to newest-first before use, matching
 * how the real plugin reads `.zsh_history` (most recent entry first).
 */
export const FAKE_HISTORY: readonly string[] = [
  "ls -la",
  "npm test",
  "rg TODO src/",
  "git log --oneline -5",
  "tail -f /var/log/nginx/error.log",
  "cargo test --workspace",
  "npm run build",
  "make lint",
  "curl -s localhost:3000/health | jq .",
  "python3 -m http.server 8080",
  "git stash list",
  "kubectl get pods -n staging",
  "kubectl logs -f deploy/api -n staging",
  "docker compose logs -f api",
  "docker compose up -d",
  "vim README.md",
  "ssh staging-web-01",
  "brew upgrade",
  "pnpm install --frozen-lockfile",
  "git commit -m \"fix: handle empty history file\"",
  "git push origin HEAD",
  "git checkout -b feat/playground",
  "git diff --stat",
  // Kept most recent on purpose: the README's canonical example ("gst" ->
  // "git status") only resolves the way the demo intends when this is the
  // freshest entry among the several plausible "git ..." completions above.
  "git status",
].reverse();
