#!/usr/bin/env node
/**
 * activity-log.js — PostToolUse hook.
 *
 * Appends one line per allowlisted tool call to today's daily note's
 * `## Activity Log` section.
 *
 * Guardrails:
 *   - Tool allowlist (skips Read/Grep/Glob/WebFetch and other noise).
 *   - Append lock via atomic .lock file with retry.
 *   - Self-exclusion: skip if target file IS today's daily note (no recursion).
 *   - Max line length: 200 chars.
 *   - Secret stripping: redact *_KEY/*_TOKEN/*_SECRET + common provider regex.
 *   - Failure-safe: errors go to activity-log-errors.log, exit 0 always.
 *
 * Hook input shape (stdin, JSON):
 *   {
 *     session_id: "...",
 *     tool_name: "Bash" | "Edit" | "Write" | "Skill" | "Agent" | ...,
 *     tool_input: { ... },
 *     tool_response: { ... }
 *   }
 */

import {
  existsSync,
  mkdirSync,
  openSync,
  closeSync,
  appendFileSync,
  readFileSync,
  writeFileSync,
  unlinkSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { homedir } from "node:os";

// --- Path resolution — cross-platform + env-var overridable.
// Resolution order:
//   1. COMIND_VAULT env var
//   2. ~/.claude/.env file's COMIND_VAULT entry
//   3. fallback ~/the-vault (template default)
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

const _env = loadEnvFile();
const VAULT_ROOT =
  process.env.COMIND_VAULT ||
  _env.COMIND_VAULT ||
  join(homedir(), "the-vault");
const DAILY_DIR = join(VAULT_ROOT, "daily-notes");
const ERROR_LOG = join(homedir(), ".claude", "hooks", "activity-log-errors.log");

const ALLOWLIST = new Set([
  "Bash",
  "Edit",
  "MultiEdit",
  "Write",
  "Skill",
  "Agent",
  "Task",
]);

const SECRET_PATTERNS = [
  /\b(?:[A-Z][A-Z0-9_]*_(?:KEY|TOKEN|SECRET|PASSWORD|API_KEY))\b\s*=\s*\S+/g,
  /\bsk-[A-Za-z0-9-_]{20,}\b/g,
  /\bsk_(?:live|test)_[A-Za-z0-9]{16,}\b/g,
  /\bAKIA[0-9A-Z]{16}\b/g,
  /\bghp_[A-Za-z0-9]{30,}\b/g,
  /\bghs_[A-Za-z0-9]{30,}\b/g,
  /\bgho_[A-Za-z0-9]{30,}\b/g,
  /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g,
  /\bAIza[0-9A-Za-z_-]{20,}\b/g,
];

const MAX_LEN = 200;

function logError(msg) {
  try {
    mkdirSync(dirname(ERROR_LOG), { recursive: true });
    appendFileSync(
      ERROR_LOG,
      `[${new Date().toISOString()}] ${msg}\n`,
      "utf8"
    );
  } catch {
    /* genuinely nothing we can do */
  }
}

function todayIso() {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

function todayPath() {
  return join(DAILY_DIR, `${todayIso()}.md`);
}

function clockHHMM() {
  const d = new Date();
  return (
    String(d.getHours()).padStart(2, "0") +
    ":" +
    String(d.getMinutes()).padStart(2, "0")
  );
}

function redactSecrets(s) {
  let out = s;
  for (const re of SECRET_PATTERNS) {
    out = out.replace(re, "<redacted>");
  }
  return out;
}

function truncate(s) {
  if (s.length <= MAX_LEN) return s;
  return s.slice(0, MAX_LEN - 1) + "…";
}

function summarize(toolName, input, response) {
  input = input || {};
  switch (toolName) {
    case "Bash": {
      const cmd = (input.command || "").replace(/\s+/g, " ").trim();
      return `Bash → ${cmd}`;
    }
    case "Edit":
    case "MultiEdit":
      return `${toolName} → ${input.file_path || "(unknown)"}`;
    case "Write":
      return `Write → ${input.file_path || "(unknown)"}`;
    case "Skill":
      return `Skill → ${input.skill || "(unknown)"}${
        input.args ? " " + JSON.stringify(input.args).slice(0, 60) : ""
      }`;
    case "Agent":
    case "Task": {
      const desc = input.description || input.subject || input.subagent_type || "";
      return `${toolName} → ${desc}`;
    }
    default:
      return `${toolName}`;
  }
}

function isSelfTarget(toolName, input) {
  input = input || {};
  const target = (input.file_path || "").replace(/\//g, "\\");
  if (!target) return false;
  return target === todayPath() || target.endsWith(`daily-notes\\${todayIso()}.md`);
}

/**
 * Atomic append lock: try to create <path>.lock exclusively. On EEXIST, retry
 * up to 30 times with async backoff. Stale-lock cleanup: if lockfile age > 15s,
 * forcibly remove and retry once.
 *
 * Hardened for parallel runner — multiple concurrent claude sessions can fire
 * PostToolUse hooks simultaneously. Async sleep (no CPU spin) + bigger retry
 * budget + longer stale threshold prevent dropped log lines under contention.
 */
async function acquireLock(path, attempts = 30) {
  const lockPath = path + ".lock";
  for (let i = 0; i < attempts; i++) {
    try {
      const fd = openSync(lockPath, "wx");
      return fd;
    } catch (e) {
      if (e.code !== "EEXIST") throw e;
      // Stale lock check
      try {
        const stats = JSON.parse(readFileSync(lockPath, "utf8") || "{}");
        if (stats.ts && Date.now() - stats.ts > 15000) {
          try {
            unlinkSync(lockPath);
          } catch {
            /* ignore */
          }
        }
      } catch {
        // unreadable lock → if it's been around a while, try to nuke it
      }
      // Async sleep — 50-150ms random backoff, no CPU spin.
      const ms = 50 + Math.floor(Math.random() * 100);
      await new Promise((r) => setTimeout(r, ms));
    }
  }
  return null;
}

function releaseLock(fd, path) {
  try {
    closeSync(fd);
  } catch {
    /* ignore */
  }
  try {
    unlinkSync(path + ".lock");
  } catch {
    /* ignore */
  }
}

async function appendToActivityLog(line) {
  const path = todayPath();
  if (!existsSync(path)) {
    // No daily note yet — silently skip. /today will create it.
    return;
  }

  const fd = await acquireLock(path);
  if (fd === null) {
    logError(`lock contention on ${path}; dropping line: ${line}`);
    return;
  }
  try {
    const lockPath = path + ".lock";
    writeFileSync(lockPath, JSON.stringify({ ts: Date.now() }));

    let raw = readFileSync(path, "utf8");
    const heading = "## Activity Log";
    const idx = raw.indexOf(heading);
    if (idx < 0) {
      logError(`missing ## Activity Log section in ${path}`);
      releaseLock(fd, path);
      return;
    }
    // Find the start of the next section ("\n## ") or end of file.
    const afterHeading = idx + heading.length;
    const nextSection = raw.indexOf("\n## ", afterHeading);
    const insertAt =
      nextSection < 0 ? raw.length : nextSection;

    // Trim trailing newlines in the section's current content, then append
    // our line + a single blank trailing newline before the next section.
    const before = raw.slice(0, insertAt).replace(/\s+$/, "");
    const after = raw.slice(insertAt);
    raw = before + "\n" + line + "\n" + after;
    if (!raw.endsWith("\n")) raw += "\n";

    writeFileSync(path, raw, "utf8");
  } catch (e) {
    logError(`append failed: ${e.message}`);
  } finally {
    releaseLock(fd, path);
  }
}

async function main() {
  // Read JSON from stdin.
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  const rawInput = Buffer.concat(chunks).toString("utf8").trim();
  if (!rawInput) return;

  let event;
  try {
    event = JSON.parse(rawInput);
  } catch (e) {
    logError(`bad JSON on stdin: ${e.message}`);
    return;
  }

  const toolName = event.tool_name;
  if (!toolName || !ALLOWLIST.has(toolName)) return;

  if (isSelfTarget(toolName, event.tool_input)) return;

  let summary = summarize(toolName, event.tool_input, event.tool_response);
  summary = redactSecrets(summary);
  summary = summary.replace(/\s+/g, " ").trim();
  const line = `- ${clockHHMM()} → ${truncate(summary)}`;

  await appendToActivityLog(line);
}

main().catch((e) => {
  logError(`main crash: ${e.stack || e.message}`);
  // Never propagate failure to Claude session.
  process.exit(0);
});
