import { App, Modal, Setting } from "obsidian";

/**
 * Single-input modal that resolves to the user's text or null if cancelled.
 * Replaces window.prompt(). Enter submits, Esc cancels, blank input cancels.
 */
export class IntentArgModal extends Modal {
	private readonly heading: string;
	private readonly placeholder: string;
	private readonly initial: string;
	private readonly resolve: (value: string | null) => void;
	private inputEl?: HTMLInputElement;

	constructor(
		app: App,
		heading: string,
		placeholder: string,
		initial: string,
		resolve: (value: string | null) => void,
	) {
		super(app);
		this.heading = heading;
		this.placeholder = placeholder;
		this.initial = initial;
		this.resolve = resolve;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass("dash-modal");
		contentEl.createEl("h2", { text: this.heading });

		const setting = new Setting(contentEl).addText((text) => {
			text.setPlaceholder(this.placeholder).setValue(this.initial);
			text.inputEl.style.width = "100%";
			this.inputEl = text.inputEl;
			this.inputEl.addEventListener("keydown", (e) => {
				if (e.key === "Enter") {
					e.preventDefault();
					this.submit();
				} else if (e.key === "Escape") {
					e.preventDefault();
					this.cancel();
				}
			});
		});
		setting.settingEl.style.borderTop = "none";

		const buttons = contentEl.createDiv({ cls: "dash-modal-buttons" });
		const submitBtn = buttons.createEl("button", {
			text: "Queue",
			cls: "mod-cta",
		});
		submitBtn.onclick = () => this.submit();
		const cancelBtn = buttons.createEl("button", { text: "Cancel" });
		cancelBtn.onclick = () => this.cancel();

		// focus + select existing content for easy overwrite
		setTimeout(() => {
			this.inputEl?.focus();
			this.inputEl?.select();
		}, 30);
	}

	private resolved = false;

	/** Resolve exactly once, whatever the close path. */
	private settle(value: string | null): void {
		if (this.resolved) return;
		this.resolved = true;
		this.resolve(value);
	}

	private submit(): void {
		const v = (this.inputEl?.value || "").trim();
		this.settle(v.length > 0 ? v : null);
		this.close();
	}

	private cancel(): void {
		this.close(); // settle(null) happens in onClose
	}

	onClose(): void {
		// Runs on EVERY close path — Cancel, the X button, backdrop click,
		// and Obsidian's own Escape handling. Without settling here, any
		// close path other than our buttons left the askForArg promise
		// pending forever, so ActionBar's `busy` never reset and every
		// button stayed disabled ("dashboard hangs after cancel").
		this.settle(null);
		this.contentEl.empty();
	}
}

/** Convenience promise wrapper. */
export function askForArg(
	app: App,
	heading: string,
	placeholder: string,
	initial = "",
): Promise<string | null> {
	return new Promise((resolve) => {
		new IntentArgModal(app, heading, placeholder, initial, resolve).open();
	});
}
