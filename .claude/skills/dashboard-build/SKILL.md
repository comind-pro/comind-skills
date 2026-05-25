---
name: dashboard-build
description: Builds a personal agentic-OS observability dashboard — an Obsidian-native plugin backed by a markdown vault, a queue-watching runner daemon, metric-pull scripts, and an activity-log hook. Use when a user wants a dashboard for their Claude Code skills, asks to "build the dashboard" / "build my agentic OS" / "set up the dashboard", or as Part 3 of the agentic-OS build (after skills in Part 1). Drives an 11-phase build with a customization interview and per-phase verify/fix gates. Installs from the vendored `_workspace/dashboard/` templates in this repo.
---

# Dashboard Build

## Overview

This skill builds the observability layer of a personal agentic operating
system: a dashboard pane inside Obsidian that surfaces the metrics and one-click
actions a user cares about, backed by a markdown vault that doubles as memory.

The architecture is universal; the specifics swap per user:

- **Vault** — Karpathy 3-stage folders (staging → working → output) + knowledge
  + plumbing, with a **frozen daily-note schema** acting as the parser contract
  between every writer (skills, hook, plugin) and reader (plugin, Bases).
- **Plugin** — Obsidian plugin shell (Preact + esbuild + Hot Reload) rendering
  the dashboard: metric cards, action bar, daily-note panel, activity feed.
- **Runner** — Node daemon watching `system/queue/`, spawning headless
  `claude -p` subprocesses per intent, writing run records to `system/runs/`.
- **Metrics** — one skill, one pull-script per metric (API / scrape / local),
  refreshed on cadence + on demand.
- **Hook** — PostToolUse hook logging Claude's tool calls into the daily note.
- **MCP** — Anthropic Gmail / Calendar connectors (one-click OAuth, optional).

It is **Part 3** of the agentic-OS build. Part 1 (`skill-architecture`) builds
the skills the dashboard's action bar invokes; Phases 1–2 here are the Part 2
memory layer. Run Part 1 first — the dashboard is the surface, the skills are the
substance.

## When to Use

Apply this skill when:

- The user wants a visual dashboard / dashboard for their Claude Code skills
- The user invokes: "build the dashboard", "build my agentic OS", "set up the
  dashboard", "/build-dashboard"
- They've finished Part 1 (`skill-architecture`) and want the observability layer

**When NOT to use:**

- The user only wants skills → use `skill-architecture` (Part 1)
- The user wants a distribution-ready local web dashboard instead of an
  Obsidian-native one → that's the Streamlit path (not built into this template)
- Non-interactive contexts — this is an interactive, gated build

## Source of Truth

The build code is **vendored in this repo at `_workspace/dashboard/`** — do NOT clone the
external `agentic-os-runner` repo the original guide references. Wherever the
guide says "copy `<path>` from the cloned repo," read it as "copy from
`_workspace/dashboard/`":

| Guide reference (external) | This repo (vendored) |
|---|---|
| `~/projects/agentic-os-runner/runner/` | `_workspace/dashboard/runner/` |
| `~/projects/agentic-os-runner/hooks/` | `_workspace/dashboard/hooks/` |
| `~/projects/agentic-os-runner/metric-scripts/` | `_workspace/dashboard/metric-scripts/` |
| `~/projects/agentic-os-runner/dashboard-template/` | `_workspace/dashboard/dashboard-template/` |

The full adapted phase-by-phase guide — every `[ACTION]`, `[VERIFY]`, `[FIX]`
block — lives in `_workspace/references/dashboard-build-guide.md`. Load it and
follow it exactly. The stages below are the contract.

## Vault Path

The runner and hook resolve the vault root in this order:

1. `AGENTIC_OS_VAULT` environment variable
2. `AGENTIC_OS_VAULT` in `~/.claude/.env`
3. Fallback `~/the-vault`

Set `AGENTIC_OS_VAULT` once to the user's chosen vault and the whole stack picks
it up. The plugin reads vault-relative paths through Obsidian's adapter; only its
`esbuild.config.mjs` `VAULT_PLUGIN_DIR` needs an absolute path.

