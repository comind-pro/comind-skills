---
description: Design and build your Claude Code skill library through a cyclical, one-area-at-a-time interview (agentic-OS Part 1)
---

Invoke the `skill-architecture` skill.

This is Part 1 of the agentic-OS build (skills → memory → dashboard). Your job
ends at skills — do not design the memory layer or dashboard here.

Before starting, confirm Anthropic's skill-creator is installed (the build step
hands off to it):

```
/plugin install skill-creator@anthropics
```

Then load the verbatim orchestrator script at
`_workspace/docs/references/skill-architecture-orchestrator.md` and run it exactly:
work in cycles (one workflow area at a time), reflect back tasks → candidate
skills, triage each (on-demand / local routine / cloud routine), then hand off
each confirmed skill to `/skill-creator`. Loop until the user wraps, then produce
the final summary and point to Parts 2/3 (`/build-dashboard`).

Rules: one question at a time, wait for each answer, push back on too-broad /
one-off / preference "skills", never hand-write SKILL.md files.
