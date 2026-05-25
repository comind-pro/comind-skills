import { Plugin, WorkspaceLeaf } from "obsidian";
import { DashboardView, DASHBOARD_VIEW_TYPE } from "./view";
import { DEFAULT_SETTINGS, DashboardPluginSettings, DashboardPluginSettingTab } from "./settings";

export default class DashboardPlugin extends Plugin {
	settings!: DashboardPluginSettings;

	async onload() {
		await this.loadSettings();

		this.registerView(
			DASHBOARD_VIEW_TYPE,
			(leaf: WorkspaceLeaf) => new DashboardView(leaf, this),
		);

		this.addRibbonIcon("activity", "Open Dashboard", () => {
			this.activateView();
		});

		this.addCommand({
			id: "open-command-center",
			name: "Open Dashboard",
			callback: () => this.activateView(),
		});

		this.addSettingTab(new DashboardPluginSettingTab(this.app, this));
	}

	async onunload() {
		// Leaves are detached automatically when the plugin unloads;
		// nothing to flush.
	}

	async activateView() {
		const { workspace } = this.app;

		let leaf = workspace.getLeavesOfType(DASHBOARD_VIEW_TYPE)[0];
		if (!leaf) {
			leaf = workspace.getLeaf("tab");
			await leaf.setViewState({ type: DASHBOARD_VIEW_TYPE, active: true });
		}
		workspace.revealLeaf(leaf);
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			(await this.loadData()) as Partial<DashboardPluginSettings>,
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
