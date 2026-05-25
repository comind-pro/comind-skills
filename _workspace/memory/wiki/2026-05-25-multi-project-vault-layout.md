---
type: decision
date: 2026-05-25
status: proposed
tags: [adr, vault, init-project, dashboard, architecture]
---

# Multi-project vault layout (per-project Karpathy zones)

> **Status: proposed / future direction.** Captures the intended `/init-project`
> behavior. Not yet implemented — today the vault is single-project
> (`memory/{raw,wiki,outputs}`).

## Idea

One Obsidian vault can serve **one project** or **many projects**, chosen at
`/init-project` time by configuration. The Karpathy zones (`raw → wiki → outputs`)
can be scoped per project.

### Single-project (current default)

```
_workspace/memory/
  _index.md
  raw/  wiki/  outputs/
```

### Multi-project (monorepo-style vault)

One vault sits above several projects; each project gets its own zone set:

```
_workspace/memory/
  _index.md                      # lists projects + shared layout
  <project-a>/
    _index.md
    raw/  wiki/  outputs/
  <project-b>/
    _index.md
    raw/  wiki/  outputs/
```

Sub-projects can appear over time, or be declared up front at init.

## Rules

- **Mode is set at `/init-project`.** It asks (or detects) whether this vault is
  single-project or a multi-project root, and scaffolds the layout accordingly.
- **Claude must understand the active mode** from `memory/_index.md` and navigate
  to the right project's zones — don't assume single-project.
- **Shared / general content is NOT in `memory/`.** Anything common to all
  projects — general instructions, build guides, references, conventions — lives in
  `_workspace/docs/`. `memory/` holds only per-project (or per-vault) working notes.
- **The dashboard can be global across all projects** in a multi-project vault
  (one dashboard surfacing metrics/runs across sub-projects), or scoped per project
  — also an init-time choice.

## Why

- Lets one operator either manage a single project or run a vault-of-projects from
  one level above, without two different tools.
- Keeps the token-efficient index discipline at each level (vault index → project
  index → zone index).
- Separates durable shared knowledge (`_workspace/docs/`) from churny per-project
  memory (`memory/`).

## Open questions

- How `/init-project` detects vs. asks for the mode.
- Whether the runner's `COMIND_VAULT` points at the vault root or a project subdir
  in multi-project mode, and how the dashboard aggregates across projects.
- Per-project vs. global `system/` working dirs.
