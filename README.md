# BOILERPLATE

> This README is the boilerplate's own README. `/init-project` will replace
> this with your actual project intro on first run.

A self-contained Claude Code workspace. Everything an agent ecosystem
needs lives **inside this folder**:

```
.
├── .claude/                # standard Claude Code config — ONLY system assets Claude discovers
│   ├── settings.json       # hooks + permissions
│   ├── skills/             # 23 lifecycle skills + project-generated skills
│   ├── agents/             # 3 personas + 6 meta-agents + project-generated agents
│   ├── commands/           # 7 lifecycle + 4 meta (/init-project, /extend-domain, …)
│   └── hooks/              # session-start, sdd-cache, simplify-ignore
├── _workspace/             # Everything Claude REFERENCES (not auto-loaded by harness)
│   ├── memory/             # Obsidian vault — Karpathy 3-zone (raw → wiki → outputs)
│   │   ├── _index.md       # master index (read before globbing)
│   │   ├── raw/            # unstructured capture + primary research + working notes
│   │   ├── wiki/           # structured internal reports + evergreen articles + ADRs
│   │   ├── outputs/        # finished, shippable deliverables
│   │   └── _obsidian-templates/task.md
│   └── docs/               # all documentation Claude references
│       ├── skill-anatomy.md     # skill format spec
│       ├── agentic-os/          # masterclass build guides
│       └── references/          # supplementary checklists pulled in by skills on demand
├── CLAUDE.md / README.md
├── Makefile                # convenience targets (stats, tasks, validate)
└── .gitignore
```

## Start a new project from this boilerplate

```bash
# 1. Copy the folder (any way you like — git clone, cp -r, degit, etc.)
cp -r path/to/boilerplate ./my-new-project
cd my-new-project
rm -rf .git && git init           # if you cloned via git

# 2. Open in Claude Code, run /init-project
claude
> /init-project "A SaaS that does X for Y users"
# init-project asks ≤4 questions, then customizes agents/skills/routines.

# 3. Use the project
make help                         # list available targets
make stats                        # vault note counts by type
make tasks                        # list in-progress task notes
```

## Everyday commands

```bash
make help      # list available targets
make stats     # vault note counts by type
make tasks     # list in-progress task notes
make validate  # sanity-check SKILL.md frontmatter on every skill
```

## How things work

1. **Memory is plain Markdown** in `_workspace/memory/`. Open it in
   Obsidian for graph view, backlinks, and Templater. Filenames follow
   `YYYY-MM-DD-kebab-slug.md`. Every note has YAML frontmatter.

2. **Karpathy 3-zone vault.** Notes flow `raw → wiki → outputs`:
   capture + primary research in `raw/`, distilled into structured
   `wiki/` articles + ADRs, finished deliverables in `outputs/`. Each
   zone has a master `_index.md` — read it before globbing the folder.
   Working task-notes live in `raw/` (`status:` in frontmatter).

3. **No agent-only indirection layer.** Claude reads vault notes with
   the same Read/Glob/Grep tools you use; writes them with Write/Edit.
   No database, no embeddings, no hooks reindexing on every write. If
   you want infrastructure on top of this template, build it in your
   own project — don't bake it into the boilerplate.

## Requirements

- `make` (GNU or BSD — both work for the targets in this Makefile)
- `claude` CLI (Claude Code) for agent runs
- Obsidian (optional, for graph view + backlinks over `_workspace/memory/`)
- Node 20+ / npm — only if you build the dashboard (`make dashboard`)

## What `/init-project` does

`/init-project` is a slash-command (`.claude/commands/init-project.md`) that runs
once after you clone. It interviews you about the project (≤ 4
questions), then customizes:

- `CLAUDE.md` — replacing the placeholder "What this project is" with a real description.
- `.claude/settings.json` — adding MCP servers for the project's external systems.
- `README.md` — replacing the boilerplate intro with your real one.
- `_workspace/memory/_index.md` — the vault master index, tailored to project terminology.

After `/init-project` you have a workspace tailored to your project, while
the underlying mechanics (Karpathy vault → skills → agents) stay generic.

