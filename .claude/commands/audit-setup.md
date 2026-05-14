---
description: "MAINTAINER-ONLY for the comind-skills template. Audit current Claude Code setup for outdated content, missing coverage, and dead assets. Calls maintainer agents under `.claude/agents/_meta/`. NOT for project work — if you cloned this template for a real project, skip this command."
---

# Audit Setup Quality

Periodically evaluate whether the generated Claude Code assets still match the project. Recommended monthly or after any major refactor.

Use the agent at `.claude/agents/_meta/setup-validator.md` first for structural checks (frontmatter, cross-references, smoke tests), then a separate review pass for quality and coverage.

## Checks

### 1. Skill freshness
- Use the agent at `.claude/agents/_meta/project-analyzer.md` to get a fresh profile
- Compare against the assumptions baked into each `.claude/skills/<name>/SKILL.md`
- Flag skills referencing modules, frameworks, or conventions that no longer exist in the codebase
- Flag new patterns in code that aren't covered by any skill

### 2. Agent usage signals
- For each agent in `.claude/agents/`, search the repo for invocations: references in slash commands, in other agent files, and (if available) in git history of conversations under `_workspace/runs/`
- Flag agents with zero references after at least one month — they're dead code
- Flag common tasks (recurring patterns in commit messages, issue titles) that lack a dedicated agent

### 3. Command effectiveness
- For each command in `.claude/commands/`, check git log for any commits that mention the command
- Flag commands that have never been used since creation
- Flag commands whose workflows have been replaced by ad-hoc patterns visible in commit history

### 4. Coverage gaps
- Are there modules with no related skills?
- Are there workflows visible in commit history (e.g. recurring multi-step manual operations) that could become commands?
- Are there external services in the codebase that don't appear in any skill or agent?

## Output

`_workspace/docs/audit-report-<YYYY-MM-DD>.md` with prioritized recommendations:

- **Drop** — assets that are dead code (zero usage, stale references). Suggest deletion.
- **Update** — assets that reference outdated patterns. Suggest running `/regenerate-domain-assets <scope>`.
- **Add** — gaps in coverage. Suggest running `/extend-domain <area>` for each.
- **Keep** — assets that are healthy and current.

Each item links to specific evidence (file paths, line numbers, commit hashes) so the user can verify before acting.

## Constraints
- Read-only — the audit reports, it does not modify any asset
- Runtime budget: $1–2 (Sonnet) — this is a survey, not a deep analysis
- Run via `/loop` or cron for periodic execution (typical cadence: monthly)
