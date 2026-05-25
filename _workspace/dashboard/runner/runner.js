#!/usr/bin/env node
/**
 * comind-dashboard runner
 *
 * Watches `the vault/_workspace/system/queue/<uuid>.json`, processes one intent at a time,
 * shells `claude -p "<prompt>"`, writes `_workspace/system/runs/<uuid>.json` + `<uuid>.log`.
 *
 * Designed to be process-supervised by Windows Task Scheduler at user login.
 * Crash-safe: restarts on uncaughtException. No external deps — Node 20+.
 */

import { spawn } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
  unlinkSync,
  appendFileSync,
} from "node:fs";
import { join, basename, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir, platform } from "node:os";
import { watch } from "node:fs/promises";

// --- Path resolution — cross-platform + env-var overridable.
// Resolution order:
//   1. COMIND_VAULT env var (set in shell or ~/.claude/.env)
//   2. ~/.claude/.env file's COMIND_VAULT entry
//   3. fallback: the project root this script lives in (dir containing _workspace/),
//      found by walking up from the script — the vault IS the project, no separate vault.
function loadEnvFile() {
  const envPath = join(homedir(), ".claude", ".env");
  if (!existsSync(envPath)) return {};
  const out = {};
  try {
    for (const raw of readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith("#") || !line.includes("=")) continue;
      const idx = line.indexOf("=");
      const k = line.slice(0, idx).trim();
      const v = line.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
      out[k] = v;
    }
  } catch {
    /* ignore */
  }
  return out;
}

