---
type: index
date: 2026-05-13
tags: [moc]
---

# Memory — vault homepage

This is the project's memory vault. Open this folder
(`_workspace/memory/`) in **Obsidian** for graph view, backlinks, and
Templater.

## Categories

- [[tasks/]] — work items. One file per task. See the
  `task-management` skill for the schema.
- [[decisions/]] — architectural / process decisions (ADRs).
- [[research/]] — investigation notes with sources.
- [[daily/]] — daily journal.

## Conventions

- Filename: `YYYY-MM-DD-kebab-slug.md`.
- Every note has frontmatter with at least `type`, `date`, `tags`.
- Use `[[wikilinks]]` between notes — the graph view depends on it.
- After bulk edits, run `node _workspace/bin/reindex.js`.

## Dashboards

- Local web dashboard: `just dashboard` → http://localhost:7878
- Obsidian for graph + backlinks
- SQLite at `_workspace/db/index.sqlite` for ad-hoc queries

---

*Edit this freely. `/init-project` will tweak it on first run to mention
project-specific terminology.*
