import { h } from "preact";
import { useState } from "preact/hooks";
import type { App } from "obsidian";
import { Notice } from "obsidian";
import type { DriverItem } from "../lib/vault";
import { toggleTaskByText, addTaskToSection } from "../lib/vault-writer";

interface Props {
	app: App;
	path: string;
	items: DriverItem[];
}

export function DailyDriversChecklist({ app, path, items }: Props) {
	const [adding, setAdding] = useState(false);
	const [newTask, setNewTask] = useState("");

	const doneCount = items.filter((i) => i.done).length;
	const pct = items.length === 0 ? 0 : (doneCount / items.length) * 100;

	const toggle = async (text: string) => {
		const ok = await toggleTaskByText(app, path, "Daily Drivers", text);
		if (!ok) new Notice(`Could not toggle: ${text}`);
	};

	const submitAdd = async (e: Event) => {
		e.preventDefault();
		const text = newTask.trim();
		if (!text) return;
		const ok = await addTaskToSection(app, path, "Daily Drivers", text);
		if (!ok) {
			new Notice("Add failed — daily note missing Daily Drivers section");
			return;
		}
		setNewTask("");
		// Keep input open so multiple adds are fast. Esc closes.
	};

	return (
		<div className="chase-cc-panel">
			<div className="chase-cc-panel-head">
				<span className="chase-cc-panel-label">Daily Tasks</span>
				<span className="chase-cc-panel-count chase-cc-dim">
					{doneCount}/{items.length}
				</span>
			</div>
			<div className="chase-cc-gauge" aria-hidden="true">
				<div
					className="chase-cc-gauge-fill"
					style={{ width: `${pct}%` }}
				/>
			</div>
			<div className="chase-cc-panel-body">
				{items.length === 0 ? (
					<p className="chase-cc-mono chase-cc-dim">&gt; no tasks</p>
				) : (
					<ul
						className={`chase-cc-drivers ${items.length > 5 ? "chase-cc-drivers-wide" : ""}`}
					>
						{items.map((d, i) => (
							<li
								key={`${i}-${d.text}`}
								className={`chase-cc-driver-item chase-cc-driver-clickable ${d.done ? "chase-cc-done" : ""}`}
								onClick={() => void toggle(d.text)}
								role="button"
								tabIndex={0}
							>
								<span className="chase-cc-checkbox" aria-hidden="true">
									{d.done ? "■" : "□"}
								</span>
								<span>{d.text}</span>
							</li>
						))}
					</ul>
				)}
				{adding ? (
					<form className="chase-cc-quickadd" onSubmit={submitAdd}>
						<input
							type="text"
							className="chase-cc-quickadd-input"
							autoFocus
							placeholder="new task…"
							value={newTask}
							onInput={(e) => setNewTask((e.target as HTMLInputElement).value)}
							onKeyDown={(e) => {
								if (e.key === "Escape") {
									setAdding(false);
									setNewTask("");
								}
							}}
						/>
						<button type="submit" className="chase-cc-quickadd-btn">
							+
						</button>
					</form>
				) : (
					<button
						type="button"
						className="chase-cc-quickadd-trigger"
						onClick={() => setAdding(true)}
					>
						+ add task
					</button>
				)}
			</div>
		</div>
	);
}
