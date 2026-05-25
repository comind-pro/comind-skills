import { h } from "preact";
import { useEffect, useState, useCallback } from "preact/hooks";
import type DashboardPlugin from "../main";
import {
	readMetricsCsv,
	snapshotByKey,
	seriesForKey,
	type MetricSnapshot,
	type SeriesPoint,
} from "../lib/metrics";
import {
	readDailyNote,
	todayPath,
	SUPPORTED_SCHEMA_VERSION,
	type DailyNoteRead,
} from "../lib/vault";
import { listRecentRuns, type RunRecord } from "../lib/queue";
import {
	readRunnerStatus,
	readLastPull,
	nextPullDelta,
	runnerIsOnline,
	humanDuration,
	latestPullTs,
	type RunnerStatus,
	type LastPullSnapshot,
} from "../lib/status";
import { readLatestVideo, type LatestVideo } from "../lib/youtube";
import { MetricCard } from "./MetricCard";
import { LatestVideoCard } from "./LatestVideoCard";
import { ScheduleList } from "./ScheduleList";
import { DailyDriversChecklist } from "./DailyDriversChecklist";
import { GithubTrendingCard } from "./GithubTrendingCard";
import { HackerNewsCard } from "./HackerNewsCard";
import { TokenBurnChart } from "./TokenBurnChart";
import { YtWeekReviewCard } from "./YtWeekReviewCard";
import { MorningBriefCard } from "./MorningBriefCard";
import { ActionBar } from "./ActionBar";
import { ActivityFeed } from "./ActivityFeed";

interface Props {
	plugin: DashboardPlugin;
}

type Tab = "overview" | "audience" | "research";

type Tone = "youtube" | "instagram" | "tiktok" | "neutral";

interface CardSpec {
	key: string;
	label: string;
	format: "currency" | "integer" | "compact" | "percent";
	tabs: Tab[];
	hero?: boolean;
	tone?: Tone;
}

// CUSTOMIZE — one entry per $METRIC you wired in Phase 4.
// `key` MUST match `<source>:<metric>` from your pull_*.py scripts'
// emit() calls. Drop tabs you don't use; add tones for visual grouping.
// Cards with no matching CSV rows render a "no data" placeholder.
const CARDS: CardSpec[] = [
	{ key: "youtube:subscribers", label: "YouTube Subs", format: "integer", tabs: ["overview", "audience"], tone: "youtube" },
	{ key: "youtube:views_28d", label: "YouTube Views", format: "integer", tabs: ["overview", "audience"], tone: "youtube" },
	{ key: "instagram:followers", label: "Instagram", format: "integer", tabs: ["overview", "audience"], tone: "instagram" },
	{ key: "tiktok:followers", label: "TikTok", format: "integer", tabs: ["overview", "audience"], tone: "tiktok" },
];

const TODAY_PATH = todayPath();

