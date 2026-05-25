import { App, PluginSettingTab, Setting } from "obsidian";
import type DashboardPlugin from "./main";

export interface DashboardPluginSettings {
	vaultSystemPath: string;
	claudeTokenBudget5h: number;
	metricsPullCadenceHours: number;
	runnerScriptPath: string;
}

export const DEFAULT_SETTINGS: DashboardPluginSettings = {
	vaultSystemPath: "_workspace/system",
	claudeTokenBudget5h: 2_000_000, // Max $200 empirical default. Community trackers cite 220-440K; real ceiling observed much higher (1M+ output / 5h with no throttle).
	metricsPullCadenceHours: 6,
	// Path to the runner daemon. Vault-relative (in-place build) by default;
	// accepts an absolute or ~-path for the standalone build-guide install.
	runnerScriptPath: "_workspace/dashboard/runner/runner.js",
};

export class DashboardPluginSettingTab extends PluginSettingTab {
	plugin: DashboardPlugin;

	constructor(app: App, plugin: DashboardPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName("System folder path")
			.setDesc(
				"Vault-relative path to the runner working folder (metrics, queue, runs). " +
					"Default keeps it under `_workspace/` so it doesn't clutter the project root.",
			)
			.addText((text) =>
				text
					.setPlaceholder("_workspace/system")
					.setValue(this.plugin.settings.vaultSystemPath)
					.onChange(async (value) => {
						this.plugin.settings.vaultSystemPath =
							value.trim() || "system";
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Claude Code 5h output-token budget")
			.setDesc(
				"Output tokens you can generate per rolling 5-hour window. Anthropic publishes " +
					"no hard numbers. Community trackers (ccusage, claudefa.st) cite 220-440K for " +
					"Max20x; observed reality on this account is 1M+ output / 5h with no " +
					"throttle. Default: 2M (Max20x). Calibrate: if you actually hit rate limits, " +
					"set this to the OUTPUT count at the moment of throttle.",
			)
			.addText((text) =>
				text
					.setPlaceholder("15000000")
					.setValue(String(this.plugin.settings.claudeTokenBudget5h))
					.onChange(async (value) => {
						const n = Number(value.replace(/[, _]/g, ""));
						if (!Number.isFinite(n) || n <= 0) return;
						this.plugin.settings.claudeTokenBudget5h = n;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Metrics pull cadence (hours)")
			.setDesc(
				"Used to compute next-pull ETA in the footer. Must match your " +
					"Task Scheduler entry (default 6h).",
			)
			.addText((text) =>
				text
					.setPlaceholder("6")
					.setValue(String(this.plugin.settings.metricsPullCadenceHours))
					.onChange(async (value) => {
						const n = Number(value);
						if (!Number.isFinite(n) || n <= 0) return;
						this.plugin.settings.metricsPullCadenceHours = n;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Runner script path")
			.setDesc(
				"Path to runner.js, launched by the dashboard's start/restart button. " +
					"Vault-relative by default; absolute or ~-paths also work (e.g. the " +
					"standalone ~/.claude/comind-dashboard-runner/runner.js install).",
			)
			.addText((text) =>
				text
					.setPlaceholder("_workspace/dashboard/runner/runner.js")
					.setValue(this.plugin.settings.runnerScriptPath)
					.onChange(async (value) => {
						this.plugin.settings.runnerScriptPath =
							value.trim() || "_workspace/dashboard/runner/runner.js";
						await this.plugin.saveSettings();
					}),
			);
	}
}
