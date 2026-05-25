import { h } from "preact";
import { useState } from "preact/hooks";
import { Notice } from "obsidian";
import type DashboardPlugin from "../main";
import { writeIntent } from "../lib/queue";
import { askForArg } from "./IntentArgModal";

interface Props {
	plugin: DashboardPlugin;
	onSubmitted?: () => void;
}

interface ButtonSpec {
	skill: string;
	label: string;
	prompt?: "topic" | "url";
	promptLabel?: string;
	placeholder?: string;
}

// CUSTOMIZE — one entry per $SKILL you wired in Phase 7.
// `skill` MUST match a `case` in your runner.js buildPrompt switch.
// Use `prompt: "topic" | "url"` for skills that need a string arg (opens IntentArgModal).
// Skills NOT in the runner switch will still queue but produce no output.
const BUTTONS: ButtonSpec[] = [
	{ skill: "plan-today", label: "Plan Today" },
	{ skill: "plan-tomorrow", label: "Plan Tomorrow" },
	{ skill: "morning-report", label: "Morning Brief" },
	{
		skill: "deep-research",
		label: "Deep Research…",
		prompt: "topic",
		promptLabel: "Deep research — topic",
		placeholder: "e.g. claude code agent rotations 2026",
	},
	{ skill: "weekly-review", label: "Weekly Review" },
	{ skill: "vault-cleanup", label: "Vault Cleanup" },
	{ skill: "metrics-pull", label: "Pull Metrics" },
];

export function ActionBar({ plugin, onSubmitted }: Props) {
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
			{BUTTONS.map((b) => (
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
