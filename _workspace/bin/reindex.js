#!/usr/bin/env node
/**
 * reindex.js — rebuild _workspace/db/index.sqlite from the markdown vault.
 *
 *   node reindex.js                       # full rebuild
 *   node reindex.js --only tasks          # only the tasks table
 *   node reindex.js --since '1 hour ago'  # incremental by mtime
 *
 * Tables: notes, tasks, task_tags, links.
 * The `runs` table is created and populated by store-run-summary.js.
 */

const fs = require('fs');
const path = require('path');
const { open } = require('./_sqlite');

const WS = path.resolve(__dirname, '..');
const MEMORY = path.join(WS, 'memory');
const DB_PATH = path.join(WS, 'db', 'index.sqlite');

const args = process.argv.slice(2);
const onlyIdx = args.indexOf('--only');
const ONLY = onlyIdx >= 0 ? args[onlyIdx + 1] : null;
const sinceIdx = args.indexOf('--since');
const SINCE_EXPR = sinceIdx >= 0 ? args[sinceIdx + 1] : null;
const SINCE_MS = SINCE_EXPR ? parseSinceExpr(SINCE_EXPR) : null;

function parseSinceExpr(e) {
  const m = e.match(/^(\d+)\s*(second|minute|hour|day)s?\s*ago$/i);
  if (!m) return null;
  const u = { second: 1e3, minute: 6e4, hour: 36e5, day: 864e5 }[m[2].toLowerCase()];
  return Date.now() - Number(m[1]) * u;
}

// tiny YAML frontmatter parser — strings, numbers, booleans, inline arrays.
function parseFrontmatter(src) {
  const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { meta: {}, body: src };
  const meta = {};
  for (const line of m[1].split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const c = line.indexOf(':');
    if (c < 0) continue;
    const key = line.slice(0, c).trim();
    let raw = line.slice(c + 1).trim();
    if (raw === '') { meta[key] = null; continue; }
    raw = raw.replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
    if (raw.startsWith('[') && raw.endsWith(']')) {
      meta[key] = raw.slice(1, -1).split(',')
        .map(s => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
      continue;
    }
    if (raw === 'true') { meta[key] = true; continue; }
    if (raw === 'false') { meta[key] = false; continue; }
    if (/^-?\d+(\.\d+)?$/.test(raw)) { meta[key] = Number(raw); continue; }
    meta[key] = raw;
  }
  return { meta, body: m[2] };
}

function* walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir)) {
    if (name.startsWith('_')) continue;
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) yield* walk(p);
    else if (name.endsWith('.md')) yield { path: p, mtimeMs: st.mtimeMs };
  }
}

