# dashboard-template

Drop-in Preact + esbuild Obsidian plugin that renders the full agentic-OS dashboard. Used by [Phase 11 of the build guide](../README.md) — most users get here via the build guide, not directly.

## What you get

- **Header** with heartbeat SVG, tabs (overview / audience / research), live status, refresh button
- **Token-burn chart** — animated meter against your Claude 5h budget, with projection ray + comet animation
- **Metric cards** — animated numbers, status dots, delta arrows, tone-tagged styling (`youtube`/`instagram`/`tiktok`/`neutral`), optional radial-arc hero
- **Latest Video card** — thumbnail + stats from `system/metrics/latest-video.json`
- **Schedule list** — today's calendar events from the daily note's `## Schedule` section
- **Daily Drivers checklist** — interactive toggles that write back to the daily note
- **Action bar** — buttons that queue intent JSON to `system/queue/`. Skills needing args open `IntentArgModal`.
- **Research cards** — GitHub Trending, Hacker News, Morning Brief, YT Week Review — placeholders if no data
- **Activity Feed** — recent runs from `system/runs/` with clickable deliverables
- **Footer** — pulsing online/offline runner status, last-pull metadata, next-pull ETA

Aesthetic: dark warm HUD palette (Near Black `#0e0f10` + Terracotta `#c96442` + JetBrains Mono). Corner brackets, scan animations, status-coded color tokens.

## Install (3 minutes)

```bash
# from your project parent dir, scaffold the plugin folder
git clone https://github.com/obsidianmd/obsidian-sample-plugin ~/projects/my-dashboard
cd ~/projects/my-dashboard

# copy template source + styles
cp -r ~/projects/agentic-os-runner/dashboard-template/src/* src/
cp ~/projects/agentic-os-runner/dashboard-template/styles.css styles.css
cp ~/projects/agentic-os-runner/dashboard-template/tsconfig.json tsconfig.json
cp ~/projects/agentic-os-runner/dashboard-template/manifest.json.template manifest.json
cp ~/projects/agentic-os-runner/dashboard-template/package.json.template package.json
cp ~/projects/agentic-os-runner/dashboard-template/esbuild.config.mjs.template esbuild.config.mjs

# install deps + build
npm install
# now customize the 3 CUSTOMIZE blocks (see below), then:
npm run build
```

## Customize (3 swap-points)

### 1. `esbuild.config.mjs` — point at your vault

Find:

```javascript
const VAULT_PLUGIN_DIR = "C:\\Users\\YOU\\your-vault\\.obsidian\\plugins\\my-dashboard";
```

Replace with your vault's absolute path.

### 2. `src/components/Dashboard.tsx` — pick which metrics show

Find the `CARDS` array (search `// CUSTOMIZE`). Each entry's `key` MUST match a `<source>:<metric>` your pull scripts emit. Drop cards you don't have; add new ones.

```typescript
const CARDS: CardSpec[] = [
  { key: "youtube:subscribers", label: "YouTube Subs", format: "integer", tabs: ["overview", "audience"], tone: "youtube" },
  // … more
];
```

Cards with no matching CSV row render an empty-state ("no data") — safe to leave in for skills you plan to wire later.

### 3. `src/components/ActionBar.tsx` — pick which skills get buttons

Find the `BUTTONS` array. Each entry's `skill` MUST match a `case` in your `runner.js` `buildPrompt()` switch (Phase 7 of the build guide).

```typescript
const BUTTONS: ButtonSpec[] = [
  { skill: "plan-today", label: "Plan Today" },
  // … more
];
```

Skills needing args (`deep-research` topic, `content-cascade` URL) get a `prompt` field — opens `IntentArgModal` on click.

### 4. (optional) `styles.css` — palette swap

Find the `:root` block at the top. Swap `--accent`, `--bg`, `--text` etc. per your `$PALETTE` from Phase 0.

## What's in here

```
dashboard-template/
├── src/
│   ├── main.ts              # plugin entry (DashboardPlugin class)
│   ├── view.tsx             # ItemView wrapper
│   ├── settings.ts          # plugin settings tab (vault path, token budget, pull cadence)
│   ├── components/
│   │   ├── Dashboard.tsx              # top-level shell — header, tabs, layout
│   │   ├── MetricCard.tsx           # animated card with status dot + delta
│   │   ├── MetricRadialArc.tsx      # SVG ring gauge (used for hero cards)
│   │   ├── TokenBurnChart.tsx       # 5h budget meter w/ projection
│   │   ├── ActionBar.tsx            # skill buttons (queue intents)
│   │   ├── IntentArgModal.ts        # Obsidian Modal for string-arg skills
│   │   ├── DailyDriversChecklist.tsx  # interactive checkbox list
│   │   ├── ScheduleList.tsx         # today's calendar events
│   │   ├── FocusCard.tsx            # focus + top 3 highlight
│   │   ├── LatestVideoCard.tsx      # YouTube latest thumbnail
│   │   ├── GithubTrendingCard.tsx
│   │   ├── HackerNewsCard.tsx
│   │   ├── MorningBriefCard.tsx
│   │   ├── YtWeekReviewCard.tsx
│   │   └── ActivityFeed.tsx
│   └── lib/
│       ├── metrics.ts        # CSV parser, snapshot grouping, series for sparklines
│       ├── vault.ts          # daily-note parser (focus/top3/drivers/schedule)
│       ├── vault-writer.ts   # toggles daily-note checkboxes
│       ├── queue.ts          # intent writer + run-record reader
│       ├── status.ts         # runner heartbeat + next-pull math
│       ├── youtube.ts        # latest-video.json reader
│       ├── morningBrief.ts   # finds latest morning report
│       ├── ytReview.ts       # finds latest yt-review
│       ├── reports.ts        # generic report scanner
│       └── hackernews.ts     # HN top-stories fetcher with cache
├── styles.css                # 2.7k lines of HUD CSS
├── tsconfig.json
├── manifest.json.template
├── package.json.template
└── esbuild.config.mjs.template
```

## CSS class namespace

All classes use the `chase-cc-` prefix (the original author's initials). Functional — won't collide with anything. Rename project-wide via `find src styles.css -type f | xargs sed -i 's/chase-cc-/your-prefix-/g'` if you want.

## Required vault state

The dashboard reads these paths (Phase 1-9 of the build guide creates them):

- `system/metrics/metrics.csv` — written by Phase 4 pull scripts
- `system/metrics/last-pull.json` — same
- `system/metrics/latest-video.json` — optional, written by a YT pull script with snapshot support
- `system/runner-status.json` — written by Phase 5 runner heartbeat
- `system/runs/*.json` — written by Phase 5 runner on each skill completion
- `daily-notes/YYYY-MM-DD.md` — written by Phase 7 `plan-today` skill, mandatory frontmatter `schema_version: 1`
- `system/queue/` — empty dir, plugin writes intents here

If any are missing, the dashboard renders empty-state placeholders instead of crashing.

## License

Same as parent repo.
