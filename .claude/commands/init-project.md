---
description: Bootstrap project with auto-generated documentation, skills, agents, and commands based on codebase analysis
argument-hint: [optional project type hint, e.g. "smart-contracts", "python-backend", "react-app"]
---

# Initialize Project Agentic Setup

This is the project's first-run command. It analyses the codebase (or asks for a brief if the repo is empty), then generates a complete domain-specific Claude Code setup on top of the boilerplate's universal layer.

Boilerplate lifecycle skills/commands (`/spec`, `/plan`, `/build`, `/test`, `/review`, `/code-simplify`, `/ship`) and generic personas (`code-reviewer`, `security-auditor`, `test-engineer`) stay in place — `/init-project` only **adds** project-specific assets on top.

## Phase 1: Project Discovery

Spawn the `project-analyzer` agent (via the Task tool) with this brief:

> Analyse this codebase comprehensively. Determine: primary language(s) and frameworks; architectural patterns; domain; key technologies; coding conventions; testing strategy; documentation state. Return the structured JSON profile.

If `$ARGUMENTS` is provided, pass it as a hint but verify against actual code. Greenfield repos: ask the user for a one-paragraph project brief before running the analyzer.

## Phase 2: Documentation Generation

Spawn `documentation-generator` with the Phase 1 profile. It writes:
- `_workspace/docs/architecture.md`
- `_workspace/docs/conventions.md`
- `_workspace/docs/domain.md`
- `_workspace/docs/dependencies.md`
- `_workspace/docs/getting-started.md`
- Appends a project-context section to `CLAUDE.md` (does not overwrite existing template rules)

**[APPROVAL GATE]** Show generated docs to the user. Ask: `approve / iterate / abort`. On `iterate`, re-spawn with the user's notes.

## Phase 3: Skills Generation

Spawn `skills-generator` with profile + approved docs. It writes domain-specific `SKILL.md` files to `.claude/skills/`, skipping anything already covered by the boilerplate's lifecycle pack.

Baseline skills always considered (skip if duplicate):
- `project-architecture` — from `_workspace/docs/architecture.md`
- `code-style` — from `_workspace/docs/conventions.md`
- `security-rules` — security baseline for this domain

Domain skills come from `recommended_skills` in the profile.

**[APPROVAL GATE]** Show generated skills list (name + 1-line purpose). Ask: `approve / modify / add more / drop some`.

## Phase 4: Agents Generation

Spawn `agents-generator` with profile + skills. It writes domain-specific agents to `.claude/agents/`.

Baseline agents always considered (skip if duplicate):
- `architect` — system design decisions
- `implementer` — code writing
- `tester` — test creation

Domain agents come from `recommended_agents` in the profile.

**[APPROVAL GATE]** Show generated agents list. Ask: `approve / modify`.

## Phase 5: Commands Generation

Spawn `commands-generator` with profile + skills + agents. It writes domain-specific slash commands to `.claude/commands/`.

Do not regenerate the boilerplate lifecycle commands (`/spec`, `/plan`, `/build`, `/test`, `/review`, `/code-simplify`, `/ship`). Domain commands come from `recommended_commands` in the profile.

**[APPROVAL GATE]** Show generated commands list. Ask: `approve / modify`.

## Phase 6: Validation

Spawn `setup-validator`. On `warnings`: show report, let user iterate per asset. On `failed`: route fixes back to the appropriate generator and re-validate. On `passed`: continue.

## Phase 7: Onboarding summary

Write `setup-summary.md` at the repo root with:
- What was created (skills, agents, commands — counts and names)
- How to use the new commands (with one example invocation each)
- Recommended first tasks to verify the setup works
- Where to extend later (`/extend-domain`, `/regenerate-domain-assets`)

Suggest the user commit each generation phase as a separate commit for easy review.

## Constraints

- Total runtime budget cap: $5 (Sonnet) or $20 (Opus for high-stakes domains like security audits)
- Maximum 30 minutes total
- Every phase has an approval gate — the user can iterate or abort
- All generated files should land on a fresh branch (`init-project/init` by default) so the user reviews everything before merging
