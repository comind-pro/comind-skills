# Project conventions

Claude Code loads this file automatically. Read it once per session.

## Where things live

**Rule:** `.claude/` holds **only what Claude Code itself auto-discovers** (skills, agents, commands, hooks, settings). Everything Claude *references* (docs, checklists, vault, runs) lives in `_workspace/`.

| Path                                | What                                       |
|-------------------------------------|--------------------------------------------|
| `.claude/settings.json`             | Hooks + permissions (system config).       |
| `.claude/skills/<name>/SKILL.md`    | Skills — auto-discovered by Claude Code.  |
| `.claude/agents/`                   | Subagents you can delegate to via Task.   |
| `.claude/commands/`                 | Slash commands.                            |
| `.claude/hooks/`                    | Hook scripts wired up in `settings.json`. |
| `_workspace/docs/`                  | `/orchid`-generated project docs (architecture, conventions, …) + `skill-anatomy.md` spec. |
| `_workspace/references/`            | Supplementary checklists pulled in by skills on demand. |
| `_workspace/memory/`                | Obsidian vault. Long-term memory.         |
| `_workspace/memory/tasks/`          | Tasks as `.md`. See `task-management` skill. |
| `_workspace/memory/decisions/`      | ADRs.                                      |
| `_workspace/memory/research/`       | Researcher agent output.                   |
| `_workspace/memory/daily/`          | Daily journal.                             |
| `_workspace/db/index.sqlite`        | Auto-rebuilt index of the vault.          |
| `_workspace/routines/routines.json` | Scheduled headless runs.                  |
| `_workspace/runs/`                  | Per-run JSONL logs (cron output).         |
| `_workspace/bin/`                   | reindex.js, run-routine.sh, cron-block.sh |
| `_workspace/dashboard/`             | Local web dashboard.                       |
| `Justfile`                          | Every command this project knows.         |

## Conventions

1. **Memory is markdown.** Source of truth = the `.md` files. SQLite
   is a rebuildable cache. Never write directly to `index.sqlite`;
   always edit the markdown and let `reindex.js` catch up.
2. **Tasks are notes, not rows.** Status changes mean editing the
   frontmatter of `_workspace/memory/tasks/<file>.md`. See the
   `task-management` skill for the full schema.
3. **Wikilinks matter.** Use `[[other-note]]` between vault notes.
   Obsidian's graph view depends on it; isolated notes are wasted.
4. **Status-checker, task-keeper, reporter are mandatory** subagents.
   The dashboard relies on them.
5. **Match model to task.** Haiku for cheap polls and reconciliation.
   Sonnet for real work and digests. Opus only on explicit request.
6. **Quiet by default.** Daily and weekly cadence first. Hourly only
   when warranted.
7. **No secrets in files.** Use env vars (`${GITHUB_TOKEN}`),
   `_workspace/dashboard/.env`, or a separate secret manager.
8. **MCP filesystem is scoped to this project.** Never broaden it.
   Project sealing is the point.

## How to run things

- Open the dashboard: `just dashboard`
- Run a routine now: `just run <routine-name>`
- Schedule routines: `just cron-install` (idempotent)
- Rebuild the index: `just reindex`
- See all commands: `just`

## How to add things

- **New agent.** Drop `.claude/agents/<name>.md` with frontmatter
  (`name`, `description`, `tools`, `model`). It's instantly available
  to other agents via Task.
- **New skill.** Drop `.claude/skills/<name>/SKILL.md`. Skills should
  describe *how* to do a thing; agents describe *who* does it.
- **New slash command.** Drop `.claude/commands/<name>.md`.
- **New routine.** Append to `_workspace/routines/routines.json`, then
  `just cron-install` to update crontab.

## Bootstrap & maintenance commands

The boilerplate ships with a meta-tools layer that **generates** domain-specific
skills, agents, and commands for whatever project this template gets cloned
into. Run them via Claude Code:

- `/orchid [type-hint]` — first-run bootstrap. Analyses the codebase, generates
  docs, then domain skills/agents/commands with approval gates per phase.
- `/extend-domain <area>` — add assets for a new bounded context (e.g. "webhook
  handlers", "ML model serving").
- `/regenerate-domain-assets <scope>` — refresh after a major refactor.
- `/audit-setup` — check generated assets against the current codebase; flag
  drift, dead code, coverage gaps.

These commands chain the meta-agents: `project-analyzer`,
`documentation-generator`, `skills-generator`, `agents-generator`,
`commands-generator`, `setup-validator`. The boilerplate's lifecycle skills
(`spec-driven-development`, `test-driven-development`, etc.) and generic
personas (`code-reviewer`, `security-auditor`, `test-engineer`) stay in place
unchanged — domain assets are added on top.

## What to read on session start

- This file.
- The MOC: `_workspace/memory/index/README.md`.
- The most recent daily note (for context): newest in
  `_workspace/memory/daily/`.
- Any in-progress tasks: query the index.

# agent-skills

This is the agent-skills project — a collection of production-grade engineering skills for AI coding agents.

## Project Structure

```
.claude/skills/         → Core skills (SKILL.md per directory) — auto-discovered
.claude/agents/         → Reusable agent personas (code-reviewer, test-engineer, security-auditor)
.claude/commands/       → Slash commands (/spec, /plan, /build, /test, /review, /code-simplify, /ship)
.claude/hooks/          → Session lifecycle hook scripts (wired up via .claude/settings.json)
_workspace/references/  → Supplementary checklists (testing, performance, security, accessibility)
_workspace/docs/        → `/orchid`-generated project docs (architecture, conventions, …) + skill-anatomy spec
```

## Skills by Phase

**Define:** spec-driven-development
**Plan:** planning-and-task-breakdown
**Build:** incremental-implementation, test-driven-development, context-engineering, source-driven-development, doubt-driven-development, frontend-ui-engineering, api-and-interface-design
**Verify:** browser-testing-with-devtools, debugging-and-error-recovery
**Review:** code-review-and-quality, code-simplification, security-and-hardening, performance-optimization
**Ship:** git-workflow-and-versioning, ci-cd-and-automation, deprecation-and-migration, documentation-and-adrs, shipping-and-launch

## Conventions

- Every skill lives in `.claude/skills/<name>/SKILL.md`
- YAML frontmatter with `name` and `description` fields
- Description starts with what the skill does (third person), followed by trigger conditions ("Use when...")
- Every skill has: Overview, When to Use, Process, Common Rationalizations, Red Flags, Verification
- References are in `_workspace/references/`, not inside skill directories
- Supporting files only created when content exceeds 100 lines

## Commands

- `npm test` — Not applicable (this is a documentation project)
- Validate: Check that all SKILL.md files have valid YAML frontmatter with name and description

## Boundaries

- Always: Follow the `_workspace/docs/skill-anatomy.md` format for new skills
- Never: Add skills that are vague advice instead of actionable processes
- Never: Duplicate content between skills — reference other skills instead
