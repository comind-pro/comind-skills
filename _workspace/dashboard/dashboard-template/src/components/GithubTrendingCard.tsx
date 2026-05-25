import { h } from "preact";
import { useCallback, useEffect, useState } from "preact/hooks";
import type { App } from "obsidian";
import {
	readLatestGithubTrending,
	type ReportSnapshot,
	type TrendingRepo,
} from "../lib/reports";

interface Props {
	app: App;
	limit?: number;
}

const FOLDER = "inbox/research/github-trending";

export function GithubTrendingCard({ app, limit = 6 }: Props) {
	const [snap, setSnap] = useState<ReportSnapshot<TrendingRepo> | null>(null);

	const refresh = useCallback(async () => {
		const s = await readLatestGithubTrending(app);
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

	const openRepo = (url: string) => {
		window.open(url, "_blank");
	};

	const items = (snap?.items ?? []).slice(0, limit);

	return (
		<div className="chase-cc-panel">
			<div className="chase-cc-panel-head">
				<span className="chase-cc-panel-label">GitHub Trending</span>
				<span className="chase-cc-panel-actions">
					{snap ? (
						<button
							type="button"
							className="chase-cc-feed-headlink"
							onClick={openReport}
							title={`open ${snap.sourcePath}`}
						>
							full ↗
						</button>
					) : null}
					<button
						type="button"
						className="chase-cc-refresh chase-cc-refresh-inline"
						onClick={refresh}
						title="re-read latest trending file"
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
						&gt; no trending captures yet
					</p>
				) : (
					<ul className="chase-cc-feed-list">
						{items.map((r) => (
							<li
								key={`${r.owner}/${r.name}`}
								className="chase-cc-feed-item"
								onClick={() => openRepo(r.url)}
								title={r.description || `${r.owner}/${r.name}`}
							>
								<span className="chase-cc-feed-rank">{r.rank}</span>
								<span className="chase-cc-feed-main">
									<span className="chase-cc-feed-title">
										{r.owner ? `${r.owner}/${r.name}` : r.name}
										{r.stars ? (
											<span className="chase-cc-feed-stars chase-cc-dim">
												⭐ {r.stars}
											</span>
										) : null}
										{r.aiDev ? (
											<span className="chase-cc-feed-tag">AI</span>
										) : null}
									</span>
									{r.description ? (
										<span className="chase-cc-feed-sub chase-cc-dim">
											{r.description}
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