// Walk up from this script's dir to the vault root (dir containing _workspace/).
// Lets the dashboard run in-place inside the project with zero config.
function findProjectRoot() {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 8; i++) {
    if (existsSync(join(dir, "_workspace"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return process.cwd();
}

const _env = loadEnvFile();
const VAULT_ROOT =
  process.env.COMIND_VAULT ||
  _env.COMIND_VAULT ||
  findProjectRoot();
// Timezone for "today"/"tomorrow" date math + calendar windows.
// Resolution: COMIND_TZ env → ~/.claude/.env → fallback UTC.
// Use an IANA name (e.g. "America/Chicago", "Europe/Kyiv", "Asia/Tokyo").
const RUNNER_TZ = process.env.COMIND_TZ || _env.COMIND_TZ || "UTC";
// Runner state (pid + log). Vault-local by default so the dashboard is
// self-contained in-place; override with COMIND_RUNNER_DIR for the
// standalone ~/.claude/comind-dashboard-runner layout from the build guide.
const RUNNER_DIR =
  process.env.COMIND_RUNNER_DIR ||
  _env.COMIND_RUNNER_DIR ||
  join(VAULT_ROOT, "_workspace", "system", "runner");
const QUEUE_DIR = join(VAULT_ROOT, "_workspace", "system", "queue");
const RUNS_DIR = join(VAULT_ROOT, "_workspace", "system", "runs");
const STATUS_FILE = join(VAULT_ROOT, "_workspace", "system", "runner-status.json");
const RUNNER_LOG = join(RUNNER_DIR, "runner.log");
mkdirSync(RUNNER_DIR, { recursive: true });

// Platform-aware binary names + script paths.
const IS_WINDOWS = platform() === "win32";
const CLAUDE_BIN = IS_WINDOWS ? "claude.exe" : "claude";
const METRICS_PULL_SCRIPT = IS_WINDOWS
  ? join(homedir(), ".claude", "skills", "metrics-pull", "scripts", "run_all.ps1")
  : join(homedir(), ".claude", "skills", "metrics-pull", "scripts", "run_all.sh");

function writeHeartbeat() {
  try {
    writeFileSync(
      STATUS_FILE,
      JSON.stringify(
        {
          ts: new Date().toISOString(),
          pid: process.pid,
          version: "0.3.0",
          busy: active > 0,
          active,
          max_concurrent: MAX_CONCURRENT,
          pending: pending.length,
          in_flight: [...inFlight],
        },
        null,
        2
      ) + "\n"
    );
  } catch {
    /* ignore */
  }
}

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  try {
    appendFileSync(RUNNER_LOG, line, "utf8");
  } catch {
    /* ignore */
  }
  console.log(line.trimEnd());
}

function ensureDirs() {
  for (const d of [QUEUE_DIR, RUNS_DIR]) {
    if (!existsSync(d)) mkdirSync(d, { recursive: true });
  }
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeJson(path, obj) {
  writeFileSync(path, JSON.stringify(obj, null, 2) + "\n", "utf8");
}

function slugify(s, max = 48) {
  return (s || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, max) || "untitled";
}

function todayDate() {
  // Local (RUNNER_TZ) YYYY-MM-DD. toISOString() returns UTC which can flip to
  // tomorrow's date late in the day in western timezones — wrong for a "today"
  // planner. Use the configured timezone instead.
  return new Intl.DateTimeFormat("en-CA", { timeZone: RUNNER_TZ }).format(new Date());
}

/**
 * Per-skill deliverable path inside the vault. Where the user-facing artifact
 * is expected to land. Plugin clicks this on Activity Feed row.
 */
function tomorrowDate() {
  // Local (RUNNER_TZ) YYYY-MM-DD for tomorrow.
  const todayLocal = todayDate();
  const [y, m, d] = todayLocal.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + 1));
  return new Intl.DateTimeFormat("en-CA", { timeZone: "UTC" }).format(next);
}

/**
 * Build a markdown summary by reading last-pull.json + metrics.csv after the
 * metrics-pull PowerShell scripts complete. Pure file-read — no AI judgment needed.
 */
function buildMetricsPullSummary() {
  const snapshotPath = join(VAULT_ROOT, "_workspace", "system", "metrics", "last-pull.json");
  const csvPath = join(VAULT_ROOT, "_workspace", "system", "metrics", "metrics.csv");

  let snap = {};
  try {
    snap = JSON.parse(readFileSync(snapshotPath, "utf8"));
  } catch {
    /* ignore */
  }

  const latest = new Map();
  try {
    const lines = readFileSync(csvPath, "utf8").trim().split(/\r?\n/);
    if (lines.length > 1) lines.shift(); // header
    for (const line of lines) {
      const parts = line.split(",");
      if (parts.length < 4) continue;
      const [, source, metric, value, st, err] = parts;
      const key = `${source}:${metric}`;
      latest.set(key, { value, status: st || "", error: err || "" });
    }
  } catch {
    /* ignore */
  }

  const sources = Object.keys(snap).sort();
  if (sources.length === 0) {
    return "_(no last-pull.json — pull may have failed silently)_\n";
  }

  let body = "| Source | Status | Last Pull (UTC) | Latest Values |\n|---|---|---|---|\n";
  for (const src of sources) {
    const s = snap[src] || {};
    const values = [];
    for (const [k, v] of latest) {
      if (k.startsWith(src + ":")) {
        values.push(`\`${k.split(":")[1]}\`=${v.value}`);
      }
    }
    const statusCell = s.error ? `${s.status} (${s.error})` : s.status || "—";
    body += `| ${src} | ${statusCell} | ${s.ts || "—"} | ${values.join(", ") || "—"} |\n`;
  }
  return body;
}

function deliverablePathFor(intent) {
  const id8 = (intent.id || "x").slice(0, 8);
  const date = todayDate();
  const args = intent.args || {};
  switch (intent.skill) {
    case "plan-today":
    case "refresh-schedule":
      return `daily-notes/${date}.md`;
    case "plan-tomorrow":
      return `daily-notes/${tomorrowDate()}.md`;
    case "morning-report":
      return `inbox/reports/morning/${date}-morning-report-${id8}.md`;
    case "inbox-brief":
      return `inbox/reports/inbox-briefs/${date}-${id8}.md`;
    case "deep-research":
      return `inbox/research/${date}-${slugify(args.topic)}.md`;
    case "weekly-review":
      return `inbox/reports/weekly/${date}-weekly-review.md`;
    case "vault-cleanup":
      return `inbox/reports/vault-cleanup/${date}-cleanup-${id8}.md`;
    case "metrics-pull":
      return `inbox/reports/metrics/${date}-pull-${id8}.md`;
    // Add your own skills' deliverable paths here (see /build-dashboard Phase 7).
    default:
      return null;
  }
}

/**
 * Map intent.skill → prompt string passed to `claude -p`.
 * Intent shape: { id, ts, skill, args, from }
 *
 * Each prompt is responsible for instructing the model to persist its
 * deliverable to the path returned by `deliverablePathFor(intent)` so the
 * Activity Feed can deep-link to it.
 */
// Standard headless preamble. Blocks AskUserQuestion which
// is what stalls skills like /deep-research in non-interactive -p mode.
//
// Leads with "Execute" (not "Act") so caveman-mode SessionStart hooks in the
// spawned session don't misread the first word as caveman-compressed input.
const AUTONOMOUS_PREFIX =
  "Execute the requested skill autonomously in headless mode. Do not ask the user for confirmation. Do not call AskUserQuestion. Continue until the deliverable is written.";

function buildPrompt(intent, deliverable) {
  const skill = intent.skill;
  const args = intent.args || {};

  switch (skill) {
    case "plan-today":
      return `${AUTONOMOUS_PREFIX}\n\nTask: plan today's daily note at exactly ${deliverable}.\n\nSteps:\n1. Read the last 3 daily notes under daily-notes/ for incomplete Top 3 + Daily Drivers + EOD reflections (carryover candidates).\n2. If the Google Calendar MCP connector is configured, pull today's calendar: call mcp__claude_ai_Google_Calendar__list_events with startTime=<today>T00:00:00, endTime=<today+1>T00:00:00, timeZone=${RUNNER_TZ}, orderBy=startTime, pageSize=100. If not configured, skip the Schedule step.\n3. Glob projects/*.md for files modified in the last 14 days with status: active|in-progress|blocked|draft frontmatter or due: dates on/before today.\n4. Build suggested Top 3 from the scoring rubric in the /plan-today SKILL.md (carryover +50, due-today +40, overdue +30, calendar-prep +25, recurring-theme +20, drift +15). Pick top 3.\n5. Write the daily note using the frozen v1 schema at _workspace/system/schemas/daily-note.md — exact section order. If the note already exists, MERGE only into empty Top 3 slots and replace ## Schedule content; do not overwrite user-set text.\n\nEnd your reply with: SAVED ${deliverable}`;
    case "refresh-schedule":
      return `${AUTONOMOUS_PREFIX}\n\nTask: refresh the ## Schedule section of today's daily note at ${deliverable}.\n\nSteps:\n1. Pull today's calendar via mcp__claude_ai_Google_Calendar__list_events with startTime=<today>T00:00:00, endTime=<today+1>T00:00:00, timeZone=${RUNNER_TZ}, orderBy=startTime, pageSize=100.\n2. Edit ${deliverable} — replace the contents of the \`## Schedule\` section ONLY. Format each event as \`- HH:MM — Title\` (24h local time, sorted by start time). Prefix all-day events with \`(all-day)\` instead of a time.\n3. Leave every other section untouched.\n\nEnd with a one-line summary: how many events were written.`;
    case "morning-report":
      return `${AUTONOMOUS_PREFIX}\n\nTask: run /morning-report (a daily trend/news briefing for the user's domain). Save the FULL briefing as a single Obsidian markdown note at exactly ${deliverable}. Structure: top-level "# Morning Report" + "**Date:** <today>", then "## Headlines" (3-5 bulleted top beats), "## Web — News & Articles" (bulleted with linked sources), "## Opportunities" (3 numbered ideas, each a bolded headline + paragraph), "## Sources". Adapt the section set to the user's domain as defined in the /morning-report SKILL.md. End your reply with: SAVED ${deliverable}`;
    case "inbox-brief":
      return `${AUTONOMOUS_PREFIX}\n\nTask: triage the email inbox and save the brief at exactly ${deliverable}.\n\nSteps:\n1. Pull the last 24h of inbox via mcp__claude_ai_Gmail__search_threads with query "in:inbox newer_than:1d" and pageSize 50.\n2. Triage per the /inbox-brief SKILL.md classification rules.\n3. Save the triage output at ${deliverable}. YAML frontmatter \`date\`, \`skill: inbox-brief\`, \`tags: [inbox, triage]\`. Body groups messages by category.\n4. Do NOT autonomously send any drafts — this is a headless run.\n\nEnd your reply with: SAVED ${deliverable}`;
    case "deep-research": {
      const topic = (args.topic || "").trim();
      if (!topic) return null;
      return `${AUTONOMOUS_PREFIX} Run /deep-research on: ${topic}\n\nSave the full research brief as a single markdown note at exactly this vault path: ${deliverable}. Use YAML frontmatter with \`date\`, \`topic: ${JSON.stringify(topic)}\`, \`skill: deep-research\`, \`tags: [research]\`. Include sources cited inline. End your reply with: SAVED ${deliverable}`;
    }
    case "plan-tomorrow":
      return `${AUTONOMOUS_PREFIX}\n\nTask: draft tomorrow's daily note at exactly ${deliverable}.\n\nSteps:\n1. Read today's daily note for unfinished Top 3 + Daily Drivers (carryover).\n2. If the Google Calendar MCP connector is configured, pull tomorrow's calendar: mcp__claude_ai_Google_Calendar__list_events with startTime=<tomorrow>T00:00:00, endTime=<tomorrow+1>T00:00:00, timeZone=${RUNNER_TZ}, orderBy=startTime, pageSize=100.\n3. Glob projects/*.md for due-tomorrow or overdue items.\n4. Suggest 3 Top 3 priorities, seed Daily Drivers from defaults + open commitments.\n5. Write to disk using the frozen v1 daily-note schema at _workspace/system/schemas/daily-note.md.\n\nEnd your reply with: SAVED ${deliverable}`;
    case "weekly-review":
      return `${AUTONOMOUS_PREFIX} Run the /weekly-review skill.\n\nReview the last 7 days from the daily notes. Read all daily notes in the window, aggregate frontmatter (effort, focus_blocks, top3_done), and detect recurring themes from the EOD reflections. Write a consolidated coaching review at exactly this vault path: ${deliverable}, following the /weekly-review SKILL.md template. End your reply with: SAVED ${deliverable}`;
    case "vault-cleanup":
      return `${AUTONOMOUS_PREFIX} Run the /vault-cleanup skill.\n\nScan the vault for stale files (older than 7 days, outside /wiki/ and /_archive-vault/). Show a preview, then archive into the appropriate /archive/ subfolders. Wiki-links must continue to resolve from archive. Write a one-page cleanup report at exactly this vault path: ${deliverable} — YAML frontmatter \`date\`, \`skill: vault-cleanup\`, \`tags: [cleanup, ops]\`. Body lists what was moved and any files skipped. End your reply with: SAVED ${deliverable}`;
    case "metrics-pull":
      return `${AUTONOMOUS_PREFIX} Run the /metrics-pull skill.\n\nForce-refresh all configured dashboard metric sources by invoking the metrics-pull scripts at ~/.claude/skills/metrics-pull/scripts/. After all sources finish, summarize at exactly this vault path: ${deliverable} — YAML frontmatter \`date\`, \`skill: metrics-pull\`, \`tags: [metrics, ops]\`. Body: a per-source status table (source, value, status ok/mock/error, error msg) + the diff from previous values where available. End your reply with: SAVED ${deliverable}`;
    // Add your own skills' prompts here (see /build-dashboard Phase 7). Each case
    // returns the prompt string passed to `claude -p`; instruct the model to
    // persist its deliverable to ${deliverable} so the Activity Feed can link it.
    default:
      return null;
  }
}

// Worker pool — parallel execution gated by category.
//
// MAX_CONCURRENT caps total in-flight claude -p / direct-exec subprocesses.
// SERIAL_SKILLS share a single in-flight slot among themselves (write the same
// shared file — daily-note, wiki index, etc). DEDUPE_SKILLS reject a new
// intent if the same skill is already in-flight (avoids duplicate work + API
// contention).
const MAX_CONCURRENT = 3;
const SERIAL_SKILLS = new Set([
  "plan-today",
  "plan-tomorrow",
  "refresh-schedule",
  "close-day",
  "harvest",
]);
const DEDUPE_SKILLS = new Set(["metrics-pull"]);

let active = 0;
const inFlight = new Set();      // intent.skill values currently running
const pending = [];               // queue filenames awaiting a slot

function enqueueNew() {
  if (!existsSync(QUEUE_DIR)) return;
  const files = readdirSync(QUEUE_DIR).filter((f) => f.endsWith(".json"));
  for (const f of files) {
    if (!pending.includes(f)) pending.push(f);
  }
}

function peekSkill(fileName) {
  // Lightweight peek — read intent.skill without bumping retry budget.
  // Used by scheduler gate. processOne() still does full retry-tolerant read.
  try {
    const intent = readJson(join(QUEUE_DIR, fileName));
    return intent.skill || null;
  } catch {
    return null;
  }
}

function pickNext() {
  // Scan pending for the first intent whose skill is runnable right now.
  // Returns index into pending[], or -1 if nothing runnable.
  const serialBusy = [...inFlight].some((s) => SERIAL_SKILLS.has(s));
  for (let i = 0; i < pending.length; i++) {
    const skill = peekSkill(pending[i]);
    if (!skill) {
      // Unreadable yet (race vs Obsidian write) — try later.
      continue;
    }
    if (DEDUPE_SKILLS.has(skill) && inFlight.has(skill)) continue;
    if (SERIAL_SKILLS.has(skill) && serialBusy) continue;
    return i;
  }
  return -1;
}

async function processOne(fileName) {
  const queuePath = join(QUEUE_DIR, fileName);
  if (!existsSync(queuePath)) return; // file vanished

  let intent;
  let lastErr = null;
  // Retry up to 5x with backoff — covers race where vault.adapter.write
  // has created the file but not yet flushed content.
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      intent = readJson(queuePath);
      lastErr = null;
      break;
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, 150 * (attempt + 1)));
    }
  }
  if (lastErr || !intent) {
    const runId = basename(fileName, ".json");
    const runJsonPath = join(RUNS_DIR, `${runId}.json`);
    const runMdPath = join(RUNS_DIR, `${runId}.md`);
    const ts = new Date().toISOString();
    writeJson(runJsonPath, {
      id: runId,
      skill: "(unknown)",
      args: {},
      ts_queued: ts,
      ts_started: ts,
      ts_completed: ts,
      status: "error",
      exit_code: -3,
      summary: `bad intent json after 5 retries: ${lastErr?.message || "empty"}`.slice(0, 200),
      md_path: `_workspace/system/runs/${runId}.md`,
      log_path: `_workspace/system/runs/${runId}.md`,
      deliverable_path: null,
    });
    writeFileSync(
      runMdPath,
      `---\nrun_id: ${runId}\nskill: unknown\nstatus: error\n---\n\n# rejected intent\n\nQueue file ${fileName} could not be parsed.\n\n\`${lastErr?.message || "empty file"}\`\n`,
      "utf8"
    );
    log(`${runId}: bad json — wrote error run record: ${lastErr?.message}`);
    try {
      unlinkSync(queuePath);
    } catch {
      /* ignore */
    }
    return;
  }

  const runId = intent.id || basename(fileName, ".json");
  const runJsonPath = join(RUNS_DIR, `${runId}.json`);
  const runMdPath = join(RUNS_DIR, `${runId}.md`);
  const deliverable = deliverablePathFor({ ...intent, id: runId });

  // Dedupe: a second metrics-pull while one is in-flight is a no-op (the first
  // already refreshes the shared CSV). Drop with a visible error record.
  if (DEDUPE_SKILLS.has(intent.skill) && inFlight.has(intent.skill)) {
    const ts = new Date().toISOString();
    writeJson(runJsonPath, {
      id: runId,
      skill: intent.skill,
      args: intent.args || {},
      ts_queued: intent.ts || ts,
      ts_started: ts,
      ts_completed: ts,
      status: "error",
      exit_code: -4,
      summary: `dedupe: ${intent.skill} already in-flight`,
      md_path: `_workspace/system/runs/${runId}.md`,
      log_path: `_workspace/system/runs/${runId}.md`,
      deliverable_path: null,
    });
    writeFileSync(
      runMdPath,
      `---\nrun_id: ${runId}\nskill: ${intent.skill}\nstatus: error\n---\n\n# duplicate intent dropped\n\nAnother ${intent.skill} run was already in-flight when this one arrived. Wait for the active run to finish, then re-trigger.\n`,
      "utf8"
    );
    log(`${runId}: dedupe drop (${intent.skill} already in-flight)`);
    try {
      unlinkSync(queuePath);
    } catch {
      /* ignore */
    }
    return;
  }

  const tsStarted = new Date().toISOString();
  const status = {
    id: runId,
    skill: intent.skill,
    args: intent.args || {},
    ts_queued: intent.ts || tsStarted,
    ts_started: tsStarted,
    ts_completed: null,
    status: "running",
    exit_code: null,
    summary: "",
    md_path: `_workspace/system/runs/${runId}.md`,
    log_path: `_workspace/system/runs/${runId}.md`,
    deliverable_path: deliverable,
  };
  writeJson(runJsonPath, status);

  const prompt = buildPrompt({ ...intent, id: runId }, deliverable);
  if (!prompt) {
    status.status = "error";
    status.exit_code = -1;
    status.summary = `unknown or invalid intent: ${intent.skill}`;
    status.ts_completed = new Date().toISOString();
    writeJson(runJsonPath, status);
    try {
      unlinkSync(queuePath);
    } catch {
      /* ignore */
    }
    log(`${runId}: rejected — ${status.summary}`);
    return;
  }

  log(`${runId}: running skill=${intent.skill}`);

  // Initialize markdown file with frontmatter so Obsidian renders it as a note.
  const argsJson = JSON.stringify(intent.args || {});
  writeFileSync(
    runMdPath,
    `---
run_id: ${runId}
skill: ${intent.skill}
status: running
ts_queued: ${intent.ts || tsStarted}
ts_started: ${tsStarted}
args: ${argsJson}
---

# ${intent.skill} run

> in progress — output streams below.

\`\`\`
`,
    "utf8"
  );

  // Direct-exec path — for mechanical skills that don't need AI judgment.
  // Bypasses claude entirely, runs the script directly. Faster + immune to
  // SessionStart-hook side effects (e.g. caveman mode shortcutting responses).
  const isDirectExec = intent.skill === "metrics-pull";

  const out = [];
  await new Promise((resolve) => {
    // Direct-exec spawn — platform-aware launcher for metrics-pull script.
    const directExecSpawn = () =>
      IS_WINDOWS
        ? spawn(
            "powershell.exe",
            [
              "-NoProfile",
              "-ExecutionPolicy", "Bypass",
              "-File",
              METRICS_PULL_SCRIPT,
            ],
            {
              shell: false,
              windowsHide: true,
              stdio: ["ignore", "pipe", "pipe"],
              cwd: VAULT_ROOT,
            }
          )
        : spawn("bash", [METRICS_PULL_SCRIPT], {
            shell: false,
            stdio: ["ignore", "pipe", "pipe"],
            cwd: VAULT_ROOT,
          });

    const proc = isDirectExec
      ? directExecSpawn()
      : spawn(CLAUDE_BIN, ["-p", prompt], {
          shell: false,
          windowsHide: true,
          stdio: ["ignore", "pipe", "pipe"],
          cwd: VAULT_ROOT,
        });

    proc.stdout.on("data", (chunk) => {
      out.push(chunk.toString());
      try {
        appendFileSync(runMdPath, chunk);
      } catch {
        /* ignore */
      }
    });
    proc.stderr.on("data", (chunk) => {
      out.push(chunk.toString());
      try {
        appendFileSync(runMdPath, chunk);
      } catch {
        /* ignore */
      }
    });

    const HARD_TIMEOUT_MS = 1000 * 60 * 10; // 10 min
    const timer = setTimeout(() => {
      try {
        proc.kill();
      } catch {
        /* ignore */
      }
      out.push("\n[runner: hard timeout 10m — killed]\n");
    }, HARD_TIMEOUT_MS);

    proc.on("close", (code) => {
      clearTimeout(timer);
      const tsCompleted = new Date().toISOString();
      const joined = out.join("").trim();
      const lines = joined.split(/\r?\n/);
      const firstLine =
        lines.find(
          (l) =>
            l.trim().length > 0 &&
            !l.startsWith("Warning:") &&
            !l.startsWith("warning:")
        ) ||
        lines.find((l) => l.trim().length > 0) ||
        "(no output)";
      status.status = code === 0 ? "ok" : "error";
      status.exit_code = code ?? -1;
      status.ts_completed = tsCompleted;
      status.summary = firstLine.slice(0, 200);
      writeJson(runJsonPath, status);
      try {
        appendFileSync(
          runMdPath,
          `\n\`\`\`\n\n---\n*exit code=${code} · status=${status.status} · completed ${tsCompleted}*\n`
        );
      } catch {
        /* ignore */
      }

      // For metrics-pull (direct exec), also write a clean summary at the
      // deliverable path so Activity Feed click opens a readable report.
      if (isDirectExec && intent.skill === "metrics-pull" && deliverable) {
        try {
          const summaryBody = buildMetricsPullSummary();
          // Cross-platform path join — deliverable is forward-slash relative.
          const deliverableAbs = join(VAULT_ROOT, ...deliverable.split("/"));
          const parentDir = join(deliverableAbs, "..");
          if (!existsSync(parentDir)) mkdirSync(parentDir, { recursive: true });
          const frontmatter = `---\ndate: ${tsCompleted.slice(0, 10)}\nskill: metrics-pull\nrun_id: ${runId}\ntags: [metrics, ops]\n---\n\n# Metrics Pull — ${tsCompleted.slice(0, 10)}\n\nForce-refresh run via dashboard. PowerShell exec, no AI in the loop.\n\n## Per-source status\n\n${summaryBody}\n\n## Notes\n\n- This run wrote new rows to \`_workspace/system/metrics/metrics.csv\` and updated \`_workspace/system/metrics/last-pull.json\`.\n- The 6h Windows Task Scheduler does the same thing on cadence — this is the manual override.\n`;
          writeFileSync(deliverableAbs, frontmatter, "utf8");
          // Also overwrite the firstLine summary to be more useful
          const okCount = Object.values(JSON.parse(readFileSync(join(VAULT_ROOT, "_workspace", "system", "metrics", "last-pull.json"), "utf8")))
            .filter((s) => s.status === "ok").length;
          const totalCount = Object.keys(JSON.parse(readFileSync(join(VAULT_ROOT, "_workspace", "system", "metrics", "last-pull.json"), "utf8"))).length;
          status.summary = `Pulled ${okCount}/${totalCount} sources ok`;
          writeJson(runJsonPath, status);
        } catch (e) {
          log(`${runId}: metrics-pull post-process failed: ${e.message}`);
        }
      }

      log(`${runId}: completed exit=${code} status=${status.status}`);
      resolve();
    });

    proc.on("error", (err) => {
      clearTimeout(timer);
      status.status = "error";
      status.exit_code = -2;
      status.ts_completed = new Date().toISOString();
      status.summary = `spawn error: ${err.message}`.slice(0, 200);
      writeJson(runJsonPath, status);
      try {
        appendFileSync(
          runMdPath,
          `\n\`\`\`\n\n[runner spawn error] ${err.message}\n`
        );
      } catch {
        /* ignore */
      }
      log(`${runId}: spawn error ${err.message}`);
      resolve();
    });
  });

  try {
    unlinkSync(queuePath);
  } catch {
    /* ignore */
  }
}

