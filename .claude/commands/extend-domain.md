---
description: Add domain-specific assets for a new area within the project
argument-hint: <area description, e.g. "websocket handlers" or "ML model serving">
---

# Extend Domain Coverage

Add Claude Code assets for a new domain area: `$ARGUMENTS`.

Use this when the project grows into territory the original `/orchid` run didn't cover — a new external service, a new bounded context, an unrelated feature area. Smaller than `/regenerate-domain-assets` (targeted, not project-wide).

## Workflow

1. **Research the area** — spawn a researcher persona (or Claude directly with WebSearch/WebFetch) to gather best practices for `$ARGUMENTS`. Write findings to `_workspace/docs/areas/<area-slug>.md`.
2. **Spawn `skills-generator`** with the area research as input. Generate skills specifically for this area.
3. **Spawn `agents-generator`** if specialized agents are needed for this area (skip if existing agents already cover it).
4. **Spawn `commands-generator`** if new commands are warranted (skip if existing commands work).
5. **Update `CLAUDE.md`** with a one-line reference to the new area and its assets.
6. **Spawn `setup-validator`** on the new additions only — verify no conflicts with existing assets.

## Approval gates

After each generator (skills, agents, commands), show the user what was generated and ask for approval before continuing to the next step.

## Output

A short summary listing:
- New skills added (with one-line purpose each)
- New agents added
- New commands added
- Updated docs

## Constraints
- Do not modify assets outside the new area unless `setup-validator` finds a real conflict
- Runtime budget: $2 (Sonnet) for the typical area; more for areas requiring extensive research
- The area description must be specific enough that a generator can write concrete rules — if `$ARGUMENTS` is too vague, ask the user to refine before generating anything
