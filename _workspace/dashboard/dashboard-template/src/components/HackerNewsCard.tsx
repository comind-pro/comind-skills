import { h } from "preact";
import { useCallback, useEffect, useState } from "preact/hooks";
import { fetchHNTop, type HNStory } from "../lib/hackernews";

interface Props {
	limit?: number;
	refreshMs?: number;
}

function relTime(unixSec: number): string {
	if (!unixSec) return "";
	const diff = Math.max(0, Date.now() / 1000 - unixSec);
	if (diff < 60) return `${Math.floor(diff)}s`;
	if (diff < 3600) return `${Math.floor(diff / 60)}m`;
	if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
	return `${Math.floor(diff / 86400)}d`;
}

export function HackerNewsCard({ limit = 6, refreshMs = 5 * 60 * 1000 }: Props) {
	const [stories, setStories] = useState<HNStory[]>([]);
	const [error, setError] = useState<string | null>(null);
	const [updatedAt, setUpdatedAt] = useState<number | null>(null);

	const refresh = useCallback(async () => {
		try {
			const items = await fetchHNTop(limit);
			setStories(items);
			setUpdatedAt(Date.now());
			setError(null);
		} catch (e) {
			setError(String(e));
		}
	}, [limit]);

	useEffect(() => {
		void refresh();
		const id = window.setInterval(() => void refresh(), refreshMs);
		return () => window.clearInterval(id);
	}, [refresh, refreshMs]);

	const openStory = (s: HNStory) => {
		window.open(s.url, "_blank");
	};

	const tsLabel = updatedAt
		? new Date(updatedAt).toLocaleTimeString([], {
				hour: "2-digit",
				minute: "2-digit",
			})
		: "—";

	return (
		<div className="chase-cc-panel">
			<div className="chase-cc-panel-head">
				<span className="chase-cc-panel-label">Hacker News</span>
				<span className="chase-cc-panel-actions">
					<button
						type="button"
						className="chase-cc-refresh chase-cc-refresh-inline"
						onClick={refresh}
						title="fetch HN top stories"
					>
						↻
					</button>
					<span className="chase-cc-panel-count chase-cc-dim">{tsLabel}</span>
				</span>
			</div>
			<div className="chase-cc-panel-body">
				{error ? (
					<p className="chase-cc-mono chase-cc-dim">&gt; {error}</p>
				) : stories.length === 0 ? (
					<p className="chase-cc-mono chase-cc-dim">&gt; loading…</p>
				) : (
					<ul className="chase-cc-feed-list">
						{stories.map((s, i) => (
							<li
								key={s.id}
								className="chase-cc-feed-item"
								onClick={() => openStory(s)}
								title={`${s.title} · ${s.score}↑ · ${s.descendants} cm · ${relTime(s.time)} ago`}
							>
								<span className="chase-cc-feed-rank">{i + 1}</span>
								<span className="chase-cc-feed-main">
									<span className="chase-cc-feed-title">
										{s.title}
										<span className="chase-cc-feed-stars chase-cc-dim">
											{s.score}↑
										</span>
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
