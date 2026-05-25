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
		<div className="dash-panel">
			<div className="dash-panel-head">
				<span className="dash-panel-label">Schedule</span>
				<span className="dash-panel-actions">
					<button
						type="button"
						className="dash-refresh dash-refresh-inline"
						onClick={refresh}
						title="pull calendar via Google Calendar MCP"
					>
						↻
					</button>
					<span className="dash-panel-count dash-dim">
						{entries.length} event{entries.length === 1 ? "" : "s"}
					</span>
				</span>
			</div>
			<div className="dash-panel-body">
				{entries.length === 0 ? (
					<p className="dash-mono dash-dim">
						&gt; no events — click ↻ to pull
					</p>
				) : (
					<ul
						className={`dash-schedule ${entries.length > 5 ? "dash-schedule-wide" : ""}`}
					>
						{entries.map((e, i) => (
							<li key={i} className="dash-schedule-item">
								<span className="dash-schedule-time">{e.time}</span>
								<span className="dash-schedule-title">{e.title}</span>
							</li>
						))}
					</ul>
				)}
			</div>
		</div>
	);
}