## Setting up the dashboard (after `/init-project`)

The dashboard (an Obsidian plugin + queue runner) is **optional and
project-specific** — the metrics it shows, the skills its buttons fire, and the
runner cases that drive them differ per project. So it's wired up *after*
`/init-project`, not bootstrapped by it. Two ways:

**Guided (recommended):** run `/build-dashboard` (the `dashboard-build` skill). It
runs a short customization interview, then builds + wires everything against this
project as the vault. Full reference: `_workspace/docs/agentic-os/part-3-dashboard-obsidian.md`.

**Manual:**

```bash
make dashboard          # install deps + build the plugin → .obsidian/plugins/dashboard/
make dashboard-runner   # start the queue runner daemon (keep this terminal open)
```

Then enable the **Dashboard** plugin in Obsidian (Settings → Community plugins) and
open it from the ribbon. Use the footer **▶ start / ↻ restart** button (or the
`Start/Restart runner daemon` commands) to manage the runner from inside Obsidian.

**What to customize per project** (all in `_workspace/dashboard/`):

| Edit | File | What it controls |
|------|------|------------------|
| `CARDS` | `dashboard-template/src/components/Dashboard.tsx` | which metrics show (keys match your metrics-pull `<source>:<metric>`) |
| `BUTTONS` | `dashboard-template/src/components/ActionBar.tsx` | which skills get one-click buttons |
| `buildPrompt` / `deliverablePathFor` | `runner/runner.js` | which skills the runner can actually run + where output lands |
| metric scripts | `metric-scripts/pull_*.py` | what numbers get pulled into `system/metrics/metrics.csv` |

Each button's `skill` must match a `case` in `runner.js` `buildPrompt()`, or the
intent is queued and rejected. After editing, re-run `make dashboard-build` (it
auto-reloads via Hot Reload). Template details: `_workspace/dashboard/dashboard-template/README.md`.

# Agent Skills

**Production-grade engineering skills for AI coding agents.**

Skills encode the workflows, quality gates, and best practices that senior engineers use when building software. These ones are packaged so AI agents follow them consistently across every phase of development.

```
  DEFINE          PLAN           BUILD          VERIFY         REVIEW          SHIP
 ┌──────┐      ┌──────┐      ┌──────┐      ┌──────┐      ┌──────┐      ┌──────┐
 │ Idea │ ───▶ │ Spec │ ───▶ │ Code │ ───▶ │ Test │ ───▶ │  QA  │ ───▶ │  Go  │
 │Refine│      │  PRD │      │ Impl │      │Debug │      │ Gate │      │ Live │
 └──────┘      └──────┘      └──────┘      └──────┘      └──────┘      └──────┘
  /spec          /plan          /build        /test         /review       /ship
```

---

## Commands

7 slash commands that map to the development lifecycle. Each one activates the right skills automatically.

| What you're doing | Command | Key principle |
|-------------------|---------|---------------|
| Define what to build | `/spec` | Spec before code |
| Plan how to build it | `/plan` | Small, atomic tasks |
| Build incrementally | `/build` | One slice at a time |
| Prove it works | `/test` | Tests are proof |
| Review before merge | `/review` | Improve code health |
| Simplify the code | `/code-simplify` | Clarity over cleverness |
| Ship to production | `/ship` | Faster is safer |

Skills also activate automatically based on what you're doing — designing an API triggers `api-and-interface-design`, building UI triggers `frontend-ui-engineering`, and so on.

---

## Quick Start

```bash
# 1. Clone the template (or use as GitHub template)
git clone https://github.com/<your-org>/comind-skills my-new-project
cd my-new-project

# 2. Open in Claude Code and bootstrap the project
claude
> /init-project "<short description of what you're building>"
```

`/init-project` analyses the codebase (or asks for a brief if greenfield), then generates project-specific skills, agents, and slash commands on top of the lifecycle pack. See [.claude/commands/init-project.md](.claude/commands/init-project.md) for the full phased workflow.

---

## All 23 Skills

