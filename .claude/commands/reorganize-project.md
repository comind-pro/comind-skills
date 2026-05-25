---
name: reorganize-project
description: Reorganize an existing project's loose files into the comind structure — sort scattered notes/docs/deliverables into the Karpathy vault zones, relocate shared docs to `_workspace/docs/`, optionally split into per-project sub-vaults, and update existing documentation + indexes. Runs AFTER `/init-project`, plan-first with an approval gate before anything moves.
argument-hint: "<optional: hint, e.g. 'split into api + web subprojects' or 'just sort docs/'>"
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
---

You are reorganizing an **already-bootstrapped** project so its existing files
match the comind structure. This is the cleanup pass that `/init-project`
deliberately skips: init customizes the boilerplate; this command moves the
*project's own* scattered files into place.

**Plan-first, destructive-aware.** Nothing moves, gets renamed, or gets deleted
until the user approves a written migration plan. Preserve git history with
`git mv`. Never overwrite a customized file without asking.

## Step 0: preconditions

1. **Refuse on the template repo itself.** Reuse the detection from
   `/init-project` Step 1 (origin = `comind-pro/comind-skills` AND README still
   has the `# BOILERPLATE` marker). If both fire, stop — this command is for a
   real project, not the template.
2. **Require that init already ran.** Confirm the comind skeleton exists:
   `_workspace/memory/_index.md` and the three zones (`raw/`, `wiki/`,
   `outputs/`). If missing, stop and tell the user to run `/init-project` first.
3. **Require a clean-ish working tree.** Run `git status --short`. If there are
   uncommitted changes, warn the user — moves are easier to review and revert
   from a clean baseline. Offer to proceed anyway or pause.

## Step 1: inventory (read-only)

Walk the repo and build a picture. Do **not** move anything yet.

1. **Top-level orientation:** `ls -la`, then `git ls-files | head -200` to see
   what's tracked.
2. **Find loose markdown / docs** outside the comind dirs — notes, research,
   design docs, meeting notes, READMEs in odd places, `docs/`, `notes/`,
   `research/`, `wiki/`, scratch files. Glob: `**/*.md`, excluding
   `.claude/**`, `_workspace/**`, `node_modules/**`, `.git/**`.
3. **Find deliverables** — finished reports, decks, exported artifacts,
   published outputs.
4. **Detect distinct areas / bounded contexts** — separate apps, packages,
   services, or topic clusters (e.g. `api/`, `web/`, `ml/`, or several
   unrelated note clusters). These are candidate **sub-projects**.
5. **Read the existing `_workspace/memory/_index.md`** to learn whether the
   vault is already single- or multi-project.

Summarize findings in 5–10 bullets: what exists, where, and what looks like a
distinct area. Keep it tight.

## Step 2: choose the layout

Ask **one** routing question (skip if `$ARGUMENTS` already answers it):

> Is this a **single-project** vault (all working notes share one
> `raw/wiki/outputs` set), or a **multi-project** vault (several areas, each
> getting its own zone set)?
>
> 1. Single-project — keep `_workspace/memory/{raw,wiki,outputs}`
> 2. Multi-project — `_workspace/memory/<project>/{raw,wiki,outputs}` per area

Multi-project layout follows the ADR at
`_workspace/memory/wiki/2026-05-25-multi-project-vault-layout.md`. If the user
picks multi-project, propose the sub-project names from the areas detected in
Step 1 and confirm them before scaffolding.

## Step 3: classification rules

Sort every loose file into exactly one destination. The Karpathy flow is
**raw → wiki → outputs**:

| Source file looks like… | Destination |
|---|---|
| Unstructured capture, scratch notes, raw research, in-progress task notes | `…/memory/raw/` |
| Structured/distilled writeups, ADRs, internal reports, evergreen articles | `…/memory/wiki/` |
| Finished, shippable deliverables (final docs, decks, releases) | `…/memory/outputs/` |
| Shared docs common to all projects (build guides, conventions, references, general instructions) | `_workspace/docs/` (NOT `memory/` — per the multi-project ADR) |
| Project README, architecture, contributing | leave at root / `_workspace/docs/` as appropriate; don't bury these in the vault |
| Source code, configs, lockfiles, assets | **leave in place** — this command organizes notes/docs, not code |

