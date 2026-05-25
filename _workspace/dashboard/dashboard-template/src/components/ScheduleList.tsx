import { h } from "preact";
import { Notice } from "obsidian";
import type { App } from "obsidian";
import type { ScheduleEntry } from "../lib/vault";
import { writeIntent } from "../lib/queue";

interface Props {
	app: App;
	entries: ScheduleEntry[];
}

export function ScheduleList({ app, entries }: Props) {
	const refresh = async () => {
		try {
			const id = await writeIntent(app, "refresh-schedule", {});
			new Notice(`Pulling calendar… (${id.slice(0, 8)})`);
		} catch (e) {
			new Notice(`Refresh failed: ${e}`);
		}
	};

	return (
		<div className="chase-cc-panel">
			<div className="chase-cc-panel-head">
				<span className="chase-cc-panel-label">Schedule</span>
				<span className="chase-cc-panel-actions">
					<button
						type="button"
						className="chase-cc-refresh chase-cc-refresh-inline"
						onClick={refresh}
						title="pull calendar via Google Calendar MCP"
					>
						↻
					</button>
					<span className="chase-cc-panel-count chase-cc-dim">
						{entries.length} event{entries.length === 1 ? "" : "s"}
					</span>
				</span>
			</div>
			<div className="chase-cc-panel-body">
				{entries.length === 0 ? (
					<p className="chase-cc-mono chase-cc-dim">
						&gt; no events — click ↻ to pull
					</p>
				) : (
					<ul
						className={`chase-cc-schedule ${entries.length > 5 ? "chase-cc-schedule-wide" : ""}`}
					>
						{entries.map((e, i) => (
							<li key={i} className="chase-cc-schedule-item">
								<span className="chase-cc-schedule-time">{e.time}</span>
								<span className="chase-cc-schedule-title">{e.title}</span>
							</li>
						))}
					</ul>
				)}
			</div>
		</div>
	);
}
