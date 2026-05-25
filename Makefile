# Makefile — comind-skills boilerplate
#
# Markdown-first project. Most targets just inspect the vault and validate
# template structure. The optional agentic-OS dashboard (an Obsidian plugin +
# queue runner) is internal infra: it builds in-place against THIS project as
# its vault — `make dashboard`. The vault root is the project root (where
# `.obsidian/` lives); override with `VAULT=/path make dashboard`.

# Dashboard wiring. VAULT defaults to the project root (this repo = the vault).
VAULT      ?= $(CURDIR)
PLUGIN_SRC := _workspace/dashboard/dashboard-template
PLUGIN_OUT := $(VAULT)/.obsidian/plugins/dashboard
RUNNER     := _workspace/dashboard/runner/runner.js

.PHONY: help stats tasks validate dashboard dashboard-install dashboard-build dashboard-dev dashboard-runner

help:
	@echo "Usage: make <target>"
	@echo ""
	@echo "Targets:"
	@echo "  help              List available targets (default)"
	@echo "  stats             Vault note counts by type"
	@echo "  tasks             List in-progress task notes"
	@echo "  validate          Sanity-check SKILL.md frontmatter on every skill"
	@echo ""
	@echo "Dashboard (Obsidian plugin + queue runner, vault = this project):"
	@echo "  dashboard         Install deps + build the plugin into .obsidian/plugins/"
	@echo "  dashboard-install npm install the plugin's build deps"
	@echo "  dashboard-build   Production build → \$$(VAULT)/.obsidian/plugins/dashboard/"
	@echo "  dashboard-dev     esbuild watch mode (hot reload while editing the plugin)"
	@echo "  dashboard-runner  Start the queue runner daemon against this vault"

stats:
	@printf "Vault:\n"
	@printf "  Decisions: %s\n" "$$(find _workspace/memory/decisions -name '*.md' 2>/dev/null | wc -l | tr -d ' ')"
	@printf "  Research:  %s\n" "$$(find _workspace/memory/research -name '*.md' 2>/dev/null | wc -l | tr -d ' ')"
	@printf "  Tasks:     %s\n" "$$(find _workspace/memory/tasks -name '*.md' 2>/dev/null | wc -l | tr -d ' ')"
	@printf "  Daily:     %s\n" "$$(find _workspace/memory/daily -name '*.md' 2>/dev/null | wc -l | tr -d ' ')"
	@printf "\nClaude Code:\n"
	@printf "  Skills:    %s\n" "$$(find .claude/skills -name 'SKILL.md' 2>/dev/null | wc -l | tr -d ' ')"
	@printf "  Agents:    %s (project)\n" "$$(find .claude/agents -maxdepth 1 -name '*.md' ! -name 'README.md' 2>/dev/null | wc -l | tr -d ' ')"
	@printf "             %s (_meta, maintainer-only)\n" "$$(find .claude/agents/_meta -name '*.md' 2>/dev/null | wc -l | tr -d ' ')"
	@printf "  Commands:  %s\n" "$$(find .claude/commands -name '*.md' 2>/dev/null | wc -l | tr -d ' ')"

tasks:
	@grep -l 'status: in_progress' _workspace/memory/tasks/*.md 2>/dev/null || echo "  (no in-progress tasks)"

validate:
	@found=0; broken=0; \
	for f in .claude/skills/*/SKILL.md; do \
		found=$$((found+1)); \
		head -10 "$$f" | grep -qE '^name:' || { echo "  ✗ $$f — missing name"; broken=$$((broken+1)); continue; }; \
		head -10 "$$f" | grep -qE '^description:' || { echo "  ✗ $$f — missing description"; broken=$$((broken+1)); }; \
	done; \
	echo "Checked $$found SKILL.md files; broken: $$broken"

# ── Dashboard ───────────────────────────────────────────────────────────────
# The plugin builds in-place: VAULT (default = project root) is the Obsidian
# vault, output lands in $(PLUGIN_OUT). The runner watches $(VAULT)/system/queue
# and creates the dirs it needs on first run.

dashboard-install:
	@cd $(PLUGIN_SRC) && npm install

dashboard-build:
	@cd $(PLUGIN_SRC) && DASHBOARD_PLUGIN_DIR="$(PLUGIN_OUT)" npm run build

dashboard-dev:
	@cd $(PLUGIN_SRC) && DASHBOARD_PLUGIN_DIR="$(PLUGIN_OUT)" npm run dev

dashboard-runner:
	@AGENTIC_OS_VAULT="$(VAULT)" node $(RUNNER)

dashboard: dashboard-install dashboard-build
	@echo ""
	@echo "Plugin built → $(PLUGIN_OUT)"
	@echo "Next:"
	@echo "  1. Open this project as an Obsidian vault, enable the 'Dashboard' plugin."
	@echo "  2. Start the queue runner:  make dashboard-runner"
