---
title: "Agentic OS — build guides"
type: doc
---

# Agentic OS build guides

The original masterclass instruction set for building a personal agentic OS on top
of Claude Code, adapted into project docs. Three parts; Part 1 carries most of the
value, Parts 2–3 are additive.

| Doc | Part | What |
|---|---|---|
| [`part-1-skill-architecture.md`](part-1-skill-architecture.md) | 1 | Interview-driven skill library build. Turn recurring workflows into invokable skills via `skill-creator`. |
| [`part-3-dashboard-obsidian.md`](part-3-dashboard-obsidian.md) | 2 + 3 (Path B) | Obsidian-native plugin dashboard. Phases 1–2 are the memory layer (Part 2); Phases 3–11 the dashboard. **This is the path the template builds.** |
| [`part-3-dashboard-streamlit.md`](part-3-dashboard-streamlit.md) | 3 (Path A) | Streamlit local-web dashboard. **Alternative path — clones an external repo, not vendored in this template.** |

## How this relates to the live template assets

These docs are the **instruction source**. The template productizes them into
operational assets the agent actually runs:

| Doc | Operational asset |
|---|---|
| `part-1-skill-architecture.md` | `/skill-architecture` command + `skill-architecture` skill + `_workspace/docs/references/skill-architecture-orchestrator.md` |
| `part-3-dashboard-obsidian.md` | `/build-dashboard` command + `dashboard-build` skill + `_workspace/docs/references/dashboard-build-guide.md` + vendored code at `_workspace/dashboard/` |
| `part-3-dashboard-streamlit.md` | none — alternative path, not built into the template |
