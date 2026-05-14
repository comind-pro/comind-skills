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
| `_workspace/docs/`                  | `/init-project`-generated project docs (architecture, conventions, …) + `skill-anatomy.md` spec. |
| `_workspace/references/`            | Supplementary checklists pulled in by skills on demand. |
| `_workspace/memory/`                | Obsidian vault. Long-term memory.         |
| `_workspace/memory/tasks/`          | Tasks as `.md`. See `planning-and-task-breakdown` skill. |
| `_workspace/memory/decisions/`      | ADRs.                                      |
| `_workspace/memory/research/`       | Researcher agent output.                   |
| `_workspace/memory/daily/`          | Daily journal.                             |
| `Makefile`                          | Convenience targets (vault stats, task list, SKILL.md validation). |

## Conventions

1. **Memory is markdown.** Source of truth = the `.md` files in
   `_workspace/memory/`. Read them with Read/Glob/Grep; write them
   with Write/Edit. No agent-only indirection layer.
2. **Tasks are notes, not rows.** Status changes mean editing the
   frontmatter of `_workspace/memory/tasks/<file>.md`. See the
   `planning-and-task-breakdown` skill for the full schema.
3. **Wikilinks matter.** Use `[[other-note]]` between vault notes.
   Obsidian's graph view depends on it; isolated notes are wasted.
4. **Match model to task.** Haiku for cheap polls and reconciliation.
   Sonnet for real work and digests. Opus only on explicit request.
5. **Quiet by default.** Daily and weekly cadence first. Hourly only
   when warranted.
6. **No secrets in files.** Use env vars (`${GITHUB_TOKEN}`) or a
   separate secret manager.
7. **MCP filesystem is scoped to this project.** Never broaden it.
   Project sealing is the point.

## How to run things

Run `make help` to see all available targets (`stats`, `tasks`, `validate`).

## How to add things

- **New agent.** Drop `.claude/agents/<name>.md` with frontmatter
  (`name`, `description`, `tools`, `model`). It's instantly available
  to other agents via Task.
- **New skill.** Drop `.claude/skills/<name>/SKILL.md`. Skills should
  describe *how* to do a thing; agents describe *who* does it.
- **New slash command.** Drop `.claude/commands/<name>.md`.

## Bootstrap & maintenance commands

The boilerplate ships with a meta-tools layer that **generates** domain-specific
skills, agents, and commands for whatever project this template gets cloned
into. Run them via Claude Code:

- `/init-project [type-hint]` — first-run bootstrap. Analyses the codebase, generates
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
- Any in-progress tasks: `grep -l 'status: in_progress' _workspace/memory/tasks/*.md`.

# agent-skills

This is the agent-skills project — a collection of production-grade engineering skills for AI coding agents.

## Project Structure

```
.claude/skills/         → Core skills (SKILL.md per directory) — auto-discovered
.claude/agents/         → Reusable agent personas (code-reviewer, test-engineer, security-auditor)
.claude/commands/       → Slash commands (/spec, /plan, /build, /test, /review, /code-simplify, /ship)
.claude/hooks/          → Session lifecycle hook scripts (wired up via .claude/settings.json)
_workspace/references/  → Supplementary checklists (testing, performance, security, accessibility)
_workspace/docs/        → `/init-project`-generated project docs (architecture, conventions, …) + skill-anatomy spec
```

## Skills by Phase

**Define:** interview-me, idea-refine, spec-driven-development
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

---

## Maintainer mode

Agents under `.claude/agents/_meta/` are maintainer-only — they exist
for editing this template repository itself, not for project work.
Claude Code doesn't list them in the agent picker (subfolders aren't
scanned), so they only run when invoked explicitly:

> Use the agent at `.claude/agents/_meta/skills-generator.md` to scaffold a new skill named "...".

If you cloned `comind-skills` to start a real project, ignore this
section.
