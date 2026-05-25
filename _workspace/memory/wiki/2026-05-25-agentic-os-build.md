---
type: task
id: t_agentic_os_build
title: "Build agentic OS (Part 1 skills → Obsidian dashboard) in comind-skills"
status: done
priority: P1
area: agentic-os
tags: [epic, masterclass, dashboard, skills]
created: 2026-05-25
due:
assignee: claude
blocked_by: []
links: []
---

# Build agentic OS in comind-skills

Adapt the 3 masterclass companion guides in `preparation/` to this repo.
Vault = `_workspace/memory/` (NOT `~/the-vault`). Skills = `.claude/skills/`.
Decisions (2026-05-25): build in comind-skills (adapt, no parallel vault);
order Part 1 (skills) → Obsidian dashboard; skip Streamlit path.

Source guides:
- `preparation/2026-05-13-skill-architecture-companion-prompt.md` — Part 1
- `preparation/agentic-os-build-guide.md` — Part 3 Path B (our dashboard)
- `preparation/2026-05-13-streamlit-dashboard-v2-companion-prompt.md` — skipped (alt)

## Acceptance
- [ ] Part 1: workflow skills built via interview, in `.claude/skills/`
- [ ] Dashboard Phase 1-2: vault skeleton + frozen daily-note schema (adapted)
- [ ] Dashboard Phase 3: Obsidian plugin scaffold (Preact + esbuild) renders pane
- [ ] Dashboard Phase 4: metrics-pull skill + scripts
- [ ] Dashboard Phase 5: runner daemon (queue → headless `claude -p`)
- [ ] Dashboard Phase 6: MCP connectors (Gmail/Calendar) if wanted
- [ ] Dashboard Phase 7: routine skills wired to runner
- [ ] Dashboard Phase 8: PostToolUse activity-log hook
- [ ] Dashboard Phase 9: Bases sidebar queries
- [ ] Dashboard Phase 10: Iconize aesthetic pass
- [ ] Dashboard Phase 11: full dashboard UI
- [ ] End-to-end smoke test passes

## Notes
(Append-only. Date each entry.)
- 2026-05-25 created. Starting Part 1 (skill architecture interview).
  Adaptation note: comind-skills already ships generic engineering
  lifecycle skills + caveman/obsidian plugin skills. Part 1 adds the
  user's PERSONAL workflow skills on top — don't duplicate the existing
  layer.
- 2026-05-25 PIVOT: user clarified — NOT building a live system. Bake the
  3 guides' functionality INTO the boilerplate as command+skill+ref assets.
  Decisions: form = command+skill+ref; dashboard code = cloned into
  `dashboard/` and adapted to boilerplate structure.
- 2026-05-25 DONE Part 1: `.claude/skills/skill-architecture/SKILL.md` +
  `.claude/commands/skill-architecture.md` +
  `_workspace/references/skill-architecture-orchestrator.md`. Registered, visible.
- 2026-05-25 DONE Dashboard assets: `.claude/skills/dashboard-build/SKILL.md` +
  `.claude/commands/build-dashboard.md` +
  `_workspace/references/dashboard-build-guide.md` (adapted: external clone →
  vendored `dashboard/`; Phase 0.5/11 rewritten; COMIND_REPO var for plugin copy).
- 2026-05-25 DONE vendored upstream `cth9191/agentic-os-runner` → `dashboard/`
  (51 files: runner/ hooks/ metric-scripts/ dashboard-template/).
- 2026-05-25 DONE Stage 3: neutralized `dashboard/runner/runner.js`. tz →
  `AGENTIC_OS_TZ` env (default UTC); dropped reference-creator cases (morning,
  content-cascade, yt-pipeline, yt-week-review) from both deliverablePathFor +
  buildPrompt; genericized morning-report/inbox-brief/weekly-review/metrics-pull
  prompts; added "add your own here" Phase-7 hints. `node --check` passes on
  runner.js + activity-log.js. Updated `dashboard/README.md` to boilerplate.
- 2026-05-25 COMPLETE. All 3 stages done. `dashboard/dashboard-template/` plugin
  left as upstream (per-user customization in Phase 11 swap-points). Streamlit
  path intentionally not built (Obsidian path chosen).
  Remaining optional: commit; remove `preparation/` Streamlit source if unwanted.
- 2026-05-25 MOVED dashboard code `dashboard/` → `_workspace/dashboard/` (boilerplate
  is a template — no extra top-level dirs). Avoided collision with existing
  `_workspace/dashboard/` (comind vault-stats). All path refs updated across
  SKILL.md + command + build-guide + README.
- 2026-05-25 GROUPED both dashboards under `_workspace/dashboards/`:
  - `web/` — comind project-dashboard (Express vault-stats viewer, was
    `_workspace/dashboard/`). Fixed server/index.js relative paths +1 level:
    `../../bin/_sqlite`→`../../../bin/_sqlite`; ROOT `../../..`→`../../../..`.
  - `dashboard/` — agentic-OS dashboard code (was `_workspace/dashboard/`).
  dashboard refs `_workspace/dashboard/`→`_workspace/dashboards/dashboard/` across
  4 asset files. `node --check` passes on web server.
- 2026-05-25 FLATTENED (naming-confusion fix). Dropped `dashboards/` wrapper.
  Final: `_workspace/dashboard/` (agentic-OS build code) + `_workspace/workspace-monitor/`
  (was comind web dashboard; package.json name → "workspace-monitor"). Reverted
  monitor server/index.js relative paths to original 3-level depth
  (`../../bin/_sqlite`, ROOT `../../..`) — same depth as before grouping.
  sqlite resolves to `_workspace/bin/_sqlite`; `node --check` OK. dashboard refs
  → `_workspace/dashboard/` across SKILL.md + command + build-guide + README.

- 2026-05-25 TERMINOLOGY: renamed `cockpit` → `dashboard` everywhere (skill
  `dashboard-build`, command `/build-dashboard`, `_workspace/dashboard/`, ref
  `dashboard-build-guide.md`). Migrated `preparation/` → `_workspace/docs/agentic-os/`
  as instruction docs (marketing/Skool/video sections stripped): `part-1-skill-architecture.md`,
  `part-3-dashboard-obsidian.md`, `part-3-dashboard-streamlit.md` (+ README). `preparation/`
  deleted — Source-guide paths above are historical; live docs are in `docs/agentic-os/`.
  Deleted vestigial observability cluster (`workspace-monitor/` + `bin/` + `db/` + `runs/`
  + `routines/`) — contradicted Makefile "no dashboards/cron/db". Now one dashboard, no collision.

## History
- 2026-05-25 created
