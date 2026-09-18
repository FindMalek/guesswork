#!/usr/bin/env bash
# guesswork installer: checks prerequisites, fetches/updates the code,
# installs dependencies, then hands off to the interactive setup wizard
# (src/setup.ts) to pick a provider, collect credentials, and wire up
# your zsh rc file.
#
# Usage:
#   ./install.sh                                     interactive wizard
#   ./install.sh -- --provider typesafe --api-key sk-...       non-interactive
#   ./install.sh -- --provider cloudflare --account-id ... --api-token ...
#   ./install.sh --dir ~/.zsh/guesswork              install somewhere else
#
# Anything after `--` is passed straight through to `node src/setup.ts`
# (run `./install.sh -- --help` to see its full flag list).
set -euo pipefail

INSTALL_DIR="${GUESSWORK_INSTALL_DIR:-$HOME/.zsh/guesswork}"
REPO_URL="https://github.com/findmalek/guesswork.git"
SETUP_ARGS=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dir) INSTALL_DIR="$2"; shift 2 ;;
    --) shift; SETUP_ARGS=("$@"); break ;;
    -h|--help)
      sed -n '2,12p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *) echo "guesswork: unknown option $1 (setup wizard flags go after --)" >&2; exit 2 ;;
  esac
done

info()  { printf '\033[1;34m==>\033[0m %s\n' "$1"; }
fail()  { printf '\033[1;31merror:\033[0m %s\n' "$1" >&2; exit 1; }

# ---------------------------------------------------------------- prereqs --

command -v zsh >/dev/null 2>&1 || fail "zsh is required but not on PATH"

command -v node >/dev/null 2>&1 || fail "node is required but not on PATH (need node 22+)"
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
[[ "$NODE_MAJOR" -ge 22 ]] || fail "node 22+ is required (found $(node -v)); guesswork runs its CLI as TypeScript directly"

# ---------------------------------------------------------------- fetch ----

if [[ -f "$(dirname "$0")/package.json" ]] && grep -q '"name": "guesswork"' "$(dirname "$0")/package.json" 2>/dev/null; then
  INSTALL_DIR="$(cd "$(dirname "$0")" && pwd)"
  info "using existing checkout at $INSTALL_DIR"
elif [[ -d "$INSTALL_DIR/.git" ]]; then
  info "found existing install at $INSTALL_DIR, pulling latest"
  git -C "$INSTALL_DIR" pull --ff-only
else
  info "cloning guesswork into $INSTALL_DIR"
  mkdir -p "$(dirname "$INSTALL_DIR")"
  git clone --depth 1 "$REPO_URL" "$INSTALL_DIR"
fi

info "installing dependencies"
( cd "$INSTALL_DIR" && npm install --silent )

# ------------------------------------------------------------------ setup -

info "launching setup"
# The guard form (${arr[@]+"${arr[@]}"}) is needed for macOS's default bash
# (3.2): older bash treats expanding an empty array under `set -u` as an
# unbound variable, which "${SETUP_ARGS[@]}" alone would trip.
exec node "$INSTALL_DIR/src/setup.ts" "${SETUP_ARGS[@]+"${SETUP_ARGS[@]}"}"