## The Process

Run the phases in order. Pause for confirmation between phases. Do NOT skip the
`[VERIFY]` checks — if a verify fails, branch into the matching `[FIX]` block and
ask the user before proceeding.

| Phase | What it builds |
|---|---|
| 0 | Customization interview — capture `$DOMAIN`, `$METRICS`, `$SKILLS`, `$WANT_GMAIL`, `$WANT_CALENDAR`, `$FOLDER_MODEL`, `$PALETTE`, `$OS`. Confirm summary before any code. |
| Pre-flight | Verify Node 20+, npm 10+, Python 3.11+, git, Claude CLI, Obsidian 1.9.10+. |
| 1 | Vault skeleton — 8 folders + `CLAUDE.md` + `_index.md`. |
| 2 | Frozen daily-note schema (the parser contract) + Templater template. |
| 3 | Plugin scaffold (Preact + esbuild) — minimal placeholder pane renders. |
| 4 | Metrics-pull skill + one pull-script per `$METRIC`, cron-scheduled. |
| 5 | Runner daemon — queue → headless `claude -p` → runs, auto-launch at login. |
| 6 | MCP connectors (Gmail / Calendar) — skip if both wanted-flags false. |
| 7 | Routine skills (from Part 1) wired to the runner's `buildPrompt` switch. |
| 8 | PostToolUse activity-log hook → daily note's `## Activity Log`. |
| 9 | Bases sidebar — frontmatter-driven project + pipeline queries. |
| 10 | Iconize aesthetic pass — color-code the folder model per `$PALETTE`. |
| 11 | Full dashboard UI — replace the placeholder with the HUD pane. |

Finish with the end-to-end smoke test (8 steps) from the reference.

## The Load-Bearing Invariant

The **frozen daily-note schema** is what lets every writer and reader compose
without coordinating. Heading matches are EXACT — renaming any heading is a
parser miss. If the user copies one habit from this build, it's schema-first
discipline. Treat `system/schemas/daily-note.md` as immutable once frozen.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "Skip the Phase 0 interview, use defaults" | The interview fills the `$VARIABLES` every later phase reads. Skipping it means hardcoding the reference creator's YouTube domain. Run it. |
| "Clone the external repo like the guide says" | The code is vendored in `_workspace/dashboard/`. Cloning re-introduces an external dependency the boilerplate removed. |
| "Skip the [VERIFY] checks to move faster" | Each phase depends on the last. An unverified Phase 3 means a blank pane in Phase 11 with no idea why. |
| "Rename a daily-note heading to be clearer" | Headings are the parser contract. Renaming silently empties cards. The schema is frozen for a reason. |
| "Build all phases without pausing" | Phases gate on user confirmation (vault path, OS, palette). Auto-running locks in wrong choices. |

## Red Flags

- Writing code before the Phase 0 summary is confirmed
- Cloning `agentic-os-runner` instead of using `_workspace/dashboard/`
- Editing a frozen daily-note heading
- Skipping a `[VERIFY]` block or proceeding past a failed one without the `[FIX]`
- Hardcoding the reference creator's metrics/skills (YouTube, content-cascade)
  instead of the user's `$METRICS` / `$SKILLS`
- Putting wallet keys / API keys in files instead of `~/.claude/.env`

## Verification

After the build:

- [ ] Phase 0 summary was confirmed before any code was written
- [ ] Pre-flight tool versions all passed (Node 20+, Python 3.11+, Obsidian 1.9.10+)
- [ ] Vault skeleton + frozen daily-note schema exist and render in Obsidian
- [ ] Plugin pane opens (placeholder in Phase 3, full HUD in Phase 11)
- [ ] Runner heartbeat (`system/runner-status.json`) is fresh after launch
- [ ] Metrics-pull writes rows to `system/metrics/metrics.csv` with `status: ok`
- [ ] Activity-log hook appends to the daily note's `## Activity Log`
- [ ] Each Part-1 skill wired into the action bar has a `buildPrompt` case
- [ ] The 8-step end-to-end smoke test passes
- [ ] All installs read from `_workspace/dashboard/`, no external clone
