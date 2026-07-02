# dashboard-template

Drop-in Preact + esbuild Obsidian plugin that renders the comind-dashboard.
In this template it builds **in-place** against the project vault — run
`make dashboard` from the repo root. The standalone external-vault flow (Phase 11
of the build guide) still works too.

## What you get

- **Header** — title, live status (`boot`/`live`/`error`), refresh button
- **Tabs** — defined in `dashboard.config.json` (default `overview` / `tasks` / `activity`)
- **Token-burn chart** — animated meter against your Claude 5h budget, with projection ray (overview tab)
- **Metric cards** — animated numbers, status dots, delta arrows, optional radial-arc hero. Default set targets a developer workflow (open/in-progress/blocked tasks, runs today, commits today)
- **Schedule list** — today's events from the daily note's `## Schedule` section (overview)
- **Focus + Top 3** — current focus and editable top-3 priorities (tasks tab)
- **Daily Drivers checklist** — interactive toggles that write back to the daily note
- **Action bar** — buttons that queue intent JSON to `_workspace/system/queue/`. Skills needing args open `IntentArgModal`
- **Activity Feed** — recent runs from `_workspace/system/runs/` with clickable deliverables (activity tab)
- **Footer** — online/offline runner status, last-pull metadata, next-pull ETA

Aesthetic: **native Obsidian theme**. All design tokens map onto Obsidian's CSS
variables (`--background-*`, `--text-*`, `--interactive-accent`, `--accent-h/s/l`),
so the dashboard inherits the user's active theme — light or dark — and accent color
automatically. Sans-serif UI font; monospace only for numeric/log readouts.

## Install (in-place, recommended)

From the repo root:

```bash
make dashboard          # npm install + build → <vault>/.obsidian/plugins/dashboard/
make dashboard-runner   # start the queue runner daemon against this vault
```

Then open the project as an Obsidian vault and enable the **Dashboard** plugin.
`make dashboard-dev` runs esbuild in watch mode for hot reload while editing.

## Customize (config-driven, no rebuild)

All composition — tabs, metric cards, action buttons, chart bindings — lives in
`<vaultSystemPath>/dashboard.config.json` (default
`_workspace/system/dashboard.config.json`), not in TSX. The workflow:

1. Edit `dashboard.config.json` (the plugin writes a default one on first launch
   if the file is missing).
2. After editing, run `npm run validate:config` from this directory — exit 0 +
   "OK", or exit 1 with path-precise errors.
3. The plugin watches the file and re-renders live on save — no rebuild.

Card `key`s MUST match a `<source>:<metric>` your pull scripts emit (see
`_workspace/system/metrics/metrics.csv`); cards with no matching CSV row render
an empty-state ("no data") — safe to leave in. Button `skill`s MUST match a
`case` in your `runner.js` `buildPrompt()` switch (Phase 7 of the build guide).

### Adapting the dashboard (for agents)

Schema (v1) — `dashboard.config.json`:

- `version` — integer, must be `1`.
- `tabs` — 1..8 of `{ id, label }`; `id` `[a-z0-9-]+` unique; `label` non-empty.
- `widgets` — array; render order = config order. Every widget has `type`
  (registry key) and `tabs` (non-empty array of declared tab ids). Per-type props:
  - `metric-grid`: `cards` (1..24) of `{ key, label, format: "currency"|"integer"|"compact"|"percent", hero?: boolean }`
  - `token-burn-chart`: `source` (string), `metric` (string) — the metrics.csv series to plot
  - `activity-feed`: `limit` (int 1..50, default 8)
  - `action-bar`: `buttons` (1..16) of `{ skill, label, prompt?: "topic"|"url", promptLabel?, placeholder? }`
  - `focus` / `top3` / `daily-drivers` / `schedule` / `runs`: no extra props
- Unknown top-level keys, unknown widget `type`, or unknown per-widget props are
  validation errors.

After editing `dashboard.config.json`, run `npm run validate:config` (optionally
pass a path) from this directory. Error behavior at runtime: an invalid config
shows a banner in the pane listing the exact errors and the dashboard keeps
rendering the last-good config (or the default); a single widget with an unknown
type or bad props renders an inline error card in its slot while the rest render
normally. A missing config file is replaced with the written default plus a notice.

### (optional) restyle

The look follows the Obsidian theme out of the box. To override, edit the token
block at the top of `styles.css` (`.dash-root { --cc-*: … }`) — point the tokens at
your own colors instead of the Obsidian variables.

## What's in here

```
dashboard-template/
├── src/
│   ├── main.ts              # plugin entry (DashboardPlugin class)
│   ├── view.tsx             # ItemView wrapper (view type: comind-dashboard)
│   ├── settings.ts          # settings tab (vault path, token budget, pull cadence)
│   ├── components/
│   │   ├── Dashboard.tsx           # top-level shell — header, tabs, layout
│   │   ├── MetricCard.tsx          # animated card with status dot + delta
│   │   ├── MetricRadialArc.tsx     # SVG ring gauge (hero cards)
│   │   ├── TokenBurnChart.tsx      # 5h budget meter w/ projection
│   │   ├── ActionBar.tsx           # skill buttons (queue intents)
│   │   ├── IntentArgModal.ts       # Obsidian Modal for string-arg skills
│   │   ├── DailyDriversChecklist.tsx  # interactive checkbox list
│   │   ├── ScheduleList.tsx        # today's calendar events
│   │   ├── Top3Priorities.tsx      # editable top-3 priorities
│   │   ├── FocusCard.tsx           # current focus
│   │   └── ActivityFeed.tsx        # recent runs
│   └── lib/
│       ├── config.ts        # dashboard.config.json types, defaults, validateConfig
│       ├── metrics.ts       # CSV parser, snapshot grouping, series
│       ├── vault.ts         # daily-note parser (focus/top3/drivers/schedule)
│       ├── vault-writer.ts  # toggles daily-note checkboxes
│       ├── queue.ts         # intent writer + run-record reader
│       └── status.ts        # runner heartbeat + next-pull math
├── scripts/
│   └── validate-config.mjs  # npm run validate:config — CLI config validator
├── styles.css
├── tsconfig.json
├── esbuild.config.mjs       # in-place build (reads DASHBOARD_PLUGIN_DIR)
├── package.json
├── manifest.json
├── manifest.json.template   # external-vault build-guide path
├── package.json.template    # "
└── esbuild.config.mjs.template  # "
```

## CSS class namespace

All classes use the `dash-` prefix. Functional — won't collide with anything.

## Required vault state

The dashboard reads these paths (the runner + a metrics-pull skill create them):

- `_workspace/system/dashboard.config.json` — dashboard composition (written with defaults on first launch if missing)
- `_workspace/system/metrics/metrics.csv` — metric rows
- `_workspace/system/metrics/last-pull.json` — pull snapshot
- `_workspace/system/runner-status.json` — runner heartbeat
- `_workspace/system/runs/*.json` — one per skill completion
- `daily-notes/YYYY-MM-DD.md` — daily note, frontmatter `schema_version: 1`
- `_workspace/system/queue/` — plugin writes intents here (runner creates the dir)

If any are missing, the dashboard renders empty-state placeholders instead of crashing.

## License

Same as parent repo.
