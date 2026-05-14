#!/usr/bin/env node
/**
 * store-run-summary.js <run-log-path> <routine-name> <exit-code>
 *
 * Parses the stream-json log from a Claude Code headless run and stores
 * a one-row summary in _workspace/db/index.sqlite (table `runs`).
 */

const fs = require('fs');
const path = require('path');
const { open } = require('./_sqlite');

const [, , logPath, routine, exitCodeStr] = process.argv;
if (!logPath || !routine) {
  console.error('usage: store-run-summary.js <log> <routine> <exit-code>');
  process.exit(64);
}

const WS = path.resolve(__dirname, '..');
const DB_PATH = path.join(WS, 'db', 'index.sqlite');

const lines = fs.readFileSync(logPath, 'utf8').split('\n').filter(Boolean);
const events = [];
for (const line of lines) {
  try { events.push(JSON.parse(line)); } catch {}
}
const initEvt = events.find(e => e.type === 'system' && e.subtype === 'init');
const resultEvt = events.find(e => e.type === 'result');

const sessionId = initEvt?.session_id || resultEvt?.session_id || null;
const startedAt = initEvt?.timestamp || new Date().toISOString();
const finishedAt = resultEvt?.timestamp || new Date().toISOString();
const durationMs = resultEvt?.duration_ms ?? null;
const totalCost = resultEvt?.total_cost_usd ?? null;
const numTurns = resultEvt?.num_turns ?? null;
const isError = resultEvt?.is_error ?? Number(exitCodeStr) !== 0;
const resultText = resultEvt?.result ?? null;

let resultJson = null;
if (resultText) {
  const t = resultText.trim();
  if ((t.startsWith('{') && t.endsWith('}')) ||
      (t.startsWith('[') && t.endsWith(']'))) {
    try { resultJson = JSON.stringify(JSON.parse(t)); } catch {}
  }
}

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const db = open(DB_PATH);
db.exec(`
  CREATE TABLE IF NOT EXISTS runs (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    routine       TEXT NOT NULL,
    log_path      TEXT NOT NULL,
    session_id    TEXT,
    started_at    TEXT,
    finished_at   TEXT,
    duration_ms   INTEGER,
    total_cost_usd REAL,
    num_turns     INTEGER,
    exit_code     INTEGER,
    is_error      INTEGER,
    result_text   TEXT,
    result_json   TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_runs_routine_time
    ON runs(routine, started_at DESC);
`);

db.prepare(
  `INSERT INTO runs
    (routine, log_path, session_id, started_at, finished_at,
     duration_ms, total_cost_usd, num_turns, exit_code, is_error,
     result_text, result_json)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
).run(
  routine, path.relative(WS, logPath), sessionId,
  startedAt, finishedAt, durationMs, totalCost, numTurns,
  Number(exitCodeStr), isError ? 1 : 0, resultText, resultJson
);

db.close();
