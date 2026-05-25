# dashboard — agentic-OS dashboard code

Vendored build code for the `dashboard-build` skill (`/build-dashboard`, agentic-OS
Part 3). The full phase-by-phase build guide lives at
`_workspace/docs/references/dashboard-build-guide.md`; this directory holds the code
each phase installs.

Adapted from the upstream `cth9191/agentic-os-runner` (MIT) and neutralized for
this boilerplate: the runner's reference-creator domain skills (YouTube /
content-cascade) were removed and the hardcoded `America/Chicago` timezone made
configurable. The remaining runner cases (`plan-today`, `refresh-schedule`,
`plan-tomorrow`, `morning-report`, `inbox-brief`, `deep-research`,
`weekly-review`, `vault-cleanup`, `metrics-pull`) are generic defaults — extend
them per user in Phase 7.

## Contents

```
runner/
  runner.js              # Node daemon — watches the vault's intent queue,
                         # spawns headless `claude -p` subprocesses, writes
                         # run records back to the vault. Parallel pool
                         # (MAX_CONCURRENT=3) + serial-skill + dedupe gates.
  start-runner.vbs       # Windows launcher (drop in Startup folder)
  start-runner.sh        # macOS / Linux launcher
  package.json

hooks/
  activity-log.js        # PostToolUse hook — appends Claude's tool calls to
                         # today's daily note's `## Activity Log` section.
  settings.example.json  # Snippet to merge into ~/.claude/settings.json
  package.json

metric-scripts/
  _common.py             # Shared helpers: CSV append, snapshot write, env loader
  pull_template_api.py   # Template — REST API metric pull
  pull_template_scrape.py# Template — Playwright scrape metric pull
  pull_template_local.py # Template — read a local file as a metric
  run_all.ps1 / run_all.sh

dashboard-template/        # Obsidian plugin (Preact + esbuild) — installed in Phase 11
```

## Configuration

Both `runner.js` and `activity-log.js` resolve the vault root in this order:

1. `AGENTIC_OS_VAULT` environment variable
2. `AGENTIC_OS_VAULT` entry inside `~/.claude/.env`
3. Fallback: `~/the-vault`

The runner also reads `AGENTIC_OS_TZ` (env → `~/.claude/.env` → fallback `UTC`)
for "today"/"tomorrow" date math and calendar windows. Use an IANA name, e.g.
`Europe/Kyiv`, `America/Chicago`, `Asia/Tokyo`.

Set these once and the whole stack picks them up.

## Requirements

- Node.js 20+ (runner + hook)
- Python 3.11+ with `playwright` for scrape-template pulls
- Claude Code CLI authenticated
- Obsidian 1.9.10+ (for the vault these scripts read/write + Bases in Phase 9)