The commands above are entry points. The pack includes 23 skills total — 21 lifecycle skills plus the `using-agent-skills` meta-skill and the `interview-me` Define-phase skill. Each skill is a structured workflow with steps, verification gates, and anti-rationalization tables. You can also reference any skill directly.

### Meta - Discover which skill applies

| Skill | What It Does | Use When |
|-------|-------------|----------|
| [using-agent-skills](.claude/skills/using-agent-skills/SKILL.md) | Maps incoming work to the right skill workflow and defines shared operating rules | Starting a session or deciding which skill applies |

### Define - Clarify what to build

| Skill | What It Does | Use When |
|-------|-------------|----------|
| [idea-refine](.claude/skills/idea-refine/SKILL.md) | Structured divergent/convergent thinking to turn vague ideas into concrete proposals | You have a rough concept that needs exploration |
| [spec-driven-development](.claude/skills/spec-driven-development/SKILL.md) | Write a PRD covering objectives, commands, structure, code style, testing, and boundaries before any code | Starting a new project, feature, or significant change |

### Plan - Break it down

| Skill | What It Does | Use When |
|-------|-------------|----------|
| [planning-and-task-breakdown](.claude/skills/planning-and-task-breakdown/SKILL.md) | Decompose specs into small, verifiable tasks with acceptance criteria and dependency ordering | You have a spec and need implementable units |

### Build - Write the code

| Skill | What It Does | Use When |
|-------|-------------|----------|
| [incremental-implementation](.claude/skills/incremental-implementation/SKILL.md) | Thin vertical slices - implement, test, verify, commit. Feature flags, safe defaults, rollback-friendly changes | Any change touching more than one file |
| [test-driven-development](.claude/skills/test-driven-development/SKILL.md) | Red-Green-Refactor, test pyramid (80/15/5), test sizes, DAMP over DRY, Beyonce Rule, browser testing | Implementing logic, fixing bugs, or changing behavior |
| [context-engineering](.claude/skills/context-engineering/SKILL.md) | Feed agents the right information at the right time - rules files, context packing, MCP integrations | Starting a session, switching tasks, or when output quality drops |
| [source-driven-development](.claude/skills/source-driven-development/SKILL.md) | Ground every framework decision in official documentation - verify, cite sources, flag what's unverified | You want authoritative, source-cited code for any framework or library |
| [doubt-driven-development](.claude/skills/doubt-driven-development/SKILL.md) | Adversarial fresh-context review of every non-trivial decision in-flight - CLAIM → EXTRACT → DOUBT → RECONCILE → STOP, with optional user-authorized cross-model escalation | Stakes are high (production, security, irreversible), working in unfamiliar code, or a confident output is cheaper to verify now than to debug later |
| [frontend-ui-engineering](.claude/skills/frontend-ui-engineering/SKILL.md) | Component architecture, design systems, state management, responsive design, WCAG 2.1 AA accessibility | Building or modifying user-facing interfaces |
| [api-and-interface-design](.claude/skills/api-and-interface-design/SKILL.md) | Contract-first design, Hyrum's Law, One-Version Rule, error semantics, boundary validation | Designing APIs, module boundaries, or public interfaces |

### Verify - Prove it works

| Skill | What It Does | Use When |
|-------|-------------|----------|
| [browser-testing-with-devtools](.claude/skills/browser-testing-with-devtools/SKILL.md) | Chrome DevTools MCP for live runtime data - DOM inspection, console logs, network traces, performance profiling | Building or debugging anything that runs in a browser |
| [debugging-and-error-recovery](.claude/skills/debugging-and-error-recovery/SKILL.md) | Five-step triage: reproduce, localize, reduce, fix, guard. Stop-the-line rule, safe fallbacks | Tests fail, builds break, or behavior is unexpected |

### Review - Quality gates before merge

