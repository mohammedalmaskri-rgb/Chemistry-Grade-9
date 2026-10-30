## graphify

This project has a code knowledge graph at graphify-out/graph.json (functions, files, SQL objects and their calls/imports). A SessionStart hook installs graphify and builds or refreshes the graph automatically.

Rules:
- For any codebase question, run `graphify query "<question>" --budget 1000` before your first grep, search or full-file read. Raise `--budget` only if the output says TRUNCATED. Put this rule in every subagent prompt that explores code.
- Use `graphify explain "<name>"` for one function, `graphify path "<A>" "<B>"` for how two things connect, and `graphify affected "<name>"` before changing a shared function.
- Then read only the lines the graph located (`Read` with offset/limit). app.js is large and minified per line; never read it whole.
- The graph does not see handlers wired via `onclick=`/`addEventListener` or calls inside anonymous callbacks; confirm such call sites with a targeted grep.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review.
- Edits made with Edit/Write refresh the graph automatically. After changing code any other way (sed, scripts, git pull), run `graphify update .` (AST-only, no API cost).
- Never commit graphify-out/; it is rebuilt locally each session.
