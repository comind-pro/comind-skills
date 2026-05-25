---
name: init-project
description: Bootstrap a project. Detects whether cwd is the comind template itself (self-init forbidden) or a fresh clone, asks one routing question (scan existing vs. create from scratch), then customizes CLAUDE.md, skills, agents, and commands to match.
argument-hint: "<optional: short project description>"
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
---

You are bootstrapping a fresh project. Run **once** per repo.

## Step 1: refuse if we're inside the template itself

Check whether this cwd is the comind template repo, not a clone of it:

```bash
# Signal A: origin remote points exactly at the canonical template.
# Tightened to the full name; substring matches on other comind-pro/comind-*
# repos must NOT fire.
git remote get-url origin 2>/dev/null \
  | grep -qE '[:/]comind-pro/comind-skills(\.git)?/?$' \
  && echo "TEMPLATE_REMOTE"

# Signal B: README still contains the template's boilerplate marker.
# Step 4 of /init-project replaces the README, so a clone that has
# already been bootstrapped won't trigger this.
grep -q '^# BOILERPLATE' README.md 2>/dev/null && echo "TEMPLATE_README"
```

If **both** signals fire, this is the template repo and bootstrap
has not yet happened. Stop and say:

> This looks like the comind template repo itself, not a project
> created from it. `/init-project` is meant to run **once, inside a
> clone**. To start a new project:
>
> ```bash
> gh repo create my-project --template comind-pro/comind --clone
> cd my-project
> claude
> > /init-project
> ```
>
> If you really intended to run it here (e.g. you're editing the
> template), tell me explicitly: "yes, run it on the template anyway".

Do **not** proceed without that explicit override. No self-scanning,
no meta-mode, no multi-phase pipelines.

## Step 2: ask the routing question

Exactly one question, two options:

> Are we **scanning an existing codebase** (cwd already has source code
> that I should profile), or **creating a project from scratch** (cwd
> is empty apart from the comind boilerplate)?
>
> 1. Scan existing code
> 2. Create from scratch

Heuristic for the default suggestion: if cwd has more than ~5 source
files outside `.claude/` and `_workspace/` (any of `*.py`, `*.js`,
`*.ts`, `*.go`, `*.rs`, `Cargo.toml`, `package.json`, `pyproject.toml`,
`go.mod`), suggest option 1. Otherwise suggest option 2. Still wait
for the user to confirm.

## Step 3a: branch — Create from scratch

If the user picked option 2, run the **interview** flow.

Invoke the `interview-me` skill (from `.claude/skills/interview-me/`).
That skill does one-question-at-a-time elicitation with hypothesis
+ confidence until ~95% certainty about intent — better than a fixed
question list. Seed it with the four dimensions bootstrap needs:

1. **Project name & one-sentence pitch.** What's it called? What does
   it do? Who's it for?
2. **Stack & external systems.** What language/framework? What
   external systems (GitHub, Notion, Postgres, an API)? This decides
   which MCP servers to add to `.claude/settings.json`.
3. **Current state.** Brand-new, or migrating from somewhere? Any
   constraints already in place?
4. **House style.** Any conventions worth pinning (code style, doc
   tone, naming)?

Skip any dimension already answered by `$ARGUMENTS`. Stop as soon as
you have enough to write Step 4 — don't grill the user past the
point of usefulness.

Then customize files (see Step 4).

## Step 3b: branch — Scan existing code

If the user picked option 1, run the **scan** flow.

Keep it bounded — this is not a 30-minute pipeline.

1. **Detect stack** (one bash batch, max ~5 commands):
   - `cat package.json 2>/dev/null | head -50`
   - `cat pyproject.toml 2>/dev/null | head -50`
   - `cat Cargo.toml 2>/dev/null | head -30`
   - `cat go.mod 2>/dev/null | head -20`
   - `ls -la` for top-level orientation
2. **Detect entry points** with `Glob`: `src/**/main.*`,
   `src/**/index.*`, `cmd/**/main.go`, etc.
