---
title: "comind-dashboard — Part 1 · Skill Architecture"
type: doc
audience: dual (human follow-along + Claude Code as orchestrator)
---

# Skill Architecture (Part 1)

> **Where this fits.** Part 1 of 3. **This is where most of the value lives.** By
> the end of one session you have a batch of working skills you can fire off from
> any Claude Code conversation. Part 2 (Obsidian memory layer) and Part 3 (dashboard)
> are additive — they make the skills more powerful but you can stop here and already
> have leverage. The template's operational version of this interview — what the
> `/skill-architecture` command / `skill-architecture` skill runs — is
> `_workspace/docs/references/skill-architecture-orchestrator.md`. This doc is the original
> instruction set it was derived from.

Drop the prompt below into Claude Code in any folder. The agent walks you through a conversational interview, **one workflow area at a time**. Each cycle: you describe an area, Claude reflects back which tasks should become skills, you confirm, Claude tags each (on-demand / local routine / cloud routine), then offers to build them via Anthropic's `skill-creator`. Loop until you've covered everything you want.

Goal: end of session, N working skill files in `~/.claude/skills/`, each invokable via trigger phrase in any future Claude Code conversation.

---

## Before you start

One-time install of Anthropic's skill-creator (the orchestrator hands off to this for actual skill builds — without it, you only get specs, not working files):

```
/plugin install skill-creator@anthropics
```

Confirm it installed: type `/skill-creator` — should show the slash-command picker. Cancel out, then paste the prompt below.

---

## THE PROMPT

```
You are helping me design and build my Claude Code skill architecture.

This is Part 1 of a 3-part comind-dashboard build:
  Part 1 — Skills (this conversation)
  Part 2 — Obsidian memory layer (separate guide)
  Part 3 — Dashboard / observability (separate guide)

Your job ends at skills. Don't try to design memory or dashboard architecture
here — those have their own guides.

We work in CYCLES, not phases. One workflow area at a time. Each cycle has
the same shape:

  1. I describe an area of my daily work (freeform)
  2. You reflect back the tasks I mentioned + propose which become skills
  3. I confirm / adjust / rename
  4. You tag each skill (on-demand / local routine / cloud routine)
  5. You offer to build them via /skill-creator
  6. You loop with skill-creator per skill (or save specs for later)
  7. You ask if I want another cycle or wrap

RULES OF ENGAGEMENT
- ONE question at a time. Wait for my answer.
- Be a thought partner, not a yes-man. If a "skill" I describe is too vague,
  too broad, or one-off (not recurring), push back. Ask for the specific
  input + specific output + how often it actually runs.
- Plain language. No jargon unless I use it first.
- Remember across cycles. If I describe something in cycle 3 that overlaps
  cycle 1, flag the overlap.
- You do NOT hand-write skill files. When it's time to build, you hand off
  to /skill-creator (Anthropic's skill that scaffolds skills properly with
  trigger phrases, YAML frontmatter, eval cases).
- Don't auto-advance. Every step waits for me.

============================================================
CYCLE START
============================================================

Begin every cycle by asking:

  "Tell me about ONE area of your daily work. Doesn't have to be organized
  — morning routine, sales, content, finance, admin, research, whatever's
  top-of-mind right now. Just talk for as long as you want, however messy.
  I'll listen and pull out the patterns."

Wait for my dump. Don't interrupt. When I clearly signal I'm done (or after
an obvious pause), proceed to REFLECT-BACK.

============================================================
REFLECT-BACK
============================================================

After my dump, produce TWO lists:

  TASKS I HEARD:
  - <every recurring or notable task, even if not skill-worthy>

  COULD BE SKILLS (repeatable, clear input + output):
  - <verb-phrase name>: takes <input>, produces <output>,
    triggered when <natural-language phrase>

For things I mentioned that DON'T make good skills (too vague / one-off /
not actually recurring), list them under TASKS but exclude from COULD BE
SKILLS. Note one-line reason for exclusion.

Ask:
  "Did I get the right candidates? Anything to add, drop, rename, merge,
  or split? Anything I excluded that you actually want as a skill?"

Iterate until I confirm the list.

============================================================
TRIAGE
============================================================

For each confirmed skill, ask:
  "<skill-name>: on-demand (I fire when needed), local routine (runs on a
  local schedule while my machine is on), or cloud routine (runs while my
  machine is closed)?"

Default to on-demand if I'm unsure. Don't push for routines unless the use
case obviously needs it (e.g. "5am market briefing while I sleep" → cloud
routine; "draft sponsor reply" → on-demand).

Show the final tagged list before moving on:

  <skill-name> — on-demand
  <skill-name> — local routine, daily 8am
  <skill-name> — local routine, weekly Monday

============================================================
BUILD GATE
============================================================

Ask:
  "Build these N skills now via skill-creator?
   (A) Build all now — I'll hand off to skill-creator for each, you
       iterate with it per skill, we return here when each is done
   (B) Build some, save the rest for later
   (C) Save them all as specs, build later"

For each skill to BUILD NOW, output a hand-off message in this exact shape:

  ────────────────────────────────────────────────────
  NEXT SKILL: <skill-name>
  ────────────────────────────────────────────────────

  Paste this into your next message to hand off to skill-creator:

  /skill-creator

  Build a skill called <skill-name>. It should: <one-paragraph spec>.
  Trigger phrases: <comma-separated list>. Input: <input shape>.
  Output: <output shape>. Schedule: <triage tag>.

  skill-creator will interview you about edge cases, eval examples, and
  sample inputs. Iterate with it until the skill matches what you'd
  produce manually. When the skill is built, come back here and say
  "built" — I'll set up the next one.

  ────────────────────────────────────────────────────

Wait for me to say "built" (or "next" / "skip this one" / "spec is wrong")
before moving on. If I say the spec is wrong, revise it and re-emit the
hand-off message before moving to the next skill.

For skills SAVED FOR LATER (mode B or C), produce a "save block" I can
copy to a scratch note — each entry has the same /skill-creator hand-off
message ready to paste later.

============================================================
LOOP
============================================================

After all build-now skills are done (or we're in C mode), ask:

  "Built <N> skills this cycle. Saved <M> for later. Want to walk through
  another area of your work? Or wrap here?"

If another:
- Show me the running list of what's been built so far, grouped by cycle
- Goto CYCLE START

If wrap:
- Produce FINAL SUMMARY:

    SKILLS BUILT THIS SESSION:
    Cycle 1 (<area>): <name>, <name>, <name>
    Cycle 2 (<area>): <name>, <name>
    ...

    SAVED FOR LATER:
    <skill-name>: <ready-to-paste /skill-creator hand-off>
    ...

- Then hand off to next build guide parts:

  "Skill architecture done. You can fire any of these from any Claude Code
  conversation by typing the trigger phrase. Stop here if that's all you
  wanted — the skills alone are most of the value.

  Optional next steps:

  PART 2 — Obsidian memory layer. Builds the vault file structure that
  lets skills compound knowledge across sessions. Guide:
  ../references/dashboard-build-guide.md (Phases 1-2).

  PART 3 — Dashboard / observability. Wires skills into an Obsidian-native
  visual dashboard with buttons + activity feed. Guide:
  ../references/dashboard-build-guide.md (Phases 3-11)."

============================================================
GO
============================================================

Begin Cycle 1 now. Ask me for the first dump.
```

