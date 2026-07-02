import { h } from "preact";
import { useState } from "preact/hooks";
import { Notice } from "obsidian";
import type DashboardPlugin from "../main";
import type { ButtonSpec } from "../lib/config";
import { writeIntent } from "../lib/queue";
import { askForArg } from "./IntentArgModal";

interface Props {
	plugin: DashboardPlugin;
	buttons: ButtonSpec[];
	onSubmitted?: () => void;
}

// CUSTOMIZE — buttons come from the `action-bar` widget in
// <vaultSystemPath>/dashboard.config.json (one entry per $SKILL you wired in
// Phase 7; `skill` MUST match a `case` in your runner.js buildPrompt switch).
// Edit the JSON, run `npm run validate:config` — no rebuild needed.
export function ActionBar({ plugin, buttons, onSubmitted }: Props) {
	const [busy, setBusy] = useState(false);

	const fire = async (spec: ButtonSpec) => {
		if (busy) return;
		setBusy(true);
		try {
			let args: Record<string, string> = {};
			if (spec.prompt === "topic" || spec.prompt === "url") {
				const value = await askForArg(
					plugin.app,
					spec.promptLabel || spec.label,
					spec.placeholder || "",
				);
				if (!value) {
					new Notice("Cancelled.");
					return;
				}
				args[spec.prompt] = value;
			}
			const id = await writeIntent(plugin.app, spec.skill, args);
			new Notice(`Queued ${spec.skill} (${id.slice(0, 8)})`);
			onSubmitted?.();
		} catch (e) {
			new Notice(`Failed to queue: ${e}`);
		} finally {
			setBusy(false);
		}
	};

	return (
		<div className="dash-actionbar">
			{buttons.map((b) => (
				<button
					key={b.skill}
					type="button"
					className="dash-action-btn"
					disabled={busy}
					onClick={() => void fire(b)}
				>
					{b.label}
				</button>
			))}
		</div>
	);
}
