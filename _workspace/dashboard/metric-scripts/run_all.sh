#!/usr/bin/env bash
# run_all.sh — macOS / Linux wrapper for metric pulls.
#
# Wire this into cron for a 6-hour cadence:
#   crontab -e
#   0 */6 * * * /bin/bash $HOME/.claude/skills/metrics-pull/scripts/run_all.sh

set -uo pipefail

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
LOG_DIR="${SCRIPT_DIR}/../logs"
mkdir -p "${LOG_DIR}"
LOG_FILE="${LOG_DIR}/run-$(date -u +%Y%m%dT%H%M%SZ).log"

echo "[$(date -u +%FT%TZ)] run_all.sh start" >> "${LOG_FILE}"

# Fire every pull_*.py in parallel. 90s per-job timeout to bound total runtime.
pids=()
for script in "${SCRIPT_DIR}"/pull_*.py; do
    if [[ -f "${script}" ]]; then
        ( timeout 90 python "${script}" >> "${LOG_FILE}" 2>&1 ) &
        pids+=($!)
    fi
done

# Wait for all background jobs to finish.
for pid in "${pids[@]}"; do
    wait "${pid}" || true
done

echo "[$(date -u +%FT%TZ)] run_all.sh done (${#pids[@]} sources)" >> "${LOG_FILE}"
