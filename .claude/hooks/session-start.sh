#!/bin/bash
# SessionStart: make sure graphify is installed and the code graph is current.
# Touches nothing outside graphify-out/ and .git/info/exclude.
set -euo pipefail

GRAPHIFY_VERSION="0.9.97"
cd "${CLAUDE_PROJECT_DIR:-$(dirname "$0")/../..}"
export PATH="$HOME/.local/bin:$PATH"

# 1. Install graphify (pinned) if missing or on another version
if ! graphify --version 2>/dev/null | grep -qx "graphify $GRAPHIFY_VERSION"; then
  if command -v uv >/dev/null; then
    uv tool install --force "graphifyy[sql]==$GRAPHIFY_VERSION" >/dev/null
  else
    python3 -m pip install --user --quiet "graphifyy[sql]==$GRAPHIFY_VERSION"
  fi
fi

[ -n "${CLAUDE_ENV_FILE:-}" ] && echo "export PATH=\"$HOME/.local/bin:\$PATH\"" >> "$CLAUDE_ENV_FILE"

# 2. Keep the generated graph out of git without editing tracked files
exclude=.git/info/exclude
if [ -d .git ] && ! grep -qx 'graphify-out/' "$exclude" 2>/dev/null; then
  printf '\n# graphify local output\ngraphify-out/\n' >> "$exclude"
fi

# 3. Build the graph (local AST only, no LLM, ~3s) or update it incrementally
if [ ! -f graphify-out/graph.json ]; then
  graphify extract . --code-only >/dev/null 2>&1
  graphify cluster-only . --no-label >/dev/null 2>&1
else
  graphify update . >/dev/null 2>&1 || true
fi

echo "graphify $GRAPHIFY_VERSION ready: graph at graphify-out/graph.json"
