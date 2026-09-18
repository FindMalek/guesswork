#!/usr/bin/env bash
# guesswork installer.
#
# Designed to run unattended in one shot (e.g. driven by Claude Code) as well
# as interactively. Safe to re-run: every step it takes is idempotent.
#
# Usage:
#   ./install.sh                          interactive; prompts for the API key
#   TYPESAFE_API_KEY=sk-... ./install.sh  non-interactive; key comes from env
#   ./install.sh --dir ~/.zsh/guesswork   install somewhere other than the default
#   ./install.sh --no-key                 skip API key setup entirely
set -euo pipefail

INSTALL_DIR="${GUESSWORK_INSTALL_DIR:-$HOME/.zsh/guesswork}"
ZSHRC="${ZDOTDIR:-$HOME}/.zshrc"
REPO_URL="https://github.com/findmalek/guesswork.git"
API_KEY="${TYPESAFE_API_KEY:-}"
SKIP_KEY=0
BLOCK_START="# >>> guesswork >>>"
BLOCK_END="# <<< guesswork <<<"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dir) INSTALL_DIR="$2"; shift 2 ;;
    --api-key) API_KEY="$2"; shift 2 ;;
    --no-key) SKIP_KEY=1; shift ;;
    -h|--help)
      sed -n '2,12p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *) echo "guesswork: unknown option $1" >&2; exit 2 ;;
  esac
done

info()  { printf '\033[1;34m==>\033[0m %s\n' "$1"; }
warn()  { printf '\033[1;33m!!\033[0m %s\n' "$1" >&2; }
fail()  { printf '\033[1;31merror:\033[0m %s\n' "$1" >&2; exit 1; }

# ---------------------------------------------------------------- prereqs --

command -v zsh >/dev/null 2>&1 || fail "zsh is required but not on PATH"

if ! command -v node >/dev/null 2>&1; then
  fail "node is required but not on PATH (need node 22+)"
fi
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
if [[ "$NODE_MAJOR" -lt 22 ]]; then
  fail "node 22+ is required (found $(node -v)); guesswork runs its CLI as TypeScript directly"
fi

# ---------------------------------------------------------------- fetch ----

if [[ -f "$(dirname "$0")/package.json" ]] && grep -q '"name": "guesswork"' "$(dirname "$0")/package.json" 2>/dev/null; then
  # Running from inside an existing checkout: install in place.
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

# -------------------------------------------------------------- API key ---

if [[ $SKIP_KEY -eq 0 && -z "$API_KEY" ]]; then
  if [[ -t 0 ]]; then
    info "guesswork needs a TypeSafe API key (get one at https://typesafe.ai)"
    read -r -s -p "Paste your TYPESAFE_API_KEY (leave blank to skip): " API_KEY
    echo
  else
    warn "no TYPESAFE_API_KEY in the environment and no TTY to prompt; skipping key setup"
  fi
fi

# --------------------------------------------------------------- .zshrc ---

TMP_BLOCK="$(mktemp)"
trap 'rm -f "$TMP_BLOCK"' EXIT
{
  echo "$BLOCK_START"
  [[ -n "$API_KEY" ]] && echo "export TYPESAFE_API_KEY=$API_KEY"
  echo "source \"$INSTALL_DIR/zsh/guesswork.plugin.zsh\""
  echo "$BLOCK_END"
} > "$TMP_BLOCK"

touch "$ZSHRC"
if grep -qF "$BLOCK_START" "$ZSHRC"; then
  info "updating existing guesswork block in $ZSHRC"
  # Replace the block between the markers, in place, portably (BSD and GNU sed).
  awk -v start="$BLOCK_START" -v end="$BLOCK_END" -v blockfile="$TMP_BLOCK" '
    $0 == start { while ((getline line < blockfile) > 0) print line; skip = 1; next }
    $0 == end   { skip = 0; next }
    !skip { print }
  ' "$ZSHRC" > "$ZSHRC.guesswork.tmp"
  mv "$ZSHRC.guesswork.tmp" "$ZSHRC"
else
  info "adding guesswork to $ZSHRC"
  { echo; cat "$TMP_BLOCK"; } >> "$ZSHRC"
fi

# ---------------------------------------------------------------- done ----

echo
info "guesswork is installed at $INSTALL_DIR"
if [[ -z "$API_KEY" && $SKIP_KEY -eq 0 ]]; then
  warn "no API key set — add 'export TYPESAFE_API_KEY=...' above the source line in $ZSHRC"
fi
info "run 'exec zsh' (or open a new terminal) to start using it"
