---
name: parallel-agents-in-cdock
description: Runs fan-out work (parallel reviews, cross-model doubt, competing-hypothesis debugging, independent build tasks) as visible worker panes in comind-dock instead of hidden subagents, collecting structured results with `cdock task done`. Use when the CDOCK_PANE_ID environment variable is set and a skill calls for parallel personas, a second model, or long-running independent work the user may want to watch or take over.
---

# Parallel Agents in cdock

## Overview

Inside [comind-dock](https://comind.pro/dock) every agent runs in a persistent pane, and an agent can spawn sibling panes, hand them a task, and get a structured result back. That turns the repo's fan-out patterns (`/ship`, doubt-driven cross-model review, Agent-Teams-style debugging) into **visible, persistent, mixed-CLI workers**: the user sees each one, can type into any of them, and nothing is lost when the orchestrating conversation compacts or restarts.

This skill is the *process* — when to use panes, how to brief and collect. The *mechanics* (every command and flag) live in the `cdock` skill that comind-dock installs into each agent; read it for syntax.

## When to Use

- `CDOCK_PANE_ID` is set **and** a skill calls for parallel work:
  - `/ship` Phase A (code-reviewer, security-auditor, test-engineer)
  - doubt-driven-development cross-model escalation (codex / gemini as the cold reviewer)
  - competing-hypothesis debugging (one pane per hypothesis)
  - independent implementation tasks from planning-and-task-breakdown
- The work is long (minutes, not seconds), or the user may want to watch or steer a worker.
- You want a *different* agent CLI's judgment, not another instance of yourself.

**When NOT to use:**
- `CDOCK_PANE_ID` is unset — use the Agent tool / subagents as the skill describes.
- Short, read-only lookups — a subagent is cheaper and returns faster.
- Tasks that must share uncommitted edits in one working tree at the same time — serialize them or use worktrees.
- Non-interactive runs (CI, `/loop`, scheduled) that did not ask for panes.

## The Process

### 1. Decide the team

One pane per independent unit of work. Pick the CLI per pane on purpose: a different model for adversarial review, the same model for parallel build tasks. Reuse existing team panes (`team list`) before spawning new ones.

### 2. Spawn into the right place

Spawn with `--team "$CDOCK_PANE_ID"` so results and wake-ups route to you, and `--wait-ready` so the first prompt is not typed into a booting CLI. Name each pane after its job (`pane rename`) — the user reads the sidebar, not your plan.

### 3. Brief completely, once

Each worker starts cold. Write the brief to a file and send it with `pane run <id> --file brief.md` — never interpolate code into a shell-quoted argument. A brief contains:

- **Goal and scope** — what to do, which files, what is out of scope.
- **Contract** — what "done" means and the exact report shape you want back.
- **Constraints** — read-only or allowed to edit; branch / worktree; no pushes.
- **The last line, always:** `When finished, run: "$CDOCK_BIN" task done --file report.md` (or `task done "<one-paragraph result>"`).

For a cross-model doubt review, the brief is the ARTIFACT + CONTRACT + adversarial prompt only — no session context, no CLAIM (same rule as doubt-driven-development), and the worker is told it is read-only.

### 4. End your turn — don't poll

After assigning, stop. cdock wakes you with a `[cdock] team update` when a worker reports, blocks, stalls, or hits a provider limit. Then `task result <id>` (FIFO, consumed on read) or `wait task-result <id>` if you must block. Do not loop on `pane read`; do not `sleep`.

### 5. Merge in the main context

Synthesize exactly as the calling skill says (`/ship` Phase B, doubt-driven RECONCILE). Attribute every finding to its pane and CLI. A blocked or stalled worker is a finding too — read its screen, answer or re-task it, and say so in the merge.

### 6. Clean up

Close the panes **you** spawned once their results are read (`pane close`). Never close panes the user assigned to your team. Record what ran where in the final summary.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "Subagents are simpler, panes are overkill" | For a 20-second lookup, yes. For a 10-minute review the user wants to see, or a second model's opinion, panes are the point. |
| "I'll check on the worker every minute" | cdock wakes you on result, block, stall and limit. Polling burns context and can type into a pane the user is driving. |
| "The worker can figure out the context" | It starts cold. A missing contract produces an unmergeable report. |
| "I'll quote the diff inline in `pane run`" | Backticks and `$(...)` break or execute. Use `--file`. |
| "Close all the panes when done" | Only the ones you spawned. User-assigned panes are theirs. |

## Red Flags

- Spawning panes when `CDOCK_PANE_ID` is unset, or outside a skill that asked for parallel work.
- A brief without the `task done` last line — the result never comes back.
- Two workers editing the same files in one tree concurrently.
- Writing into a pane that is not in your `team list`.
- Merging without naming which pane/CLI produced each finding.

## Verification

- [ ] Every worker was spawned with `--team "$CDOCK_PANE_ID"` and renamed after its job.
- [ ] Every brief went through `--file` and ended with the `task done` instruction.
- [ ] You ended your turn after assigning instead of polling.
- [ ] Every result was read before its pane was closed; only self-spawned panes were closed.
- [ ] The merge attributes findings to panes and states any skipped or failed worker.
