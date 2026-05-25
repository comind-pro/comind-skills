import { h } from "preact";
import type { App } from "obsidian";
import type { RunRecord } from "../lib/queue";

interface Props {
	app: App;
	runs: RunRecord[];
}

function statusClass(status: string): string {
	switch (status) {
		case "ok":
			return "chase-cc-chip-ok";
		case "error":
			return "chase-cc-chip-error";
		case "running":
			return "chase-cc-chip-running";
		default:
			return "chase-cc-chip-error";
	}
}

function relativeTime(iso: string): string {
	if (!iso) return "—";
	const diff = Date.now() - Date.parse(iso);
	const sec = Math.floor(diff / 1000);
	if (sec < 60) return `${sec}s ago`;
	const min = Math.floor(sec / 60);
	if (min < 60) return `${min}m ago`;
	const hr = Math.floor(min / 60);
	if (hr < 24) return `${hr}h ago`;
	const day = Math.floor(hr / 24);
	return `${day}d ago`;
}

export function ActivityFeed({ app, runs }: Props) {
	const openDeliverable = async (run: RunRecord) => {
		const candidate = run.deliverable_path || run.md_path || run.log_path;
		if (!candidate) return;
		const exists = await app.vault.adapter.exists(candidate);
		const path = exists ? candidate : run.md_path || run.log_path;
		if (!path) return;
		void app.workspace.openLinkText(path, "", true);
	};

	const openLog = (run: RunRecord, e: MouseEvent) => {
		e.stopPropagation();
		void app.workspace.openLinkText(
			run.md_path || run.log_path || `system/runs/${run.id}.md`,
			"",
			true,
		);
	};

	const openJson = (run: RunRecord, e: MouseEvent) => {
		e.stopPropagation();
		void app.workspace.openLinkText(`system/runs/${run.id}.json`, "", true);
	};

	return (
		<div className="chase-cc-panel">
			<div className="chase-cc-panel-head">
				<span className="chase-cc-panel-label">Activity Feed</span>
				<span className="chase-cc-panel-count chase-cc-dim">
					{runs.length} run{runs.length === 1 ? "" : "s"}
				</span>
			</div>
			<div className="chase-cc-panel-body">
				{runs.length === 0 ? (
					<p className="chase-cc-mono chase-cc-dim">
						&gt; no runs yet — click an action button
					</p>
				) : (
					<ul className="chase-cc-feed">
						{runs.map((r) => (
							<li
								key={r.id}
								className={`chase-cc-feed-item chase-cc-feed-item-clickable chase-cc-feed-item--${r.status}`}
								onClick={() => openDeliverable(r)}
								title={`open ${r.deliverable_path || r.md_path || r.id}`}
							>
								<span
									className={`chase-cc-chip ${statusClass(r.status)}`}
									title={r.exit_code != null ? `exit ${r.exit_code}` : r.status}
								>
									{r.status === "running" ? "…" : r.status === "ok" ? "✓" : "✕"}{" "}
									{r.skill}
								</span>
								<span className="chase-cc-feed-summary">
									{r.summary || "(running)"}
								</span>
								<span className="chase-cc-feed-actions">
									<button
										type="button"
										className="chase-cc-feed-jsonbtn"
										onClick={(e) => openLog(r, e as MouseEvent)}
										title="open raw run log"
									>
										log
									</button>
									<button
										type="button"
										className="chase-cc-feed-jsonbtn"
										onClick={(e) => openJson(r, e as MouseEvent)}
										title="open status JSON"
									>
										{`{}`}
									</button>
									<span className="chase-cc-feed-time chase-cc-dim">
										{relativeTime(r.ts_completed || r.ts_started)}
									</span>
								</span>
							</li>
						))}
					</ul>
				)}
			</div>
		</div>
	);
}