function extractWikilinks(body) {
  const out = new Set();
  const re = /\[\[([^|\]\n#]+)(?:[|#][^\]]*)?\]\]/g;
  let m;
  while ((m = re.exec(body))) out.add(m[1].trim());
  return [...out];
}

function typeFromPath(p) {
  const first = path.relative(MEMORY, p).split(path.sep)[0];
  if (['tasks', 'decisions', 'research', 'daily', 'index'].includes(first))
    return first === 'index' ? 'index' :
           first === 'tasks' ? 'task' :
           first.replace(/s$/, '');
  return 'note';
}

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const db = open(DB_PATH);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS notes (
    path TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    title TEXT,
    date TEXT,
    tags_json TEXT,
    frontmatter_json TEXT,
    body TEXT,
    updated_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_notes_type ON notes(type);
  CREATE INDEX IF NOT EXISTS idx_notes_date ON notes(date);

  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    path TEXT NOT NULL UNIQUE,
    title TEXT,
    status TEXT,
    priority TEXT,
    area TEXT,
    assignee TEXT,
    created TEXT,
    due TEXT,
    blocked_by_json TEXT,
    updated_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
  CREATE INDEX IF NOT EXISTS idx_tasks_due ON tasks(due);

  CREATE TABLE IF NOT EXISTS task_tags (
    task_id TEXT NOT NULL,
    tag TEXT NOT NULL,
    PRIMARY KEY (task_id, tag)
  );

  CREATE TABLE IF NOT EXISTS links (
    src_path TEXT NOT NULL,
    dst_slug TEXT NOT NULL,
    PRIMARY KEY (src_path, dst_slug)
  );
`);

const insertNote = db.prepare(`
  INSERT INTO notes (path, type, title, date, tags_json, frontmatter_json, body, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(path) DO UPDATE SET
    type=excluded.type, title=excluded.title, date=excluded.date,
    tags_json=excluded.tags_json, frontmatter_json=excluded.frontmatter_json,
    body=excluded.body, updated_at=excluded.updated_at
`);
const insertTask = db.prepare(`
  INSERT INTO tasks (id, path, title, status, priority, area, assignee,
                     created, due, blocked_by_json, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET
    path=excluded.path, title=excluded.title, status=excluded.status,
    priority=excluded.priority, area=excluded.area, assignee=excluded.assignee,
    created=excluded.created, due=excluded.due,
    blocked_by_json=excluded.blocked_by_json, updated_at=excluded.updated_at
`);
const delTaskTags = db.prepare('DELETE FROM task_tags WHERE task_id = ?');
const insTaskTag = db.prepare('INSERT OR IGNORE INTO task_tags (task_id, tag) VALUES (?, ?)');
const delLinks = db.prepare('DELETE FROM links WHERE src_path = ?');
const insLink = db.prepare('INSERT OR IGNORE INTO links (src_path, dst_slug) VALUES (?, ?)');

const seenNotePaths = new Set();
const seenTaskIds = new Set();

const tx = db.transaction(() => {
  for (const { path: filePath, mtimeMs } of walk(MEMORY)) {
    if (SINCE_MS !== null && mtimeMs < SINCE_MS) continue;
    const rel = path.relative(MEMORY, filePath);
    const src = fs.readFileSync(filePath, 'utf8');
    const { meta, body } = parseFrontmatter(src);
    const type = meta.type || typeFromPath(filePath);

    if (ONLY === 'tasks' && type !== 'task') continue;
    if (ONLY === 'notes' && type === 'task') continue;

    const title = meta.title ||
      (body.match(/^#\s+(.+)$/m) || [])[1] ||
      path.basename(filePath, '.md');
    const tags = Array.isArray(meta.tags) ? meta.tags : [];

    if (type !== 'task') {
      seenNotePaths.add(rel);
      insertNote.run(
        rel, type, title, meta.date || null,
        JSON.stringify(tags), JSON.stringify(meta),
        body.slice(0, 16000), Math.floor(mtimeMs)
      );
    } else {
      if (!meta.id) { console.warn(`! task without id: ${rel}`); continue; }
      seenTaskIds.add(meta.id);
      insertTask.run(
        meta.id, rel, title,
        meta.status || 'todo',
        meta.priority || 'P2',
        meta.area || null,
        meta.assignee || null,
        meta.created || null,
        meta.due || null,
        JSON.stringify(meta.blocked_by || []),
        Math.floor(mtimeMs)
      );
      delTaskTags.run(meta.id);
      for (const t of tags) insTaskTag.run(meta.id, t);
    }
    delLinks.run(rel);
    for (const s of extractWikilinks(body)) insLink.run(rel, s);
  }
  if (!ONLY && !SINCE_MS) {
    for (const r of db.prepare('SELECT path FROM notes').all()) {
      if (!seenNotePaths.has(r.path))
        db.prepare('DELETE FROM notes WHERE path = ?').run(r.path);
    }
    for (const r of db.prepare('SELECT id FROM tasks').all()) {
      if (!seenTaskIds.has(r.id))
        db.prepare('DELETE FROM tasks WHERE id = ?').run(r.id);
    }
  }
});
tx();
db.close();

if (!SINCE_MS) {
  const d = open(DB_PATH);
  const n = d.prepare('SELECT count(*) c FROM notes').get().c;
  const t = d.prepare('SELECT count(*) c FROM tasks').get().c;
  d.close();
  console.log(`✓ reindexed: ${n} notes, ${t} tasks`);
}