| Skill | What It Does | Use When |
|-------|-------------|----------|
| [code-review-and-quality](.claude/skills/code-review-and-quality/SKILL.md) | Five-axis review, change sizing (~100 lines), severity labels (Nit/Optional/FYI), review speed norms, splitting strategies | Before merging any change |
| [code-simplification](.claude/skills/code-simplification/SKILL.md) | Chesterton's Fence, Rule of 500, reduce complexity while preserving exact behavior | Code works but is harder to read or maintain than it should be |
| [security-and-hardening](.claude/skills/security-and-hardening/SKILL.md) | OWASP Top 10 prevention, auth patterns, secrets management, dependency auditing, three-tier boundary system | Handling user input, auth, data storage, or external integrations |
| [performance-optimization](.claude/skills/performance-optimization/SKILL.md) | Measure-first approach - Core Web Vitals targets, profiling workflows, bundle analysis, anti-pattern detection | Performance requirements exist or you suspect regressions |

### Ship - Deploy with confidence

| Skill | What It Does | Use When |
|-------|-------------|----------|
| [git-workflow-and-versioning](.claude/skills/git-workflow-and-versioning/SKILL.md) | Trunk-based development, atomic commits, change sizing (~100 lines), the commit-as-save-point pattern | Making any code change (always) |
| [ci-cd-and-automation](.claude/skills/ci-cd-and-automation/SKILL.md) | Shift Left, Faster is Safer, feature flags, quality gate pipelines, failure feedback loops | Setting up or modifying build and deploy pipelines |
| [deprecation-and-migration](.claude/skills/deprecation-and-migration/SKILL.md) | Code-as-liability mindset, compulsory vs advisory deprecation, migration patterns, zombie code removal | Removing old systems, migrating users, or sunsetting features |
| [documentation-and-adrs](.claude/skills/documentation-and-adrs/SKILL.md) | Architecture Decision Records, API docs, inline documentation standards - document the *why* | Making architectural decisions, changing APIs, or shipping features |
| [shipping-and-launch](.claude/skills/shipping-and-launch/SKILL.md) | Pre-launch checklists, feature flag lifecycle, staged rollouts, rollback procedures, monitoring setup | Preparing to deploy to production |

---

## Agent Personas

Pre-configured specialist personas for targeted reviews:

| Agent | Role | Perspective |
|-------|------|-------------|
| [code-reviewer](.claude/agents/code-reviewer.md) | Senior Staff Engineer | Five-axis code review with "would a staff engineer approve this?" standard |
| [test-engineer](.claude/agents/test-engineer.md) | QA Specialist | Test strategy, coverage analysis, and the Prove-It pattern |
| [security-auditor](.claude/agents/security-auditor.md) | Security Engineer | Vulnerability detection, threat modeling, OWASP assessment |

---

## Reference Checklists

Quick-reference material that skills pull in when needed:

| Reference | Covers |
|-----------|--------|
| [testing-patterns.md](_workspace/docs/references/testing-patterns.md) | Test structure, naming, mocking, React/API/E2E examples, anti-patterns |
| [security-checklist.md](_workspace/docs/references/security-checklist.md) | Pre-commit checks, auth, input validation, headers, CORS, OWASP Top 10 |
| [performance-checklist.md](_workspace/docs/references/performance-checklist.md) | Core Web Vitals targets, frontend/backend checklists, measurement commands |
| [accessibility-checklist.md](_workspace/docs/references/accessibility-checklist.md) | Keyboard nav, screen readers, visual design, ARIA, testing tools |

---

## How Skills Work

Every skill follows a consistent anatomy:

```
┌─────────────────────────────────────────────────┐
│  SKILL.md                                       │
│                                                 │
│  ┌─ Frontmatter ─────────────────────────────┐  │
│  │ name: lowercase-hyphen-name               │  │
│  │ description: Guides agents through [task].│  │
│  │              Use when…                    │  │
│  └───────────────────────────────────────────┘  │                                                                                                
│  Overview         → What this skill does        │
│  When to Use      → Triggering conditions       │
│  Process          → Step-by-step workflow       │
│  Rationalizations → Excuses + rebuttals         │
│  Red Flags        → Signs something's wrong     │
│  Verification     → Evidence requirements       │
└─────────────────────────────────────────────────┘
```

**Key design choices:**

