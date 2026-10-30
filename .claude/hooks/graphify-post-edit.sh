#!/bin/bash
# PostToolUse (Edit|Write|MultiEdit): refresh the graph in the background after a
# code file changes. Prints nothing, so it adds no tokens to the conversation.
cd "${CLAUDE_PROJECT_DIR:-$(dirname "$0")/../..}" || exit 0
export PATH="$HOME/.local/bin:$PATH"
command -v graphify >/dev/null || exit 0

file=$(python3 -c 'import json,sys; print(json.load(sys.stdin).get("tool_input",{}).get("file_path",""))' 2>/dev/null)
case "$file" in
  */graphify-out/*|*/vendor/*) exit 0 ;;
  *.js|*.mjs|*.ts|*.py|*.sql|*.sh) ;;
  *) exit 0 ;;
esac

mkdir -p graphify-out
# flock: one update at a time; later edits are picked up by the next run
nohup flock -n graphify-out/.update.lock graphify update . >/dev/null 2>&1 &
exit 0
