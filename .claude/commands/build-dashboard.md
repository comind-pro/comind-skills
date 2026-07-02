---
description: Build a personal comind-dashboard — Obsidian plugin + vault + runner daemon + metric scripts + activity-log hook (comind-dashboard Part 3)
---

Invoke the `dashboard-build` skill.

This is Part 3 of the comind-dashboard build. Run Part 1 (`/skill-architecture`) first
— the dashboard's action bar invokes the skills it produces.

Load the full adapted guide at `_workspace/docs/references/dashboard-build-guide.md` and
follow it phase by phase. Start at **Phase 0** and run the customization
interview before writing any code. Pause for confirmation between phases. Do NOT
skip the `[VERIFY]` checks — if a verify fails, branch into the matching `[FIX]`
block and ask the user before proceeding.

Critical: the build code is **vendored in `_workspace/dashboard/`** in this repo —
everything ships with the template, nothing to clone. Wherever the guide says
"copy from the cloned repo," copy from `_workspace/dashboard/` instead.

The vault root resolves automatically when scripts run in place; set the
`COMIND_VAULT` env var (or `~/.claude/.env`) only if scripts are relocated
outside the project.
