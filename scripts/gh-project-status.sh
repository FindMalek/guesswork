#!/usr/bin/env bash
# Moves an issue or PR's item on the Guesswork GitHub Project (#14) to a given Status.
#
# Usage: scripts/gh-project-status.sh <issue-or-pr-number> <status>
#   status: one of Thought | Backlog | Ready | "In progress" | "In review" | "On hold" | Done
set -euo pipefail

OWNER="FindMalek"
PROJECT_NUMBER=14
PROJECT_ID="PVT_kwHOBHAtp84Bj7eT"
STATUS_FIELD_ID="PVTSSF_lAHOBHAtp84Bj7eTzhiuBBw"

NUMBER="${1:?usage: gh-project-status.sh <issue-or-pr-number> <status>}"
STATUS="${2:?usage: gh-project-status.sh <issue-or-pr-number> <status>}"

case "$STATUS" in
  Thought) OPTION_ID="0def29db" ;;
  Backlog) OPTION_ID="6eace16d" ;;
  Ready) OPTION_ID="6c6ab3ea" ;;
  "In progress") OPTION_ID="1ac4b685" ;;
  "On hold") OPTION_ID="c7b3b0d1" ;;
  "In review") OPTION_ID="823dbfcc" ;;
  Done) OPTION_ID="652f344c" ;;
  *)
    echo "Unknown status '$STATUS'. Expected one of: Thought, Backlog, Ready, 'In progress', 'On hold', 'In review', Done" >&2
    exit 1
    ;;
esac

ITEM_ID=$(gh project item-list "$PROJECT_NUMBER" --owner "$OWNER" --format json --limit 500 \
  | jq -r --argjson n "$NUMBER" '.items[] | select(.content.number == $n) | .id' | head -n1)

if [ -z "$ITEM_ID" ]; then
  echo "No project item found for #$NUMBER on project $PROJECT_NUMBER. Is it added to the board?" >&2
  exit 1
fi

gh project item-edit \
  --id "$ITEM_ID" \
  --project-id "$PROJECT_ID" \
  --field-id "$STATUS_FIELD_ID" \
  --single-select-option-id "$OPTION_ID" \
  > /dev/null

echo "Moved #$NUMBER to '$STATUS'."