3. **Read the existing README.md** if present.
4. **Summarize** what you found in 5–8 bullets and confirm with the
   user. Ask one clarifying question if the project's purpose isn't
   obvious from the code.

Do **not** spawn sub-agents for this. Do **not** open a git branch.
Do **not** generate per-skill analyses. The goal is to learn enough
about the project to fill in the same files as the from-scratch flow.

## Step 4: customize files (both branches converge here)

Use **Write** and **Edit**, not Bash heredocs.

- **`CLAUDE.md`** (project root, loaded automatically every session) —
  replace the "What this project is" placeholder with a real
  description (1–3 paragraphs). Add a "Stack" section if warranted.
  Keep it short.
- **`.claude/skills/*/SKILL.md`** — leave alone unless the project
  domain genuinely changes how a skill should work. Touch the
  tag/area taxonomy only if the project warrants it. New skills come
  later via `/extend-domain`.
- **`.claude/settings.json`** — add MCP servers for the external
  systems named in the interview/scan (one entry per service under
  `mcpServers`). Do not install plugins from bootstrap; that's a
  separate, user-driven step (`claude plugin install …`) when a
  concrete need arises.
- **`README.md`** at project root — replace the template description
  with the project's real intro. Remove the "Use this template"
  section (the template has been used).
- **`_workspace/memory/_index.md`** — vault homepage (the MOC
  Obsidian opens to). Replace the generic intro with one tied to this
  project. Mention project-specific terms readers should know. Keep
  the "Folders" and "Conventions" sections; only the intro changes.

## Step 5: seed initial vault content

Write a first **decision** capturing the bootstrap:

`_workspace/memory/wiki/<today>-bootstrap.md`:

```markdown
---
type: decision
date: <today>
status: accepted
tags: [bootstrap]
---

# Project bootstrap

## Decision
This project is <name>: <pitch>.

## Context
- Stack: ...
- External systems: ...
- Constraints: ...
- Style: ...
- (If scan branch) Existing codebase summary: ...

## Consequences
- These choices shape the agents in `.claude/agents/` and the MCP
  servers in `.claude/settings.json`.
- Revisit if the project changes direction.
```

**Delete** the two example files from the template:
- `_workspace/memory/wiki/2026-05-13-example-decision.md`
- `_workspace/memory/raw/2026-05-13-example-research.md`

(Verify they exist first with `ls`; some users may have already
deleted them by hand.)

## Step 6: hand off

Print exactly this shape:

```
✨ comind bootstrapped <project-name>.

Customized:
  CLAUDE.md
  .claude/settings.json   (+N MCP servers, if any)
  README.md
  _workspace/memory/_index.md
  _workspace/memory/wiki/<today>-bootstrap.md  (new)

Removed:
  _workspace/memory/wiki/2026-05-13-example-decision.md
  _workspace/memory/raw/2026-05-13-example-research.md

Next:
  → /note "first impressions"   (capture into raw/)
  → /research "<first question>" (delegates to researcher → raw/)
  → /decision "<title>"          (open an ADR draft → wiki/)
```

## Rules

- **Never self-init.** If we're in the template repo, refuse. See Step 1.
- **Never overwrite** content that's clearly been customized already.
  Ask.
- **No new agents or skills** unless the user explicitly asked. Stick
  with the templated set. New ones are easy to add later via
  `/extend-domain`.
- **No new directories** in `_workspace/`. The Karpathy zones
  (raw / wiki / outputs + docs) are enough.
- **No code, no scripts, no daemons, no sub-agents, no git branches.**
  This is a markdown boilerplate. Anything beyond markdown is out of
  scope.
- **No secrets in files.** Use env vars.
- **No "multi-phase pipelines"**, no `project-analyzer`, no
  `commands-generator` invocations from this command. Those agents
  still exist — they're tools for `/extend-domain` and
  `/regenerate-domain-assets`, not for bootstrap. If a previous
  version of this command spawned sub-agents or made elaborate
  plans — that's exactly the scope creep we removed.

Begin by running Step 1 (template-detection check). If it passes, ask
the routing question from Step 2.
