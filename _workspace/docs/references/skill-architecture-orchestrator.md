# Skill Architecture — Orchestrator Script (reference)

Verbatim interview script for the `skill-architecture` skill / `/skill-architecture`
command. Source: Part 1 companion. Run this exactly when driving a
session — the SKILL.md is the contract, this is the wording.

## Before you start

One-time install of Anthropic's skill-creator (the orchestrator hands off to it
for actual builds — without it you only get specs, not working files):

```
/plugin install skill-creator@anthropics
```

Confirm: type `/skill-creator` — should show the slash-command picker.

## Rules of engagement

- ONE question at a time. Wait for the answer.
- Be a thought partner, not a yes-man. If a "skill" is too vague, too broad, or
  one-off (not recurring), push back. Ask for the specific input + specific
  output + how often it actually runs.
- Plain language. No jargon unless the user uses it first.
- Remember across cycles. If cycle 3 overlaps cycle 1, flag the overlap.
- Do NOT hand-write skill files. When it's time to build, hand off to
  `/skill-creator` (scaffolds trigger phrases, YAML frontmatter, eval cases).
- Don't auto-advance. Every step waits for the user.
- Your job ends at skills. Don't design memory or dashboard here — those are
  Parts 2/3 (`/build-dashboard`).

## CYCLE START

Begin every cycle by asking:

> "Tell me about ONE area of your daily work. Doesn't have to be organized —
> morning routine, sales, content, finance, admin, research, whatever's
> top-of-mind right now. Just talk for as long as you want, however messy.
> I'll listen and pull out the patterns."

Wait for the dump. Don't interrupt. When the user signals done (or an obvious
pause), proceed to REFLECT-BACK.

## REFLECT-BACK

After the dump, produce TWO lists:

```
TASKS I HEARD:
- <every recurring or notable task, even if not skill-worthy>

COULD BE SKILLS (repeatable, clear input + output):
- <verb-phrase name>: takes <input>, produces <output>,
  triggered when <natural-language phrase>
```

For things that DON'T make good skills (too vague / one-off / not recurring),
list under TASKS but exclude from COULD BE SKILLS with a one-line reason.

Ask:
> "Did I get the right candidates? Anything to add, drop, rename, merge, or
> split? Anything I excluded that you actually want as a skill?"

Iterate until confirmed.

## TRIAGE

For each confirmed skill, ask:
> "<skill-name>: on-demand (fire when needed), local routine (runs on a local
> schedule while your machine is on), or cloud routine (runs while your machine
> is closed)?"

Default to on-demand if unsure. Don't push routines unless the use case
obviously needs it (e.g. "5am market briefing while I sleep" → cloud routine;
"draft sponsor reply" → on-demand).

Show the final tagged list:

```
<skill-name> — on-demand
<skill-name> — local routine, daily 8am
<skill-name> — local routine, weekly Monday
```

## BUILD GATE

Ask:
> "Build these N skills now via skill-creator?
>  (A) Build all now — hand off to skill-creator for each, iterate per skill,
>      return here when each is done
>  (B) Build some, save the rest for later
>  (C) Save them all as specs, build later"

For each skill to BUILD NOW, output a hand-off in this exact shape:

```
────────────────────────────────────────────────────
NEXT SKILL: <skill-name>
────────────────────────────────────────────────────

Paste this into your next message to hand off to skill-creator:

/skill-creator

Build a skill called <skill-name>. It should: <one-paragraph spec>.
Trigger phrases: <comma-separated list>. Input: <input shape>.
Output: <output shape>. Schedule: <triage tag>.

skill-creator will interview you about edge cases, eval examples, and sample
inputs. Iterate until the skill matches what you'd produce manually. When built,
come back here and say "built" — I'll set up the next one.
────────────────────────────────────────────────────
```

Wait for "built" / "next" / "skip this one" / "spec is wrong" before moving on.
If the spec is wrong, revise and re-emit before the next skill.

For skills SAVED FOR LATER (mode B or C), produce a "save block" to copy to a
scratch note — each entry is the same `/skill-creator` hand-off ready to paste.

## LOOP

After all build-now skills are done (or in C mode), ask:
> "Built <N> skills this cycle. Saved <M> for later. Want to walk through
> another area of your work? Or wrap here?"

If another: show the running list grouped by cycle, then goto CYCLE START.

If wrap, produce FINAL SUMMARY:

```
SKILLS BUILT THIS SESSION:
Cycle 1 (<area>): <name>, <name>, <name>
Cycle 2 (<area>): <name>, <name>
...

SAVED FOR LATER:
<skill-name>: <ready-to-paste /skill-creator hand-off>
...
```

Then hand off to next parts:

> "Skill architecture done. Fire any of these from any Claude Code conversation
> by typing the trigger phrase. Stop here if that's all you wanted — the skills
> alone are most of the value.
>
> Optional next steps:
> PART 2 — Memory layer. Vault structure so skills compound across sessions
> (`/build-dashboard`, Phases 1–2).
> PART 3 — Dashboard. Wire skills into a visual dashboard (`/build-dashboard`)."

## GO

Begin Cycle 1 now. Ask for the first dump.

## What good looks like at end of session

- N skill files in `~/.claude/skills/` (or vault-scoped `<vault>/.claude/skills/`),
  each invokable by trigger phrase from any Claude Code conversation
- Each skill small + specific — one verb, one input shape, one output shape. NOT
  "manage my email".
- Each tagged: on-demand / local routine / cloud routine
- A "saved for later" list, each with a ready-to-paste `/skill-creator` hand-off

## Common pitfalls (push back on these)

| Pitfall | Looks like | Fix |
|---|---|---|
| Skill too broad | "manage my email" | Narrow: "draft sponsor reply from inbound pitch" |
| Skill is a one-off | "set up my CRM" | Skip — one-time project, not a skill |
| Skill is a preference | "remind me to drink water" | Skip — habit cue, not a skill |
| Over-routining | tagging everything a routine | Default on-demand unless it must run when forgotten |
| Bypassing skill-creator | hand-writing SKILL.md | Don't — skill-creator scaffolds triggers, YAML, evals |

## Why cycle-based instead of one big interview

- One area at a time = low cognitive load.
- Build after each cycle = momentum (real files appear as you go).
- Natural break points — stop after cycle 1, resume tomorrow.
- No artificial cap — some users do 1 cycle, some do 6. Both valid.
