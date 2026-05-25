---
title: "comind-dashboard — build guides"
type: doc
---

# comind-dashboard build guides

The instruction set for building comind-dashboard on top of Claude Code: a skill
library (Part 1) and an Obsidian-native dashboard + queue runner (Part 3, with the
memory layer as Part 2). Part 1 carries most of the value; Parts 2–3 are additive.

| Guide | Part | What |
|---|---|---|
| [`skill-architecture-guide.md`](skill-architecture-guide.md) | 1 | Interview-driven skill library build. Turn recurring workflows into invokable skills via `skill-creator`. |
| [`../references/dashboard-build-guide.md`](../references/dashboard-build-guide.md) | 2 + 3 | The full phase-by-phase dashboard build (memory layer + Obsidian plugin + runner). Vendored code at `_workspace/dashboard/`. |

## How this relates to the live template assets

| Guide | Operational asset |
|---|---|
| `skill-architecture-guide.md` | `/skill-architecture` command + `skill-architecture` skill + `_workspace/docs/references/skill-architecture-orchestrator.md` |
| `../references/dashboard-build-guide.md` | `/build-dashboard` command + `dashboard-build` skill + vendored code at `_workspace/dashboard/` |
