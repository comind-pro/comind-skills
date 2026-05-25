import { App, PluginSettingTab, Setting } from "obsidian";
import type DashboardPlugin from "./main";

export interface DashboardPluginSettings {
	vaultSystemPath: string;
	claudeTokenBudget5h: number;
	metricsPullCadenceHours: number;
}

export const DEFAULT_SETTINGS: DashboardPluginSettings = {
	vaultSystemPath: "system",
	claudeTokenBudget5h: 2_000_000, // Max $200 empirical default. Community trackers cite 220-440K; real ceiling observed much higher (1M+ output / 5h with no throttle).
	metricsPullCadenceHours: 6,
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
				"Vault-relative path to the system folder (metrics, queue, runs).",
			)
			.addText((text) =>
				text
					.setPlaceholder("system")
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
	}
}
