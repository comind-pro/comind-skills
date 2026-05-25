import { h } from "preact";
import { useEffect, useState } from "preact/hooks";
import { Notice } from "obsidian";
import type { App } from "obsidian";
import { writeIntent } from "../lib/queue";
import { readLatestBrief, type MorningBrief } from "../lib/morningBrief";

interface Props {
	app: App;
}

export function MorningBriefCard({ app }: Props) {
	const [brief, setBrief] = useState<MorningBrief | null>(null);
	const [busy, setBusy] = useState(false);

	useEffect(() => {
		let cancelled = false;
		const refresh = async () => {
			const b = await readLatestBrief(app);
			if (!cancelled) setBrief(b);
		};
		void refresh();
		const handler = (file: { path: string }) => {
			if (file.path.startsWith("inbox/reports/morning/")) void refresh();
		};
		app.vault.on("modify", handler);
		app.vault.on("create", handler);
		return () => {
			cancelled = true;
			app.vault.off("modify", handler);
			app.vault.off("create", handler);
		};
	}, [app]);

	const runNew = async () => {
		if (busy) return;
		setBusy(true);
		try {
			const id = await writeIntent(app, "morning-report", {});
			new Notice(`Queued morning-report (${id.slice(0, 8)})`);
		} catch (e) {
			new Notice(`Failed to queue: ${e}`);
		} finally {
			setBusy(false);
		}
	};

	const openFull = () => {
		if (!brief) return;
		void app.workspace.openLinkText(brief.path, "", true);
	};

	if (!brief) {
		return (
			<section className="chase-cc-morning chase-cc-morning--empty">
				<header className="chase-cc-morning-head">
					<span className="chase-cc-morning-title">§ MORNING BRIEF</span>
					<span className="chase-cc-morning-meta chase-cc-dim">
						no report yet
					</span>
					<button
						type="button"
						className="chase-cc-yt-review-btn"
						onClick={() => void runNew()}
						disabled={busy}
					>
						RUN NEW ↻
					</button>
				</header>
				<p className="chase-cc-morning-empty-msg chase-cc-mono chase-cc-dim">
					&gt; click RUN NEW to generate today's morning trend briefing
				</p>
			</section>
		);
	}

	return (
		<section className="chase-cc-morning">
			<header className="chase-cc-morning-head">
				<span className="chase-cc-morning-title">§ MORNING BRIEF</span>
				<span className="chase-cc-morning-window">{brief.date}</span>
				<span className="chase-cc-morning-chips">
					<span className="chase-cc-morning-chip">
						<span className="chase-cc-morning-chip-count">
							{brief.headlines.length}
						</span>
						HEADLINES
					</span>
					<span className="chase-cc-morning-chip">
						<span className="chase-cc-morning-chip-count">{brief.webCount}</span>
						ARTICLES
					</span>
					<span className="chase-cc-morning-chip">
						<span className="chase-cc-morning-chip-count">
							{brief.xVoicesCount}
						</span>
						X VOICES
					</span>
					<span className="chase-cc-morning-chip">
						<span className="chase-cc-morning-chip-count">{brief.repoCount}</span>
						REPOS
					</span>
					<span className="chase-cc-morning-chip chase-cc-morning-chip--opp">
						<span className="chase-cc-morning-chip-count">
							{brief.contentOpportunities.length}
						</span>
						OPPS
					</span>
				</span>
				<span className="chase-cc-morning-actions">
					<button
						type="button"
						className="chase-cc-yt-review-btn"
						onClick={openFull}
						title="open full report"
					>
						FULL ↗
					</button>
					<button
						type="button"
						className="chase-cc-yt-review-btn"
						onClick={() => void runNew()}
						disabled={busy}
						title="run new report"
					>
						↻
					</button>
				</span>
			</header>

			<div className="chase-cc-morning-body">
				<div className="chase-cc-morning-col">
					<div className="chase-cc-morning-col-label">▸ HEADLINES</div>
					{brief.headlines.length === 0 ? (
						<p className="chase-cc-morning-col-empty chase-cc-dim">
							no headlines parsed
						</p>
					) : (
						<ul className="chase-cc-morning-bullets">
							{brief.headlines.slice(0, 3).map((h, i) => (
								<li key={i} className="chase-cc-morning-bullet">
									{stripMd(h)}
								</li>
							))}
						</ul>
					)}
				</div>
				<div className="chase-cc-morning-col chase-cc-morning-col--yt">
					<div className="chase-cc-morning-col-label">▶ YT TRENDING</div>
					{brief.ytTrending.length === 0 ? (
						<p className="chase-cc-morning-col-empty chase-cc-dim">
							no YT data parsed
						</p>
					) : (
						<ul className="chase-cc-morning-yt-list">
							{brief.ytTrending.slice(0, 3).map((v, i) => (
								<li key={i} className="chase-cc-morning-yt-item">
									<span className="chase-cc-morning-yt-title">
										{stripMd(v.title)}
									</span>
									<span className="chase-cc-morning-yt-meta">
										<span className="chase-cc-morning-yt-creator">
											{stripMd(v.creator)}
										</span>
										<span className="chase-cc-morning-yt-views">
											{v.views}
										</span>
									</span>
								</li>
							))}
						</ul>
					)}
				</div>
				<div className="chase-cc-morning-col chase-cc-morning-col--x">
					<div className="chase-cc-morning-col-label">𝕏 CONVERSATION</div>
					{brief.xVoices.length === 0 ? (
						<p className="chase-cc-morning-col-empty chase-cc-dim">
							no X voices parsed
						</p>
					) : (
						<ul className="chase-cc-morning-x-list">
							{brief.xVoices.slice(0, 3).map((v, i) => (
								<li key={i} className="chase-cc-morning-x-item">
									{stripMd(v)}
								</li>
							))}
						</ul>
					)}
				</div>
				<div className="chase-cc-morning-col chase-cc-morning-col--opp">
					<div className="chase-cc-morning-col-label">★ CONTENT OPPORTUNITIES</div>
					{brief.contentOpportunities.length === 0 ? (
						<p className="chase-cc-morning-col-empty chase-cc-dim">
							no opportunities parsed
						</p>
					) : (
						<ol className="chase-cc-morning-opps">
							{brief.contentOpportunities.slice(0, 3).map((o, i) => (
								<li key={i} className="chase-cc-morning-opp">
									<span className="chase-cc-morning-opp-num">{i + 1}</span>
									<span className="chase-cc-morning-opp-text">{o}</span>
								</li>
							))}
						</ol>
					)}
				</div>
			</div>
		</section>
	);
}

function stripMd(s: string): string {
	return s
		.replace(/\*\*([^*]+)\*\*/g, "$1")
		.replace(/`([^`]+)`/g, "$1")
		.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
}
