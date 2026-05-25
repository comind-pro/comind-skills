---
type: index
tags: [moc]
---

# Memory — master index

Karpathy 3-zone vault. Open `_workspace/memory/` in Obsidian for graph + backlinks.
Read this index (and each zone's `_index.md`) before globbing the tree — navigating
by index keeps token cost flat as the vault grows to thousands of notes.

## Zones

- [[raw/_index|raw/]] — **unstructured capture + primary research.** Everything lands
  here first: found materials, notes, in-progress investigation, working task-notes.
- [[wiki/_index|wiki/]] — **structured internal reports + evergreen articles.** ADRs,
  distilled research writeups, build reports. The "internal Wikipedia" — raw made meaningful.
- [[outputs/_index|outputs/]] — **finished, shippable deliverables.** Final docs, decks,
  releases, built from `wiki/`.

Flow: **raw → wiki → outputs.** `_obsidian-templates/` holds Templater templates (plumbing).

## Conventions

- Filename `YYYY-MM-DD-kebab-slug.md`; frontmatter with at least `type`, `date`, `tags`.
- **Wikilinks** `[[note]]` between notes (graph + backlinks depend on it).
- **Embeds** `![[note]]` / `![[note#Heading]]` to compose instead of copy-paste.
- **Tags** — small, consistent vocabulary in frontmatter `tags: [...]`.
- Each zone has a master `_index.md` — read it first, update it when you add a note.

---

*`/init-project` tailors this to project terminology on first run.*
