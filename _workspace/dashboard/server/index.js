#!/usr/bin/env node
/**
 * Dashboard server for one Claude workspace project.
 *
 * Self-locates the project root: env CB_PROJECT_ROOT, else
 * ../../../ relative to this file.
 *
 * Endpoints:
 *   GET  /                  → index.html
 *   GET  /api/overview      → status, agents, routines, recent runs
 *   GET  /api/tasks         → all tasks
 *   GET  /api/runs          → recent runs (100)
 *   GET  /api/run/:id       → one run with parsed JSONL events
 *   GET  /api/routines      → routines.json
 *   POST /api/run/:name     → fire a routine now (returns 202)
 *   POST /api/pause/:name   → set enabled=false (user re-runs cron-install)
 *   POST /api/resume/:name  → set enabled=true  (user re-runs cron-install)
 *   GET  /api/stream        → server-sent events
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const express = require('express');
const chokidar = require('chokidar');
const { open } = require('../../bin/_sqlite');

const ROOT = process.env.CB_PROJECT_ROOT || path.resolve(__dirname, '../../..');
const WS = path.join(ROOT, '_workspace');
const DB_PATH = path.join(WS, 'db', 'index.sqlite');
const ROUTINES_FILE = path.join(WS, 'routines', 'routines.json');
const RUNS_DIR = path.join(WS, 'runs');
const AGENTS_DIR = path.join(ROOT, '.claude', 'agents');
const PORT = Number(process.env.CB_PORT || 7878);

function loadRoutines() {
  if (!fs.existsSync(ROUTINES_FILE)) return { routines: [] };
  return JSON.parse(fs.readFileSync(ROUTINES_FILE, 'utf8'));
}
function saveRoutines(d) {
  fs.writeFileSync(ROUTINES_FILE, JSON.stringify(d, null, 2) + '\n');
}
function listAgents() {
  if (!fs.existsSync(AGENTS_DIR)) return [];
  return fs.readdirSync(AGENTS_DIR)
    .filter(f => f.endsWith('.md'))
    .map(f => {
      const src = fs.readFileSync(path.join(AGENTS_DIR, f), 'utf8');
      const m = src.match(/^---\n([\s\S]*?)\n---/);
      const meta = {};
      if (m) for (const line of m[1].split('\n')) {
        const c = line.indexOf(':');
        if (c < 0) continue;
        meta[line.slice(0, c).trim()] = line.slice(c + 1).trim().replace(/^"|"$/g, '');
      }
      return {
        name: meta.name || path.basename(f, '.md'),
        description: meta.description || '',
        model: meta.model || 'sonnet',
        file: f,
      };
    });
}
function parseLatestStatus() {
  if (!fs.existsSync(DB_PATH)) return null;
  const db = open(DB_PATH);
  let row;
  try {
    row = db.prepare(
      `SELECT result_json, started_at, total_cost_usd, is_error
       FROM runs WHERE routine LIKE '%status%'
       ORDER BY id DESC LIMIT 1`
    ).get();
  } catch { row = null; }
  db.close();
  if (!row || !row.result_json) return null;
  try {
    return {
      ...JSON.parse(row.result_json),
      _at: row.started_at,
      _cost: row.total_cost_usd,
      _is_error: !!row.is_error,
    };
  } catch { return null; }
}

// SSE pub/sub
const subscribers = new Set();
function broadcast(event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of subscribers) {
    try { res.write(payload); } catch { subscribers.delete(res); }
  }
}

// runs/ watcher
fs.mkdirSync(RUNS_DIR, { recursive: true });
const tails = new Map();
chokidar.watch(RUNS_DIR, { ignoreInitial: true, persistent: true })
  .on('add', p => {
    if (!p.endsWith('.jsonl')) return;
    tails.set(p, { lastSize: 0 });
    broadcast('run-started', {
      file: path.basename(p),
      routine: path.basename(p).replace(/-\d{8}T.*$/, ''),
    });
  })
  .on('change', p => {
    if (!p.endsWith('.jsonl')) return;
    const s = tails.get(p); if (!s) return;
    const st = fs.statSync(p);
    if (st.size <= s.lastSize) return;
    const fd = fs.openSync(p, 'r');
    const buf = Buffer.alloc(st.size - s.lastSize);
    fs.readSync(fd, buf, 0, buf.length, s.lastSize);
    fs.closeSync(fd);
    s.lastSize = st.size;
    for (const line of buf.toString('utf8').split('\n').filter(Boolean)) {
      try {
        broadcast('run-event', { file: path.basename(p), event: JSON.parse(line) });
      } catch {}
    }
  });

chokidar.watch(path.join(WS, 'memory'), {
  ignoreInitial: true, persistent: true, ignored: /(^|\/)\._/,
}).on('all', () => broadcast('memory-changed', { at: Date.now() }));

// HTTP
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/api/overview', (req, res) => {
  let recent = [], counts = [];
  if (fs.existsSync(DB_PATH)) {
    const db = open(DB_PATH);
    try {
      recent = db.prepare(
        `SELECT id, routine, started_at, duration_ms, total_cost_usd,
                is_error, result_text
         FROM runs ORDER BY id DESC LIMIT 20`
      ).all();
    } catch {}
    try {
      counts = db.prepare(
        `SELECT status, count(*) c FROM tasks GROUP BY status`
      ).all();
    } catch {}
    db.close();
  }
  res.json({
    project: path.basename(ROOT),
    project_root: ROOT,
    status: parseLatestStatus(),
    tasks_by_status: counts,
    routines: loadRoutines().routines,
    agents: listAgents(),
    recent_runs: recent,
  });
});

app.get('/api/tasks', (req, res) => {
  if (!fs.existsSync(DB_PATH)) return res.json([]);
  const db = open(DB_PATH);
  let rows = [];
  try {
    rows = db.prepare(
      `SELECT id, title, status, priority, area, assignee, due, created
       FROM tasks ORDER BY
         CASE status
           WHEN 'overdue' THEN 0
           WHEN 'blocked' THEN 1
           WHEN 'in_progress' THEN 2
           WHEN 'stale' THEN 3
           WHEN 'todo' THEN 4
           WHEN 'done' THEN 5
           ELSE 6 END,
         priority, due`
    ).all();
  } catch {}
  db.close();
  res.json(rows);
});

app.get('/api/runs', (req, res) => {
  if (!fs.existsSync(DB_PATH)) return res.json([]);
  const db = open(DB_PATH);
  let rows = [];
  try {
    rows = db.prepare(
      `SELECT id, routine, started_at, duration_ms, total_cost_usd,
              num_turns, is_error
       FROM runs ORDER BY id DESC LIMIT 100`
    ).all();
  } catch {}
  db.close();
  res.json(rows);
});

app.get('/api/run/:id', (req, res) => {
  if (!fs.existsSync(DB_PATH)) return res.status(404).json({ error: 'no db' });
  const db = open(DB_PATH);
  let row;
  try {
    row = db.prepare(`SELECT * FROM runs WHERE id = ?`).get(Number(req.params.id));
  } catch {}
  db.close();
  if (!row) return res.status(404).json({ error: 'not found' });
  const logPath = path.join(WS, row.log_path);
  const events = fs.existsSync(logPath)
    ? fs.readFileSync(logPath, 'utf8').split('\n').filter(Boolean)
        .map(l => { try { return JSON.parse(l); } catch { return null; } })
        .filter(Boolean)
    : [];
  res.json({ ...row, events });
});

app.get('/api/routines', (req, res) => res.json(loadRoutines()));

app.post('/api/run/:name', (req, res) => {
  const script = path.join(WS, 'bin', 'run-routine.sh');
  if (!fs.existsSync(script))
    return res.status(500).json({ error: 'run-routine.sh missing' });
  const child = spawn('bash', [script, req.params.name], {
    cwd: ROOT, detached: true, stdio: 'ignore',
  });
  child.unref();
  broadcast('routine-launched', { name: req.params.name });
  res.status(202).json({ launched: req.params.name });
});

function setEnabled(name, enabled) {
  const data = loadRoutines();
  const r = data.routines.find(x => x.name === name);
  if (!r) return null;
  r.enabled = enabled;
  saveRoutines(data);
  return r;
}
app.post('/api/pause/:name', (req, res) => {
  const r = setEnabled(req.params.name, false);
  if (!r) return res.status(404).json({ error: 'not found' });
  broadcast('routine-paused', { name: req.params.name });
  res.json({ ok: true, routine: r, hint: 're-run `just cron-install` to update crontab' });
});
app.post('/api/resume/:name', (req, res) => {
  const r = setEnabled(req.params.name, true);
  if (!r) return res.status(404).json({ error: 'not found' });
  broadcast('routine-resumed', { name: req.params.name });
  res.json({ ok: true, routine: r, hint: 're-run `just cron-install` to update crontab' });
});

app.get('/api/stream', (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders();
  res.write('event: hello\ndata: {}\n\n');
  subscribers.add(res);
  req.on('close', () => subscribers.delete(res));
});

app.listen(PORT, () => {
  console.log(`dashboard listening on http://localhost:${PORT}`);
  console.log(`project: ${ROOT}`);
});