- **Process, not prose.** Skills are workflows agents follow, not reference docs they read. Each has steps, checkpoints, and exit criteria.
- **Anti-rationalization.** Every skill includes a table of common excuses agents use to skip steps (e.g., "I'll add tests later") with documented counter-arguments.
- **Verification is non-negotiable.** Every skill ends with evidence requirements - tests passing, build output, runtime data. "Seems right" is never sufficient.
- **Progressive disclosure.** The `SKILL.md` is the entry point. Supporting references load only when needed, keeping token usage minimal.

---

## Project Structure

```
comind-skills/
├── .claude/
│   ├── settings.json                  # hooks + plugin config
│   ├── skills/                        # 23 skills (21 lifecycle + 1 meta + 1 elicitation)
│   │   ├── interview-me/                  #   Define (elicitation)
│   │   ├── idea-refine/                   #   Define
│   │   ├── spec-driven-development/       #   Define
│   │   ├── planning-and-task-breakdown/   #   Plan
│   │   ├── incremental-implementation/    #   Build
│   │   ├── context-engineering/           #   Build
│   │   ├── source-driven-development/     #   Build
│   │   ├── doubt-driven-development/      #   Build
│   │   ├── frontend-ui-engineering/       #   Build
│   │   ├── test-driven-development/       #   Build
│   │   ├── api-and-interface-design/      #   Build
│   │   ├── browser-testing-with-devtools/ #   Verify
│   │   ├── debugging-and-error-recovery/  #   Verify
│   │   ├── code-review-and-quality/       #   Review
│   │   ├── code-simplification/           #   Review
│   │   ├── security-and-hardening/        #   Review
│   │   ├── performance-optimization/      #   Review
│   │   ├── git-workflow-and-versioning/   #   Ship
│   │   ├── ci-cd-and-automation/          #   Ship
│   │   ├── deprecation-and-migration/     #   Ship
│   │   ├── documentation-and-adrs/        #   Ship
│   │   ├── shipping-and-launch/           #   Ship
│   │   └── using-agent-skills/            #   Meta: how to use this pack
│   ├── agents/                        # 5 project personas + 6 _meta (maintainer-only)
│   ├── commands/                      # 11 slash commands (lifecycle + maintainer)
│   └── hooks/                         # Session lifecycle hook scripts
├── _workspace/                        # Reference + working content (Claude reads on demand)
│   ├── docs/                          # all documentation (skill-anatomy spec, agentic-os guides, references/)
│   │   └── references/                # supplementary checklists pulled in by skills
│   └── memory/                        # Obsidian vault — Karpathy 3-zone (raw / wiki / outputs)
└── Makefile                           # Convenience targets (stats, tasks, validate)
```

---

## Why Agent Skills?

AI coding agents default to the shortest path - which often means skipping specs, tests, security reviews, and the practices that make software reliable. Agent Skills gives agents structured workflows that enforce the same discipline senior engineers bring to production code.

Each skill encodes hard-won engineering judgment: *when* to write a spec, *what* to test, *how* to review, and *when* to ship. These aren't generic prompts - they're the kind of opinionated, process-driven workflows that separate production-quality work from prototype-quality work.

Skills bake in best practices from Google's engineering culture — including concepts from [Software Engineering at Google](https://abseil.io/resources/swe-book) and Google's [engineering practices guide](https://google.github.io/eng-practices/). You'll find Hyrum's Law in API design, the Beyonce Rule and test pyramid in testing, change sizing and review speed norms in code review, Chesterton's Fence in simplification, trunk-based development in git workflow, Shift Left and feature flags in CI/CD, and a dedicated deprecation skill treating code as a liability. These aren't abstract principles — they're embedded directly into the step-by-step workflows agents follow.

---

## Contributing

Skills should be **specific** (actionable steps, not vague advice), **verifiable** (clear exit criteria with evidence requirements), **battle-tested** (based on real workflows), and **minimal** (only what's needed to guide the agent).

See [_workspace/docs/skill-anatomy.md](_workspace/docs/skill-anatomy.md) for the format specification and [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## License

MIT - use these skills in your projects, teams, and tools.
