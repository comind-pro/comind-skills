# Justfile — every command this project knows.
#
#   just                  list all recipes
#   just dashboard        start local dashboard on :7878
#   just reindex          rebuild SQLite index from the vault
#   just run <routine>    run one routine now (e.g. `just run hourly-status`)
#   just routines         list routines from routines.json
#   just cron-show        print the crontab block to install for this project
#   just cron-install     append the block to your crontab (idempotent)
#   just cron-uninstall   remove this project's block from your crontab
#   just task <title>     create a new task
#   just status           run the status-checker via Claude Code
#   just digest [days]    generate a digest (default 1 day)

set shell := ["bash", "-eu", "-o", "pipefail", "-c"]
set dotenv-load

# Project root is wherever this Justfile lives.
project_root := justfile_directory()
ws           := project_root / "_workspace"

default:
    @just --list

# ── Dashboard ────────────────────────────────────────────────────────────────

dashboard port="7878":
    @echo "→ dashboard on http://localhost:{{port}}"
    cd {{ws}}/dashboard && \
        [[ -d node_modules ]] || npm install --silent && \
        CB_PROJECT_ROOT={{project_root}} CB_PORT={{port}} node server/index.js

# ── Vault & index ────────────────────────────────────────────────────────────

reindex:
    node {{ws}}/bin/reindex.js

reindex-tasks:
    node {{ws}}/bin/reindex.js --only tasks

# ── Routines ─────────────────────────────────────────────────────────────────

routines:
    @node -e "const d=require('{{ws}}/routines/routines.json'); \
        for (const r of d.routines) { \
          const flag = r.enabled === false ? '⏸' : '✓'; \
          console.log('  ' + flag + ' ' + r.name.padEnd(20) + ' ' + r.cron.padEnd(14) + ' → ' + r.agent + ' (' + r.model + ')'); \
        }"

run routine:
    bash {{ws}}/bin/run-routine.sh "{{routine}}"

pause routine:
    @node -e "const fs=require('fs'); const f='{{ws}}/routines/routines.json'; \
        const d=JSON.parse(fs.readFileSync(f)); \
        const r=d.routines.find(x=>x.name==='{{routine}}'); \
        if(!r){console.error('no such routine'); process.exit(1)} \
        r.enabled=false; fs.writeFileSync(f, JSON.stringify(d, null, 2)+'\\n'); \
        console.log('⏸ paused {{routine}}');"
    @echo "→ run \`just cron-install\` to update crontab"

resume routine:
    @node -e "const fs=require('fs'); const f='{{ws}}/routines/routines.json'; \
        const d=JSON.parse(fs.readFileSync(f)); \
        const r=d.routines.find(x=>x.name==='{{routine}}'); \
        if(!r){console.error('no such routine'); process.exit(1)} \
        r.enabled=true; fs.writeFileSync(f, JSON.stringify(d, null, 2)+'\\n'); \
        console.log('✓ resumed {{routine}}');"
    @echo "→ run \`just cron-install\` to update crontab"

# ── Cron management ──────────────────────────────────────────────────────────
# Per-project block marked with the project's absolute path so multiple
# boilerplate projects coexist in one crontab without colliding.

cron-show:
    @bash {{ws}}/bin/cron-block.sh

cron-install:
    @bash {{ws}}/bin/cron-block.sh --install

cron-uninstall:
    @bash {{ws}}/bin/cron-block.sh --uninstall

# ── Convenience ──────────────────────────────────────────────────────────────

logs routine:
    @latest=$(ls -t {{ws}}/runs/{{routine}}-*.jsonl 2>/dev/null | head -1); \
    if [[ -z "$latest" ]]; then echo "no logs for {{routine}}"; exit 1; fi; \
    echo "# $latest"; \
    cat "$latest"

logs-tail routine:
    @latest=$(ls -t {{ws}}/runs/{{routine}}-*.jsonl 2>/dev/null | head -1); \
    if [[ -z "$latest" ]]; then echo "no logs for {{routine}}"; exit 1; fi; \
    tail -f "$latest"

# Convenience: dump the SQLite schema.
db-schema:
    sqlite3 {{ws}}/db/index.sqlite ".schema"

# Convenience: run an ad-hoc SQL.
db query:
    sqlite3 -header -column {{ws}}/db/index.sqlite "{{query}}"