export function Dashboard({ plugin }: Props) {
	const [snapshots, setSnapshots] = useState<Map<string, MetricSnapshot> | null>(null);
	const [claudeSeries, setClaudeSeries] = useState<SeriesPoint[]>([]);
	const [daily, setDaily] = useState<DailyNoteRead | null>(null);
	const [runs, setRuns] = useState<RunRecord[]>([]);
	const [runner, setRunner] = useState<RunnerStatus | null>(null);
	const [lastPull, setLastPull] = useState<LastPullSnapshot | null>(null);
	const [latestVideo, setLatestVideo] = useState<LatestVideo | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [tab, setTab] = useState<Tab>("overview");

	const refresh = useCallback(async () => {
		try {
			const [rows, dn, recentRuns, rs, lp, lv] = await Promise.all([
				readMetricsCsv(plugin.app),
				readDailyNote(plugin.app, TODAY_PATH),
				listRecentRuns(plugin.app, 8),
				readRunnerStatus(plugin.app),
				readLastPull(plugin.app),
				readLatestVideo(plugin.app),
			]);
			setSnapshots(snapshotByKey(rows));
			setClaudeSeries(
				seriesForKey(rows, "claude_code", "tokens_5h", 24 * 60 * 60 * 1000),
			);
			setDaily(dn);
			setRuns(recentRuns);
			setRunner(rs);
			setLastPull(lp);
			setLatestVideo(lv);
			setError(null);
		} catch (e) {
			setError(String(e));
		}
	}, [plugin]);

	useEffect(() => {
		refresh();
		const handler = (file: { path: string }) => {
			if (
				file.path === "system/metrics/metrics.csv" ||
				file.path === "system/metrics/latest-video.json" ||
				file.path === TODAY_PATH ||
				file.path.startsWith("system/runs/")
			) {
				void refresh();
			}
		};
		plugin.app.vault.on("modify", handler);
		plugin.app.vault.on("create", handler);
		plugin.app.vault.on("delete", handler);

		const cacheHandler = (file: { path: string }) => {
			if (file.path === TODAY_PATH) void refresh();
		};
		plugin.app.metadataCache.on("changed", cacheHandler);

		// Periodic poll for relative-time freshness + safety net.
		const interval = window.setInterval(() => void refresh(), 15_000);

		return () => {
			plugin.app.vault.off("modify", handler);
			plugin.app.vault.off("create", handler);
			plugin.app.vault.off("delete", handler);
			plugin.app.metadataCache.off("changed", cacheHandler);
			window.clearInterval(interval);
		};
	}, [plugin, refresh]);

	const visibleCards = CARDS.filter((c) => c.tabs.includes(tab));
	const dailyMissing = daily === null;
	const dailyUnsupported = daily !== null && !daily.supported;

	const runnerBusy =
		runner?.busy === true || (runner?.pending != null && runner.pending > 0);

	return (
		<div
			className={`chase-cc-shell ${runnerBusy ? "chase-cc-shell--busy" : ""}`}
		>
			<header className="chase-cc-header">
				<span className="chase-cc-heartbeat" aria-hidden="true">
					<svg viewBox="0 0 24 12" width="32" height="16">
						<path
							d="M0 6 H6 L8 2 L10 10 L12 4 L14 8 L16 6 H24"
							fill="none"
							stroke="currentColor"
							strokeWidth="1.5"
							strokeLinecap="square"
						/>
					</svg>
				</span>
				<h1 className="chase-cc-title">AGENTIC OS</h1>
				<span className="chase-cc-status">
					{error ? "ERROR" : snapshots ? "LIVE" : "BOOT"}
				</span>
				<button
					className="chase-cc-refresh"
					type="button"
					onClick={refresh}
					title="refresh"
				>
					↻
				</button>
			</header>

			<nav className="chase-cc-tabs">
				{(["overview", "audience", "research"] as Tab[]).map((t) => (
					<button
						key={t}
						type="button"
						className={`chase-cc-tab ${t === tab ? "chase-cc-tab-active" : ""}`}
						onClick={() => setTab(t)}
					>
						{t}
					</button>
				))}
			</nav>

			{error ? (
				<section className="chase-cc-placeholder chase-cc-error-box">
					<p className="chase-cc-mono">&gt; read failed</p>
					<p className="chase-cc-mono chase-cc-dim">{error}</p>
				</section>
			) : (
				<>
					{tab === "overview" ? (
						<TokenBurnChart
							series={claudeSeries}
							budget={plugin.settings.claudeTokenBudget5h}
						/>
					) : null}
					<section className="chase-cc-card-row">
						{visibleCards.map((c) => (
							<MetricCard
								key={c.key}
								label={c.label}
								snapshot={snapshots?.get(c.key) ?? null}
								format={c.format}
								hero={c.hero}
								tone={c.tone}
							/>
						))}
					</section>
					{tab !== "research" && (
						<section className="chase-cc-latest-row">
							<LatestVideoCard video={latestVideo} />
						</section>
					)}
				</>
			)}

			<ActionBar plugin={plugin} onSubmitted={() => void refresh()} />

			{dailyMissing ? (
				<section className="chase-cc-placeholder">
					<p className="chase-cc-mono chase-cc-dim">
						&gt; no daily note at {TODAY_PATH}
					</p>
					<p className="chase-cc-mono chase-cc-dim">
						click "Open Today" above or run /today
					</p>
				</section>
			) : dailyUnsupported ? (
				<section className="chase-cc-placeholder chase-cc-error-box">
					<p className="chase-cc-mono">
						&gt; unsupported schema_version: {daily!.schemaVersion}
					</p>
					<p className="chase-cc-mono chase-cc-dim">
						plugin supports v{SUPPORTED_SCHEMA_VERSION}. update template or bump
						parser.
					</p>
				</section>
			) : (
				<>
					{tab === "overview" ? (
						<section className="chase-cc-day-grid">
							<ScheduleList app={plugin.app} entries={daily!.schedule} />
							<DailyDriversChecklist
								app={plugin.app}
								path={TODAY_PATH}
								items={daily!.drivers}
							/>
						</section>
					) : null}
					{tab === "research" ? (
						<section className="chase-cc-day-grid">
							<GithubTrendingCard app={plugin.app} limit={5} />
							<HackerNewsCard limit={5} />
						</section>
					) : null}
				</>
			)}

			{tab === "audience" ? <YtWeekReviewCard app={plugin.app} /> : null}
			{tab === "research" ? <MorningBriefCard app={plugin.app} /> : null}

			<ActivityFeed app={plugin.app} runs={runs} />

			<footer className="chase-cc-footer">
				{(() => {
					const online = runnerIsOnline(runner);
					const next = nextPullDelta(
						lastPull,
						plugin.settings.metricsPullCadenceHours,
					);
					const lastTs = latestPullTs(lastPull);
					const lastAgo =
						lastTs !== null
							? humanDuration(Date.now() - Date.parse(lastTs))
							: "—";
					return (
						<span className="chase-cc-mono chase-cc-dim chase-cc-footer-line">
							<span
								className={
									online
										? "chase-cc-foot-online"
										: "chase-cc-foot-offline"
								}
								title={
									runner
										? `pid ${runner.pid} · ts ${runner.ts}`
										: "no heartbeat"
								}
							>
								● runner {online ? "online" : "offline"}
								{online && runner?.busy
									? ` (${runner.active ?? "?"}/${runner.max_concurrent ?? "?"}${
											runner.pending ? ` · ${runner.pending} queued` : ""
									  })`
									: online && runner?.pending
									  ? ` (${runner.pending} queued)`
									  : ""}
							</span>
							<span className="chase-cc-foot-sep">·</span>
							<span title={lastTs || ""}>last pull {lastAgo} ago</span>
							<span className="chase-cc-foot-sep">·</span>
							<span>
								next{" "}
								{next
									? next.overdue
										? `overdue ${humanDuration(-next.ms)}`
										: `in ${humanDuration(next.ms)}`
									: "—"}
							</span>
							<span className="chase-cc-cursor">█</span>
						</span>
					);
				})()}
			</footer>
		</div>
	);
}
