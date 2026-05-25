---
name: skill-architecture
description: Designs and builds a user's Claude Code skill library through a cyclical, one-area-at-a-time interview. Use when a user wants to turn their recurring workflows into invokable skills, when they ask "help me build my skills" / "design my skill architecture" / "what should be a skill", or as Part 1 of the agentic-OS build (skills → memory → dashboard). Hands off each confirmed skill to Anthropic's skill-creator for the actual file scaffold.
---

# Skill Architecture

## Overview

Most of the leverage in an agentic OS lives in the skills, not the dashboard or
the memory layer. A skill is a small, specific, repeatable unit of work — one
verb, one input shape, one output shape — that any Claude Code session can fire
by trigger phrase. The hard part is not writing `SKILL.md` files; it is finding
which of a person's recurring tasks are actually skill-worthy and which are
one-offs, preferences, or too broad to be useful.

This skill runs that discovery as a **conversational interview in cycles**, one
workflow area at a time. Each cycle: the user dumps about one area, you reflect
back the tasks you heard and propose which become skills, the user confirms, you
triage each by execution mode, then hand off to `skill-creator` to build the
files. Loop until the user wraps.

It is the entry point of the 3-part agentic-OS build:

1. **Part 1 — Skills (this skill).** Build the invokable workflow units.
2. **Part 2 — Memory layer.** Vault structure so skills compound across sessions
   (see `dashboard-build`, Phases 1–2).
3. **Part 3 — Dashboard.** Wire skills into a visual dashboard (see `dashboard-build`).

You can stop after Part 1 and already have leverage.

## When to Use

Apply this skill when:

- The user wants to convert recurring work into Claude Code skills
- The user invokes: "design my skill architecture", "help me build skills",
  "what should be a skill", "/skill-architecture"
- Starting the agentic-OS masterclass build (this is Part 1)
- The user has a pile of repetitive tasks and no skills yet, or has ad-hoc
  skills they want rationalized

**When NOT to use:**

- The user wants ONE specific skill built right now → hand straight to
  `skill-creator`, skip the interview
- The user is editing the comind-skills template's own lifecycle skills (those
  are maintained by the `_meta` agents, not authored per-user)
- Pure information requests about how skills work

## Loading Constraints

This skill needs a live, responsive user — it is an interview. **Do not invoke
in non-interactive contexts** (CI, `/loop`, scheduled runs, autonomous-loop).
The `skill-creator` hand-off also assumes an interactive session.

## Prerequisite

The build step hands off to Anthropic's `skill-creator`. Without it you can only
produce specs, not working files. Confirm it once:

```
/plugin install skill-creator@anthropics
```

Verify by typing `/skill-creator` — the slash-command picker should appear.

## The Process

Work in **cycles, not phases**. One workflow area per cycle. The full verbatim
orchestrator script (rules of engagement, exact question wording, hand-off
message format) lives in
`_workspace/references/skill-architecture-orchestrator.md` — load it and follow
it exactly when running a session. The stages below are the contract.

### Stage 1 — Cycle start (dump)

Ask the user to talk about ONE area of their daily work, freeform, however
messy. Do not interrupt. Wait for a clear "done" signal or an obvious pause.

### Stage 2 — Reflect-back

Produce two lists:

- **TASKS I HEARD** — every recurring or notable task, even if not skill-worthy.
- **COULD BE SKILLS** — only repeatable tasks with a clear input + output, each
  as `<verb-phrase name>: takes <input>, produces <output>, triggered when
  <natural-language phrase>`.

For tasks that do NOT make good skills, list them under TASKS only and note a
one-line reason for exclusion. Iterate until the user confirms the candidate
list.

### Stage 3 — Triage

For each confirmed skill, tag the execution mode:

- **on-demand** — user fires it manually (default; pick this when unsure)
- **local routine** — runs on a local schedule while the machine is on (cron /
  Task Scheduler; wired in Part 3)
