#!/usr/bin/env bash
# cron-block.sh — manage this project's crontab block.
#
#   cron-block.sh             print the block (for copy-paste)
#   cron-block.sh --install   merge the block into your crontab (idempotent)
#   cron-block.sh --uninstall remove the block from your crontab

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
WS="$PROJECT_ROOT/_workspace"
ROUTINES="$WS/routines/routines.json"
RUNNER="$WS/bin/run-routine.sh"

# Marker uses the project's absolute path. Multiple boilerplate clones
# coexist in one crontab as long as they live in different folders.
HASH=$(printf '%s' "$PROJECT_ROOT" | shasum -a 256 2>/dev/null | cut -c1-12 \
    || printf '%s' "$PROJECT_ROOT" | sha256sum | cut -c1-12)
BEGIN="# >>> cbuilder:$HASH >>> $PROJECT_ROOT"
END="# <<< cbuilder:$HASH <<<"

build_block() {
    echo "$BEGIN"
    node -e "
        const d = require('$ROUTINES');
        for (const r of d.routines) {
            if (r.enabled === false) continue;
            console.log(\`\${r.cron} $RUNNER \"\${r.name}\" >> \"$WS/runs/cron.log\" 2>&1\`);
        }
    "
    echo "$END"
}

action="${1:-show}"

case "$action" in
    show|--show|"")
        build_block
        echo ""
        echo "# To install this block in your crontab, run:"
        echo "#   just cron-install"
        ;;

    --install)
        block=$(build_block)
        existing=$(crontab -l 2>/dev/null || true)
        # Strip any prior block with the same markers
        cleaned=$(echo "$existing" | awk -v b="$BEGIN" -v e="$END" '
            $0 == b { skip=1; next }
            skip && $0 == e { skip=0; next }
            !skip { print }
        ')
        # Concat with a separating blank line
        if [[ -n "$cleaned" ]]; then
            printf '%s\n\n%s\n' "$cleaned" "$block" | crontab -
        else
            printf '%s\n' "$block" | crontab -
        fi
        n=$(echo "$block" | grep -c '^[0-9*]' || true)
        echo "✓ installed $n routine(s) into crontab"
        ;;

    --uninstall)
        existing=$(crontab -l 2>/dev/null || true)
        if [[ -z "$existing" ]]; then echo "(crontab empty, nothing to do)"; exit 0; fi
        cleaned=$(echo "$existing" | awk -v b="$BEGIN" -v e="$END" '
            $0 == b { skip=1; next }
            skip && $0 == e { skip=0; next }
            !skip { print }
        ')
        if [[ -z "$cleaned" ]]; then
            crontab -r 2>/dev/null || true
        else
            printf '%s\n' "$cleaned" | crontab -
        fi
        echo "✓ removed cbuilder:$HASH block from crontab"
        ;;

    *)
        echo "usage: $0 [--install | --uninstall]" >&2
        exit 64
        ;;
esac
