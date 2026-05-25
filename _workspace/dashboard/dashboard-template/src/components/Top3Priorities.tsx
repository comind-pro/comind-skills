import { h } from "preact";
import { useState } from "preact/hooks";
import type { App } from "obsidian";
import { Notice } from "obsidian";
import type { Top3Item } from "../lib/vault";
import { toggleTop3ByIndex, setTop3TextByIndex } from "../lib/vault-writer";

interface Props {
	app: App;
	path: string;
	items: Top3Item[];
}

export function Top3Priorities({ app, path, items }: Props) {
	const padded: (Top3Item | null)[] = [...items];
	while (padded.length < 3) padded.push(null);

	const [editingIdx, setEditingIdx] = useState<number | null>(null);
	const [draft, setDraft] = useState<string>("");

	const startEdit = (idx: number, current: string) => {
		setEditingIdx(idx);
		setDraft(current || "");
	};

	const commit = async () => {
		if (editingIdx === null) return;
		const idx = editingIdx;
		const text = draft.trim();
		setEditingIdx(null);
		if (!text) return;
		const ok = await setTop3TextByIndex(app, path, idx, text);
		if (!ok) new Notice(`Could not write Top 3 slot ${idx + 1}`);
	};

	const cancel = () => {
		setEditingIdx(null);
		setDraft("");
	};

	const toggle = async (idx: number) => {
		const ok = await toggleTop3ByIndex(app, path, idx);
		if (!ok) new Notice(`Slot ${idx + 1} empty — click text to add`);
	};

	return (
		<div className="dash-panel">
			<div className="dash-panel-head">
				<span className="dash-panel-label">Top 3 Priorities</span>
			</div>
			<div className="dash-panel-body">
				<ol className="dash-top3">
					{padded.slice(0, 3).map((item, i) => {
						const isEditing = editingIdx === i;
						const text = item?.text || "";
						return (
							<li
								key={i}
								className={`dash-top3-item ${item?.done ? "dash-done" : ""}`}
							>
								<span
									className="dash-checkbox dash-driver-clickable"
									aria-hidden="true"
									onClick={(e) => {
										e.stopPropagation();
										if (text) void toggle(i);
									}}
									title={text ? "toggle done" : "set text first"}
								>
									{item?.done ? "■" : "□"}
								</span>
								{isEditing ? (
									<input
										type="text"
										className="dash-top3-input"
										autoFocus
										value={draft}
										onInput={(e) => setDraft((e.target as HTMLInputElement).value)}
										onBlur={commit}
										onKeyDown={(e) => {
											if (e.key === "Enter") {
												e.preventDefault();
												commit();
											} else if (e.key === "Escape") {
												cancel();
											}
										}}
									/>
								) : (
									<span
										className="dash-top3-text dash-top3-clickable"
										onClick={() => startEdit(i, text)}
										title="click to edit"
									>
										{text || (
											<span className="dash-dim">— click to set —</span>
										)}
									</span>
								)}
							</li>
						);
					})}
				</ol>
			</div>
		</div>
	);
}