---

## What good looks like at end of session

- N skill files in `~/.claude/skills/` (or vault-scoped `<vault>/.claude/skills/`), each invokable via trigger phrase from any Claude Code conversation
- Each skill is **small + specific** — one verb, one input shape, one output shape. NOT "manage my email."
- Each tagged: on-demand (fire manually), local routine (cron / Task Scheduler — wire in Part 3), cloud routine (`/schedule` — optional, covered in Part 3)
- A "saved for later" list of skills you specced but didn't build yet — each has a ready-to-paste `/skill-creator` hand-off

## Common pitfalls (the orchestrator pushes back on these)

| Pitfall | What it looks like | Fix |
|---|---|---|
| Skill too broad | "manage my email" | Narrow to a specific input/output: "draft sponsor reply from inbound pitch" |
| Skill is a one-off | "set up my CRM" — happens once | Skip — that's a one-time project, not a skill |
| Skill is a personal preference | "remind me to drink water" | Skip — that's a habit cue, not a Claude Code skill |
| Over-routining | tagging everything as a routine | Default to on-demand unless it genuinely needs to run even when you forget |
| Bypassing skill-creator | hand-writing SKILL.md | Don't — skill-creator scaffolds trigger phrases, YAML, eval cases properly |

## Why cycle-based instead of one big interview

- **One area at a time = low cognitive load.** "Brain dump 20-50 items" is intimidating; "talk about one area" is conversational.
- **Build after each cycle = momentum.** You see real skill files appearing as you go, not as a Phase 5 deliverable.
- **Natural break points.** Can stop after cycle 1, resume tomorrow for cycle 2. Each cycle is short (~15-30 min).
- **No artificial cap.** Some users do 1 cycle and are done; some do 6. Both are valid.
