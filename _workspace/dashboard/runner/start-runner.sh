#!/usr/bin/env bash
# start-runner.sh — macOS / Linux launcher for the agentic-os runner.
#
# Run this once per login session, or wire it into your shell startup,
# launchd (macOS), or systemd user units (Linux) for automatic launch.
#
# Adjust RUNNER_DIR below if you installed outside ~/.claude/agentic-os-runner/.

set -euo pipefail

RUNNER_DIR="${HOME}/.claude/agentic-os-runner"
LOG_FILE="${RUNNER_DIR}/runner.log"

cd "${RUNNER_DIR}"

# nohup detaches from the shell — runner survives terminal close.
# stdout/stderr appended to runner.log; runner.js does its own logging too.
nohup node runner.js >> "${LOG_FILE}" 2>&1 &
disown

echo "agentic-os runner launched (pid $!) — tail ${LOG_FILE} for boot diagnostics."
