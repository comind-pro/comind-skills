---
description: Regenerate domain-specific skills/agents/commands when project architecture changes significantly
argument-hint: <scope: skills | agents | commands | all>
---

# Regenerate Domain Assets

Re-analyse the project and update domain-specific assets when the codebase has drifted from the existing setup. Use this after a major refactor, a new external service, or a domain area expansion.

## Workflow

1. **Detect drift** — spawn `project-analyzer` and diff its fresh profile against the previous one (`_workspace/docs/.profile.json` if it exists, otherwise treat everything as new).
2. **Show the diff** — print new languages/frameworks/modules/external services detected since last setup.
3. **Determine assets to update** — based on `$ARGUMENTS`:
   - `skills` → spawn `skills-generator` for affected skills only
   - `agents` → spawn `agents-generator` for affected agents only
   - `commands` → spawn `commands-generator` for affected commands only
   - `all` → run all three in order, like `/orchid` phases 3–5
4. **Show diffs per asset** — for each updated `SKILL.md`, agent, or command, display a unified diff against the prior version.
5. **[APPROVAL GATE]** — user accepts/rejects/edits per asset.
6. **Validate** — spawn `setup-validator` on the updated set.
7. **Commit** — one commit per asset type for easy review.

## Typical use cases
- Added a new external service (queue, cache, new database) → generate new skills + relevant agent
- Added a new domain area (payments, notifications) → likely needs agents + commands
- New conventions emerged in the codebase → update existing `code-style` or similar skills
- Removed a deprecated module → suggest deleting its skill/agent

## Output

A short summary at the end:
- N assets regenerated
- M assets unchanged
- K assets flagged for removal (user decides)

## Constraints
- Never delete user-edited files without explicit approval
- Preserve any sections marked `<!-- comind:user-edit -->` in regenerated files
- Runtime budget: $3 (Sonnet) default, scale with scope
