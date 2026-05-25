# dashboard-template

Drop-in Preact + esbuild Obsidian plugin that renders the comind-dashboard.
In this template it builds **in-place** against the project vault — run
`make dashboard` from the repo root. The standalone external-vault flow (Phase 11
of the build guide) still works too.

## What you get

- **Header** — title, live status (`boot`/`live`/`error`), refresh button
- **Tabs** — `overview` / `tasks` / `activity`
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

## Customize (2 swap-points)

### 1. `src/components/Dashboard.tsx` — pick which metrics show

Find the `CARDS` array (search `// CUSTOMIZE`). Each entry's `key` MUST match a
`<source>:<metric>` your pull scripts emit (see `_workspace/system/metrics/metrics.csv`).
Drop cards you don't have; add new ones. Each card also lists which `tabs` it shows on.

```typescript
const CARDS: CardSpec[] = [
  { key: "tasks:open", label: "Open Tasks", format: "integer", tabs: ["overview", "tasks"] },
  // … more
];
```

Cards with no matching CSV row render an empty-state ("no data") — safe to leave in.

### 2. `src/components/ActionBar.tsx` — pick which skills get buttons

Find the `BUTTONS` array. Each entry's `skill` MUST match a `case` in your
`runner.js` `buildPrompt()` switch (Phase 7 of the build guide). Skills needing
args get a `prompt` field — opens `IntentArgModal` on click.

```typescript
const BUTTONS: ButtonSpec[] = [
  { skill: "plan-today", label: "Plan Today" },
  // … more
];
```

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
│       ├── metrics.ts       # CSV parser, snapshot grouping, series
│       ├── vault.ts         # daily-note parser (focus/top3/drivers/schedule)
│       ├── vault-writer.ts  # toggles daily-note checkboxes
│       ├── queue.ts         # intent writer + run-record reader
│       └── status.ts        # runner heartbeat + next-pull math
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

- `_workspace/system/metrics/metrics.csv` — metric rows
- `_workspace/system/metrics/last-pull.json` — pull snapshot
- `_workspace/system/runner-status.json` — runner heartbeat
- `_workspace/system/runs/*.json` — one per skill completion
- `daily-notes/YYYY-MM-DD.md` — daily note, frontmatter `schema_version: 1`
- `_workspace/system/queue/` — plugin writes intents here (runner creates the dir)

If any are missing, the dashboard renders empty-state placeholders instead of crashing.

## License

Same as parent repo.
