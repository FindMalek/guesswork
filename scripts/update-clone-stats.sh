#!/usr/bin/env bash
# Updates the running clone-count total shown in README.md.
#
# GitHub's traffic API (repos/{owner}/{repo}/traffic/clones) only reports a
# rolling 14-day window, so this persists each day's count into
# .github/clone-history.json (keyed by date, overwritten idempotently as
# that day's number finalizes) and sums the whole history for a true
# lifetime total — the same "snapshot into a file, sum on read" shape as
# GitHub's own traffic UI uses internally, just durable past 14 days.
#
# Usage: scripts/update-clone-stats.sh <owner/repo>
set -euo pipefail

REPO="${1:?usage: update-clone-stats.sh <owner/repo>}"
HISTORY_FILE=".github/clone-history.json"
README="README.md"
MARKER_START="<!-- clone-stats:start -->"
MARKER_END="<!-- clone-stats:end -->"

[ -f "$HISTORY_FILE" ] || echo '{}' > "$HISTORY_FILE"

CLONES_JSON=$(gh api "repos/$REPO/traffic/clones" --jq '.clones')

UPDATED_HISTORY=$(jq -s '.[0] * (.[1] | map({(.timestamp[0:10]): {count, uniques}}) | add // {})' \
  "$HISTORY_FILE" <(echo "$CLONES_JSON"))
echo "$UPDATED_HISTORY" > "$HISTORY_FILE"

TOTAL=$(jq '[.[].count] | add // 0' "$HISTORY_FILE")
TOTAL_FORMATTED=$(printf "%'d" "$TOTAL" 2>/dev/null || echo "$TOTAL")

BADGE_URL="https://shieldcn.dev/badge/clones-${TOTAL_FORMATTED// /%20}-4c1.svg?variant=secondary"
BADGE_LINE="[![clones](${BADGE_URL})](https://github.com/${REPO})"

awk -v start="$MARKER_START" -v end="$MARKER_END" -v badge="$BADGE_LINE" '
  $0 == start { print; print badge; skip = 1; next }
  $0 == end   { skip = 0 }
  !skip { print }
' "$README" > "$README.tmp"
mv "$README.tmp" "$README"

echo "Total clones: $TOTAL_FORMATTED"