async function loop() {
  while (true) {
    enqueueNew();
    // Greedy fill — keep grabbing the next runnable intent until we hit the
    // concurrency cap or pending has nothing schedulable right now.
    let progress = true;
    while (progress && active < MAX_CONCURRENT && pending.length > 0) {
      const idx = pickNext();
      if (idx < 0) {
        progress = false;
        break;
      }
      const next = pending.splice(idx, 1)[0];
      const skill = peekSkill(next);
      active++;
      if (skill) inFlight.add(skill);
      // Fire-and-forget — slot is released in .finally().
      processOne(next)
        .catch((e) => log(`processOne crashed: ${e.message}`))
        .finally(() => {
          active--;
          if (skill) inFlight.delete(skill);
        });
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
}

async function watchLoop() {
  try {
    const watcher = watch(QUEUE_DIR, { persistent: true });
    for await (const ev of watcher) {
      if (ev.filename && ev.filename.endsWith(".json")) {
        enqueueNew();
      }
    }
  } catch (e) {
    log(`watcher error: ${e.message} — falling back to polling`);
  }
}

process.on("uncaughtException", (err) => {
  log(`uncaught: ${err.stack || err.message}`);
});

// --- Singleton lock — refuse to boot if another runner is alive.
// Prevents the "5 runners competing for same queue" bug where Startup VBS
// + manual restarts left zombies behind.
const PIDFILE = join(RUNNER_DIR, "runner.pid");

function pidAlive(pid) {
  try {
    process.kill(pid, 0); // signal 0 = liveness check, throws if dead
    return true;
  } catch {
    return false;
  }
}

if (existsSync(PIDFILE)) {
  try {
    const otherPid = parseInt(readFileSync(PIDFILE, "utf8").trim(), 10);
    if (Number.isInteger(otherPid) && otherPid !== process.pid && pidAlive(otherPid)) {
      log(`another runner alive at pid ${otherPid} — exiting this one (pid ${process.pid})`);
      process.exit(0);
    }
  } catch {
    /* stale pidfile — overwrite */
  }
}
writeFileSync(PIDFILE, String(process.pid), "utf8");
process.on("exit", () => {
  try {
    const cur = parseInt(readFileSync(PIDFILE, "utf8").trim(), 10);
    if (cur === process.pid) unlinkSync(PIDFILE);
  } catch {
    /* ignore */
  }
});

ensureDirs();
log(`runner booted (pid ${process.pid})`);
writeHeartbeat();
setInterval(writeHeartbeat, 15_000);
watchLoop();
loop();