- **cloud routine** — runs while the machine is closed (`/schedule`)

Show the final tagged list before moving on.

### Stage 4 — Build gate

Offer three modes: (A) build all now, (B) build some + save the rest, (C) save
all as specs. For each skill to build now, emit the `skill-creator` hand-off
message in the exact shape from the reference, then wait for the user to say
"built" / "next" / "skip" / "spec is wrong" before moving to the next. For saved
skills, emit a copy-paste "save block" of ready-to-paste hand-offs.

### Stage 5 — Loop or wrap

Ask whether to walk through another area or wrap. If another, show the running
list grouped by cycle and return to Stage 1. If wrap, produce the FINAL SUMMARY
(skills built per cycle + saved-for-later block) and point to Parts 2/3.

## Be a Thought Partner, Not a Yes-Man

The value of this skill is in what it talks the user OUT of building. Push back
when a proposed skill is:

| Pitfall | Looks like | Fix |
|---|---|---|
| Too broad | "manage my email" | Narrow to a specific input/output: "draft sponsor reply from inbound pitch" |
| A one-off | "set up my CRM" | Skip — one-time project, not a skill |
| A personal preference | "remind me to drink water" | Skip — habit cue, not a Claude Code skill |
| Over-routined | tagging everything as a routine | Default to on-demand unless it must run even when forgotten |
| Bypassing skill-creator | hand-writing SKILL.md | Don't — skill-creator scaffolds triggers, YAML, eval cases properly |

## Rules of Engagement

- ONE question at a time. Wait for the answer.
- Plain language; no jargon unless the user uses it first.
- Remember across cycles — if cycle 3 overlaps cycle 1, flag the overlap.
- Do NOT hand-write skill files; hand off to `skill-creator` for every build.
- Never auto-advance. Every stage waits for the user.
- Your job ends at skills. Don't design memory or dashboard here — those are
  Parts 2/3 (`dashboard-build`).

## Output

End-of-session deliverables:

- N working skill files in `~/.claude/skills/` (user-global) or
  `<vault>/.claude/skills/` (project-scoped), each invokable by trigger phrase
- Each skill is small + specific (one verb, one input, one output)
- Each tagged on-demand / local routine / cloud routine
- A "saved for later" list, each with a ready-to-paste `skill-creator` hand-off

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "Just batch all the questions" | Batching kills the cycle's low-cognitive-load advantage. One area, then build, then loop. |
| "This task is obviously a skill, skip the reflect-back" | The reflect-back is where you catch too-broad and one-off candidates. Run it. |
| "I'll hand-write the SKILL.md, it's faster" | skill-creator scaffolds trigger phrases, frontmatter, and eval cases you'll otherwise skip. Use it. |
| "Tag it as a routine to be safe" | Routines run unattended and cost tokens. Default on-demand; routine only when it must fire when forgotten. |
| "Cover memory + dashboard while we're here" | Scope creep. Part 1 ends at skills. Point to Parts 2/3 and stop. |

## Red Flags

- Asking for a "brain dump of all 30 tasks" instead of one area at a time
- Skipping reflect-back and going straight to building
- Accepting a vague skill ("manage my email") without narrowing input/output
- Hand-writing `SKILL.md` instead of handing off to `skill-creator`
- Tagging most skills as routines
- Drifting into memory-layer or dashboard design mid-cycle

## Verification

After a session:

- [ ] At least one full cycle ran: dump → reflect-back → triage → build gate
- [ ] Questions were asked one at a time, waiting for each answer
- [ ] Each candidate skill has a clear input + output + trigger phrase
- [ ] At least one too-broad / one-off / preference candidate was pushed back on
- [ ] Each built skill went through `skill-creator`, not hand-written
- [ ] Each skill is tagged on-demand / local routine / cloud routine
- [ ] A FINAL SUMMARY (built per cycle + saved-for-later) was produced on wrap
- [ ] Any hand-off to Parts 2/3 was framed as optional, not required
