---
description: Build a personal agentic-OS dashboard — Obsidian plugin + vault + runner daemon + metric scripts + activity-log hook (agentic-OS Part 3)
---

Invoke the `dashboard-build` skill.

This is Part 3 of the agentic-OS build. Run Part 1 (`/skill-architecture`) first
— the dashboard's action bar invokes the skills it produces.

Load the full adapted guide at `_workspace/references/dashboard-build-guide.md` and
follow it phase by phase. Start at **Phase 0** and run the customization
interview before writing any code. Pause for confirmation between phases. Do NOT
skip the `[VERIFY]` checks — if a verify fails, branch into the matching `[FIX]`
block and ask the user before proceeding.

Critical: the build code is **vendored in `_workspace/dashboard/`** in this repo. Do NOT
clone the external `agentic-os-runner` repo — wherever the guide says "copy from
the cloned repo," copy from `_workspace/dashboard/` instead.

Set the vault root via the `AGENTIC_OS_VAULT` env var (or `~/.claude/.env`) so
the runner and hook find the user's vault.
