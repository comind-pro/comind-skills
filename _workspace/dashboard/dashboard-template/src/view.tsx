import { ItemView, WorkspaceLeaf } from "obsidian";
import { render, h } from "preact";
import { Dashboard } from "./components/Dashboard";
import type DashboardPlugin from "./main";

export const DASHBOARD_VIEW_TYPE = "comind-dashboard";

export class DashboardView extends ItemView {
	plugin: DashboardPlugin;
	private mountEl: HTMLElement | null = null;

	constructor(leaf: WorkspaceLeaf, plugin: DashboardPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType(): string {
		return DASHBOARD_VIEW_TYPE;
	}

	getDisplayText(): string {
		return "Dashboard";
	}

	getIcon(): string {
		return "activity";
	}

	async onOpen() {
		const container = this.containerEl.children[1] as HTMLElement;
		container.empty();
		container.addClass("dash-root");
		this.mountEl = container.createDiv({ cls: "dash-mount" });
		render(h(Dashboard, { plugin: this.plugin }), this.mountEl);
	}

	async onClose() {
		if (this.mountEl) {
			render(null, this.mountEl);
			this.mountEl = null;
		}
	}
}
