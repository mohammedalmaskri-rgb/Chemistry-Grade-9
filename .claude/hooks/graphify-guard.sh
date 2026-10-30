#!/bin/bash
# PreToolUse: run graphify's query-first nudge when graphify is installed;
# otherwise do nothing, so a missing install never blocks a tool call.
export PATH="$HOME/.local/bin:$PATH"
command -v graphify >/dev/null || exit 0
exec graphify hook-guard "$1"
