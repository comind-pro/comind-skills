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
		<div className="dash-panel">
			<div className="dash-panel-head">
				<span className="dash-panel-label">Daily Tasks</span>
				<span className="dash-panel-count dash-dim">
					{doneCount}/{items.length}
				</span>
			</div>
			<div className="dash-gauge" aria-hidden="true">
				<div
					className="dash-gauge-fill"
					style={{ width: `${pct}%` }}
				/>
			</div>
			<div className="dash-panel-body">
				{items.length === 0 ? (
					<p className="dash-mono dash-dim">&gt; no tasks</p>
				) : (
					<ul
						className={`dash-drivers ${items.length > 5 ? "dash-drivers-wide" : ""}`}
					>
						{items.map((d, i) => (
							<li
								key={`${i}-${d.text}`}
								className={`dash-driver-item dash-driver-clickable ${d.done ? "dash-done" : ""}`}
								onClick={() => void toggle(d.text)}
								role="button"
								tabIndex={0}
							>
								<span className="dash-checkbox" aria-hidden="true">
									{d.done ? "■" : "□"}
								</span>
								<span>{d.text}</span>
							</li>
						))}
					</ul>
				)}
				{adding ? (
					<form className="dash-quickadd" onSubmit={submitAdd}>
						<input
							type="text"
							className="dash-quickadd-input"
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
						<button type="submit" className="dash-quickadd-btn">
							+
						</button>
					</form>
				) : (
					<button
						type="button"
						className="dash-quickadd-trigger"
						onClick={() => setAdding(true)}
					>
						+ add task
					</button>
				)}
			</div>
		</div>
	);
}