In multi-project mode, `…/memory/` is `…/memory/<project>/`. Shared docs still
go to the single `_workspace/docs/` regardless of mode.

When a file's zone is ambiguous, default to `raw/` (capture first; promotion to
`wiki/` is a later, deliberate step) and flag it in the plan.

## Step 4: write the migration plan (approval gate)

Produce a plan the user reviews **before any change**. Render as a table:

```
PROPOSED MOVES
  <src path>                          → <dest path>        [zone] reason
  ...

NEW DIRECTORIES
  _workspace/memory/<project>/{raw,wiki,outputs}   (multi-project)
  ...

DOC UPDATES
  <path>   — what will change (e.g. "rewrite intro for this project")

INDEX UPDATES
  _workspace/memory/_index.md         — list sub-projects / new notes
  …/raw/_index.md, …/wiki/_index.md   — add migrated notes

LEFT IN PLACE
  <count> source/code files untouched
```

Stop and ask for approval. Let the user edit the plan (drop moves, change
destinations, rename sub-projects). **Do not proceed until they approve.**

## Step 5: execute (after approval)

1. **Create destination dirs** for the chosen layout. In multi-project mode,
   scaffold `<project>/{raw,wiki,outputs}` each with its own `_index.md`.
2. **Move with history:** `git mv <src> <dest>` for every approved move. Use
   plain `mv` only for untracked files. Move in small batches; never lose
   content.
3. **Normalize filenames** to the convention `YYYY-MM-DD-kebab-slug.md` where it
   makes sense (don't fight an existing sane name). Add missing frontmatter
   (`type`, `date`, `tags`) to migrated notes that lack it.
4. **Fix links.** After moving, update wikilinks/embeds and any relative
   markdown links that broke. Grep for references to the old paths and patch
   them. Orphan links (graph islands) defeat the vault — wire moved notes to
   neighbors with `[[…]]`.
5. **Update existing documentation** flagged in the plan — rewrite stale paths,
   merge duplicate docs, point READMEs at the new locations.
6. **Update every touched `_index.md`** — vault index lists sub-projects (multi)
   or stays as-is (single); each zone index gains its new notes. Indexes are the
   navigation contract; a move that isn't indexed is a move that's lost.
7. **Update `CLAUDE.md`** only if the layout changed in a way that affects "where
   things live" (e.g. switched to multi-project). Keep it short.

## Step 6: verify

- `git status --short` — review every move; confirm nothing unexpected got
  deleted or left dangling.
- `grep -rn '\[\[' _workspace/memory` spot-check — no wikilinks pointing at
  moved-away paths.
- Each new/changed `_index.md` lists what's actually in its folder.
- Source code dirs are untouched (`git status` shows only doc/note moves).

Print a summary: N files moved (by zone), sub-projects created, docs updated,
indexes updated, files left in place. End by reminding the user the moves are
staged in git and easy to revert (`git reset` / `git restore`) if the layout
isn't right.

## Rules

- **Plan before move.** No `git mv`, rename, or delete before Step 4 approval.
- **`git mv`, not delete-and-recreate.** Preserve history.
- **Never touch source code** beyond fixing doc links that reference it. This
  command organizes notes and docs.
- **Shared content → `_workspace/docs/`, not `memory/`.** `memory/` is per-project
  working notes only (multi-project ADR).
- **No orphans.** Every moved note gets at least one `[[wikilink]]` and an index
  entry.
- **One vault index → project index → zone index.** Keep the index discipline so
  navigation stays one small read, not a full-tree glob.
- **Ask, don't assume**, when a file's zone or a sub-project boundary is unclear.

Begin with Step 0 (preconditions). If they pass, run the read-only inventory and
present findings before asking the layout question.
