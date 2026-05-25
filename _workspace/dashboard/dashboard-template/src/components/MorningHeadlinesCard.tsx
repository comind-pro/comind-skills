import { h } from "preact";
import { useCallback, useEffect, useState } from "preact/hooks";
import type { App } from "obsidian";
import {
	readLatestMorningHeadlines,
	type HeadlineItem,
	type ReportSnapshot,
} from "../lib/reports";

interface Props {
	app: App;
	limit?: number;
}

const FOLDER = "inbox/reports/morning";

export function MorningHeadlinesCard({ app, limit = 3 }: Props) {
	const [snap, setSnap] = useState<ReportSnapshot<HeadlineItem> | null>(null);

	const refresh = useCallback(async () => {
		const s = await readLatestMorningHeadlines(app);
		setSnap(s);
	}, [app]);

	useEffect(() => {
		void refresh();
		const handler = (file: { path: string }) => {
			if (file.path.startsWith(FOLDER)) void refresh();
		};
		app.vault.on("modify", handler);
		app.vault.on("create", handler);
		return () => {
			app.vault.off("modify", handler);
			app.vault.off("create", handler);
		};
	}, [app, refresh]);

	const openReport = () => {
		if (!snap) return;
		void app.workspace.openLinkText(snap.sourcePath, "", false);
	};

	const items = (snap?.items ?? []).slice(0, limit);

	return (
		<div className="chase-cc-panel chase-cc-feed">
			<div className="chase-cc-panel-head">
				<span className="chase-cc-panel-label">
					Morning Headlines
					{snap ? (
						<button
							type="button"
							className="chase-cc-feed-headlink"
							onClick={openReport}
							title={`open ${snap.sourcePath}`}
						>
							↗
						</button>
					) : null}
				</span>
				<span className="chase-cc-panel-actions">
					<button
						type="button"
						className="chase-cc-refresh chase-cc-refresh-inline"
						onClick={refresh}
						title="re-read latest morning report"
					>
						↻
					</button>
					<span className="chase-cc-panel-count chase-cc-dim">
						{snap?.dateLabel ?? "—"}
					</span>
				</span>
			</div>
			<div className="chase-cc-panel-body">
				{items.length === 0 ? (
					<p className="chase-cc-mono chase-cc-dim">
						&gt; no morning report yet — run /morning
					</p>
				) : (
					<ul className="chase-cc-feed-list">
						{items.map((h, i) => (
							<li key={i} className="chase-cc-feed-item">
								<span className="chase-cc-feed-rank">•</span>
								<span className="chase-cc-feed-main">
									<span className="chase-cc-feed-title">{h.bold}</span>
									{h.body ? (
										<span className="chase-cc-feed-sub chase-cc-dim">
											{h.body}
										</span>
									) : null}
								</span>
							</li>
						))}
					</ul>
				)}
			</div>
		</div>
	);
}
