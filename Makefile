# Makefile — comind-skills boilerplate
#
# Markdown-only project. Targets are conveniences for inspecting the
# vault and validating template structure. No dashboards, no cron,
# no databases — if you want infrastructure, build a project on top
# of this template, don't bake it into the template itself.

.PHONY: help stats tasks validate

help:
	@echo "Usage: make <target>"
	@echo ""
	@echo "Targets:"
	@echo "  help      List available targets (default)"
	@echo "  stats     Vault note counts by type"
	@echo "  tasks     List in-progress task notes"
	@echo "  validate  Sanity-check SKILL.md frontmatter on every skill"

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
