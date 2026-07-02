# dashboard — comind-dashboard code

Vendored build code for the `dashboard-build` skill (`/build-dashboard`, comind-dashboard
Part 3). The full phase-by-phase build guide lives at
`_workspace/docs/references/dashboard-build-guide.md`; this directory holds the code
each phase installs.

Neutralized for this boilerplate: domain-specific demo skills were removed and the
hardcoded timezone made configurable (`COMIND_TZ`). The remaining runner cases
(`plan-today`, `refresh-schedule`,
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

## Customizing the dashboard

Dashboard composition (tabs, metric cards, action buttons, chart bindings) is
config-driven: edit `<vaultSystemPath>/dashboard.config.json` (default
`_workspace/system/dashboard.config.json`), then run `npm run validate:config`
from `dashboard-template/`. The plugin watches the file and re-renders live —
no TSX edits, no rebuild. Schema + error behavior: see
`dashboard-template/README.md` ("Adapting the dashboard").

## Configuration

Both `runner.js` and `activity-log.js` resolve the vault root in this order:

1. `COMIND_VAULT` environment variable
2. `COMIND_VAULT` entry inside `~/.claude/.env`
3. Fallback: the project root the script lives in (dir containing `_workspace/`,
   found by walking up) — the vault IS the project, no separate vault to set up

The runner also reads `COMIND_TZ` (env → `~/.claude/.env` → fallback `UTC`)
for "today"/"tomorrow" date math and calendar windows. Use an IANA name, e.g.
`Europe/Kyiv`, `America/Chicago`, `Asia/Tokyo`.

Set these once and the whole stack picks them up.

## Requirements

- Node.js 20+ (runner + hook)
- Python 3.11+ with `playwright` for scrape-template pulls
- Claude Code CLI authenticated
- Obsidian 1.9.10+ (for the vault these scripts read/write + Bases in Phase 9)

