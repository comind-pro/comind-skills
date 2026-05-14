#!/usr/bin/env bash
# run-routine.sh <routine-name>
#
# Invoked by cron (or `just run <routine>`). Self-locates the project
# root via $0. Builds the right `claude -p` invocation, streams
# stream-json to a per-run logfile, then stores a summary in SQLite
# and refreshes the vault index.

set -euo pipefail

ROUTINE="${1:?usage: run-routine.sh <routine-name>}"
PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$PROJECT_ROOT"

WS="$PROJECT_ROOT/_workspace"
ROUTINES_JSON="$WS/routines/routines.json"
RUNS_DIR="$WS/runs"
TS="$(date -u +'%Y%m%dT%H%M%SZ')"
RUN_LOG="$RUNS_DIR/${ROUTINE}-${TS}.jsonl"

mkdir -p "$RUNS_DIR"

ROUTINE_JSON=$(node -e "
const data = require('$ROUTINES_JSON');
const r = data.routines.find(x => x.name === '$ROUTINE');
if (!r) { console.error('no such routine: $ROUTINE'); process.exit(2); }
if (r.enabled === false) { console.error('routine paused: $ROUTINE'); process.exit(3); }
process.stdout.write(JSON.stringify(r));
")

read_field() {
  echo "$ROUTINE_JSON" | node -e "
    const r = JSON.parse(require('fs').readFileSync(0, 'utf8'));
    process.stdout.write(String(r['$1'] ?? '$2'));
  "
}

AGENT="$(read_field agent '')"
MODEL="$(read_field model 'sonnet')"
MAX_TURNS="$(read_field max_turns '10')"
PROMPT="$(read_field prompt 'Run the routine.')"

SCHEMA_FILE=""
if echo "$ROUTINE_JSON" | grep -q '"json_schema"'; then
  SCHEMA_FILE="$(mktemp)"
  echo "$ROUTINE_JSON" | node -e "
    const r = JSON.parse(require('fs').readFileSync(0, 'utf8'));
    process.stdout.write(JSON.stringify(r.json_schema));
  " > "$SCHEMA_FILE"
fi

SYS_PROMPT="Delegate this work to the '${AGENT}' subagent defined in .claude/agents/${AGENT}.md. Do not do the work yourself."

echo "→ $(date -u +'%FT%TZ')  routine=$ROUTINE agent=$AGENT model=$MODEL" >> "$RUNS_DIR/cron.log"

CMD=(claude -p "$PROMPT"
     --output-format stream-json
     --verbose
     --model "$MODEL"
     --max-turns "$MAX_TURNS"
     --append-system-prompt "$SYS_PROMPT"
     --allowedTools "Read,Write,Edit,Glob,Grep,Bash,WebSearch,WebFetch,Task,Skill"
     --permission-mode acceptEdits)

if [[ -n "$SCHEMA_FILE" ]]; then
  CMD+=(--json-schema "@$SCHEMA_FILE")
fi

EXIT=0
"${CMD[@]}" > "$RUN_LOG" 2>&1 || EXIT=$?

[[ -n "$SCHEMA_FILE" ]] && rm -f "$SCHEMA_FILE"

node "$WS/bin/store-run-summary.js" "$RUN_LOG" "$ROUTINE" "$EXIT" || true
node "$WS/bin/reindex.js" --since "10 minutes ago" >/dev/null 2>&1 || true

exit "$EXIT"
