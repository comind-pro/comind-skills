---
type: adr
date: 2026-07-02
status: accepted
tags: [dashboard, plugin, design]
---

# Dashboard plugin redesign: config-driven widget registry

## Decision

Move all dashboard composition — tabs, widgets, metric cards, action buttons,
chart bindings — out of hardcoded TSX into a vault-resident
`dashboard.config.json`. The plugin renders from config through a widget
registry, watches the file, and re-renders live. An agent adapts the dashboard
by editing JSON and running a CLI validator — no rebuild, no TSX.

## Why

Customization today means editing `CARDS` / `BUTTONS` / `TABS` arrays inside
`Dashboard.tsx` / `ActionBar.tsx` and recompiling. An agent can do that, but
every tweak is a build cycle and generated TSX is fragile. Config + validator
is the interface agents are best at: read schema, edit JSON, check errors.

## Config schema (v1) — contract for all implementers

Location: `<settings.vaultSystemPath>/dashboard.config.json`
(default `_workspace/system/dashboard.config.json`).

```json
{
  "version": 1,
  "tabs": [
    { "id": "overview", "label": "Overview" },
    { "id": "tasks", "label": "Tasks" },
    { "id": "activity", "label": "Activity" }
  ],
  "widgets": [
    {
      "type": "metric-grid",
      "tabs": ["overview", "tasks"],
      "cards": [
        { "key": "tasks:open", "label": "Open Tasks", "format": "integer", "hero": false }
      ]
    },
    { "type": "token-burn-chart", "tabs": ["overview"], "source": "claude_code", "metric": "tokens_5h" },
    { "type": "focus", "tabs": ["overview"] },
    { "type": "top3", "tabs": ["overview"] },
    { "type": "daily-drivers", "tabs": ["overview"] },
    { "type": "schedule", "tabs": ["overview"] },
    {
      "type": "action-bar",
      "tabs": ["overview"],
      "buttons": [
        { "skill": "metrics-pull", "label": "Pull Metrics" },
        { "skill": "deep-research", "label": "Deep Research…", "prompt": "topic",
          "promptLabel": "Deep research — topic", "placeholder": "e.g. agent rotations" }
      ]
    },
    { "type": "activity-feed", "tabs": ["activity"], "limit": 8 }
  ]
}
```

Rules:

- `version` — integer, must be `1`.
- `tabs` — 1..8 entries; `id` `[a-z0-9-]+` unique; `label` non-empty string.
- `widgets` — array; render order = config order.
- Every widget: `type` (registry key), `tabs` (non-empty array of declared tab ids).
- Per-type props:
  - `metric-grid`: `cards` (1..24) of `{ key, label, format: "currency"|"integer"|"compact"|"percent", hero?: boolean }`. `key` is the `<source>:<metric>` the pull scripts emit.
  - `token-burn-chart`: `source` (string), `metric` (string) — the metrics.csv series to plot.
  - `activity-feed`: `limit` (int 1..50, default 8).
  - `action-bar`: `buttons` (1..16) of `{ skill, label, prompt?: "topic"|"url", promptLabel?, placeholder? }`.
  - `focus` / `top3` / `daily-drivers` / `schedule` / `runs`: no extra props.
- Unknown top-level keys, unknown widget `type`, unknown per-widget props → validation errors (fail closed in the validator; the plugin renders an error card for that widget and continues).

## Components

1. **`src/lib/config.ts`** — types (`DashboardConfig`, `WidgetSpec` union),
   `DEFAULT_CONFIG` (seeded from today's hardcoded values), pure
   `validateConfig(raw: unknown): { config?: DashboardConfig; errors: string[] }`
   with path-precise messages (`widgets[2].cards[0].format: unknown value "money"`).
   No dependencies — hand-rolled checks, shared verbatim by plugin and CLI.
2. **`scripts/validate-config.mjs`** + `npm run validate:config [path]` —
   CLI wrapper for agents: exit 0 + "OK" or exit 1 + error list. Bundles the
   same validator via esbuild-free import (plain re-implementation is
   forbidden — single source of truth; use esbuild to prebundle or import the
   TS via a build step, implementer's choice as long as logic isn't duplicated).
3. **Loader in plugin** — on view mount: read config file; missing → write
   `DEFAULT_CONFIG` to the vault (agent gets a file to edit) and proceed;
   invalid → banner listing errors + fall back to last-good (or default).
   Vault watcher on the config path → live re-render on change.
4. **`Dashboard.tsx`** — delete `CARDS`/`TABS` hardcodes; tabs and widget
   sequence render from config through a registry map
   `Record<WidgetType, (props) => VNode>` wrapping the existing components.
   Fix the hardcoded `_workspace/system/metrics/metrics.csv` watcher path →
   derive from `settings.vaultSystemPath`. `TODAY_PATH` module-level const →
   computed per render day.
5. **`ActionBar.tsx`** — `BUTTONS` hardcode dies; buttons come via props from
   config.
6. **Docs** — `dashboard-build-guide.md`, `dashboard-build/SKILL.md`,
   template README, `_workspace/dashboard/README.md`: customization sections
   now say "edit `dashboard.config.json`, run `npm run validate:config`";
   CUSTOMIZE comments in code point at the config file.

## Error handling

- Config file unreadable/missing → default config written + used; notice shown.
- JSON parse error / validation errors → banner in dashboard with exact
  messages; keep rendering last-good config.
- Widget with unknown type or invalid props (runtime drift) → inline error
  card in its slot; other widgets unaffected.
- Validator CLI: non-zero exit on any error — agent-checkable.

## Validation criteria (definition of done)

1. `npm run build` green (tsc noEmit + esbuild).
2. `npm run validate:config` on the default/seed config → 0 errors.
3. Negative test: deliberately broken config (bad format value, unknown
   widget, orphan tab ref) → validator reports each with a path, exit 1.
4. `make dashboard-build` refreshes `.obsidian/plugins/dashboard/` and the
   plugin loads (manual Obsidian check by user; hot-reload installed).
5. No `CUSTOMIZE`-by-editing-TSX comments left; docs updated consistently.

## Alternatives rejected

- **Cards-only config** — tabs/actions stay frozen; agent still recompiles
  for real changes. Half-measure.
- **Agent edits TSX + rebuild skill** — every change is a compile; generated
  TSX fragile; no runtime validation surface.
