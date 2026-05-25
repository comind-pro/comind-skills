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
import { MetricCard } from "./MetricCard";
import { ScheduleList } from "./ScheduleList";
import { DailyDriversChecklist } from "./DailyDriversChecklist";
import { Top3Priorities } from "./Top3Priorities";
import { FocusCard } from "./FocusCard";
import { TokenBurnChart } from "./TokenBurnChart";
import { ActionBar } from "./ActionBar";
import { ActivityFeed } from "./ActivityFeed";
import { startRunner, restartRunner } from "../lib/runnerControl";

interface Props {
	plugin: DashboardPlugin;
}

type Tab = "overview" | "tasks" | "activity";

interface CardSpec {
	key: string;
	label: string;
	format: "currency" | "integer" | "compact" | "percent";
	tabs: Tab[];
	hero?: boolean;
}

// CUSTOMIZE — one entry per metric your metrics-pull scripts emit.
// `key` MUST match the `<source>:<metric>` your pull_*.py emit() calls produce
// (look at _workspace/system/metrics/metrics.csv for the live keys). Cards with no matching
// CSV row render a "no data" placeholder — safe to leave them in for metrics you
// plan to wire later. Defaults below target a developer workflow; swap freely.
const CARDS: CardSpec[] = [
	{ key: "tasks:open", label: "Open Tasks", format: "integer", tabs: ["overview", "tasks"] },
	{ key: "tasks:in_progress", label: "In Progress", format: "integer", tabs: ["overview", "tasks"] },
	{ key: "runs:today", label: "Runs Today", format: "integer", tabs: ["overview", "activity"] },
	{ key: "git:commits_today", label: "Commits Today", format: "integer", tabs: ["overview"] },
	{ key: "tasks:blocked", label: "Blocked", format: "integer", tabs: ["tasks"] },
	{ key: "tasks:done_7d", label: "Done · 7d", format: "integer", tabs: ["tasks"] },
];

const TABS: Tab[] = ["overview", "tasks", "activity"];
const TODAY_PATH = todayPath();

export function Dashboard({ plugin }: Props) {
	const [snapshots, setSnapshots] = useState<Map<string, MetricSnapshot> | null>(null);
	const [claudeSeries, setClaudeSeries] = useState<SeriesPoint[]>([]);
	const [daily, setDaily] = useState<DailyNoteRead | null>(null);
	const [runs, setRuns] = useState<RunRecord[]>([]);
	const [runner, setRunner] = useState<RunnerStatus | null>(null);
	const [lastPull, setLastPull] = useState<LastPullSnapshot | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [tab, setTab] = useState<Tab>("overview");

	const refresh = useCallback(async () => {
		try {
			const [rows, dn, recentRuns, rs, lp] = await Promise.all([
				readMetricsCsv(plugin.app),
				readDailyNote(plugin.app, TODAY_PATH),
				listRecentRuns(plugin.app, 8),
				readRunnerStatus(plugin.app),
				readLastPull(plugin.app),
			]);
			setSnapshots(snapshotByKey(rows));
			setClaudeSeries(
				seriesForKey(rows, "claude_code", "tokens_5h", 24 * 60 * 60 * 1000),
			);
			setDaily(dn);
			setRuns(recentRuns);
			setRunner(rs);
			setLastPull(lp);
			setError(null);
		} catch (e) {
			setError(String(e));
		}
	}, [plugin]);

	const handleRunnerToggle = useCallback(async () => {
		const script = plugin.settings.runnerScriptPath;
		if (runnerIsOnline(runner)) {
			await restartRunner(plugin.app, script);
		} else {
			await startRunner(plugin.app, script);
		}
		// Give the daemon a moment to write its first heartbeat, then refresh.
		window.setTimeout(() => void refresh(), 1500);
	}, [plugin, runner, refresh]);

	useEffect(() => {
		refresh();
		const handler = (file: { path: string }) => {
			if (
				file.path === "_workspace/system/metrics/metrics.csv" ||
				file.path === TODAY_PATH ||
				file.path.startsWith("_workspace/system/runs/")
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
		<div className={`dash-shell ${runnerBusy ? "dash-shell--busy" : ""}`}>
			<header className="dash-header">
				<h1 className="dash-title">Dashboard</h1>
				<span className="dash-status">
					{error ? "error" : snapshots ? "live" : "boot"}
				</span>
				<button
					className="dash-refresh"
					type="button"
					onClick={refresh}
					title="refresh"
				>
					↻
				</button>
			</header>

			<nav className="dash-tabs">
				{TABS.map((t) => (
					<button
						key={t}
						type="button"
						className={`dash-tab ${t === tab ? "dash-tab-active" : ""}`}
						onClick={() => setTab(t)}
					>
						{t}
					</button>
				))}
			</nav>

			{error ? (
				<section className="dash-placeholder dash-error-box">
					<p className="dash-mono">&gt; read failed</p>
					<p className="dash-mono dash-dim">{error}</p>
				</section>
			) : (
				<>
					{tab === "overview" ? (
						<TokenBurnChart
							series={claudeSeries}
							budget={plugin.settings.claudeTokenBudget5h}
						/>
					) : null}
					{visibleCards.length > 0 ? (
						<section className="dash-card-row">
							{visibleCards.map((c) => (
								<MetricCard
									key={c.key}
									label={c.label}
									snapshot={snapshots?.get(c.key) ?? null}
									format={c.format}
									hero={c.hero}
								/>
							))}
						</section>
					) : null}
				</>
			)}

			<ActionBar plugin={plugin} onSubmitted={() => void refresh()} />

			{dailyMissing ? (
				<section className="dash-placeholder">
					<p className="dash-mono dash-dim">
						&gt; no daily note at {TODAY_PATH}
					</p>
					<p className="dash-mono dash-dim">
						click "Open Today" above or run /today
					</p>
				</section>
			) : dailyUnsupported ? (
				<section className="dash-placeholder dash-error-box">
					<p className="dash-mono">
						&gt; unsupported schema_version: {daily!.schemaVersion}
					</p>
					<p className="dash-mono dash-dim">
						plugin supports v{SUPPORTED_SCHEMA_VERSION}. update template or bump
						parser.
					</p>
				</section>
			) : (
				<>
					{tab === "overview" ? (
						<section className="dash-day-grid">
							<ScheduleList app={plugin.app} entries={daily!.schedule} />
							<DailyDriversChecklist
								app={plugin.app}
								path={TODAY_PATH}
								items={daily!.drivers}
							/>
						</section>
					) : null}
					{tab === "tasks" ? (
						<>
							<FocusCard focus={daily!.focus} />
							<section className="dash-day-grid">
								<Top3Priorities
									app={plugin.app}
									path={TODAY_PATH}
									items={daily!.top3}
								/>
								<DailyDriversChecklist
									app={plugin.app}
									path={TODAY_PATH}
									items={daily!.drivers}
								/>
							</section>
						</>
					) : null}
				</>
			)}

			{tab === "activity" ? <ActivityFeed app={plugin.app} runs={runs} /> : null}

			<footer className="dash-footer">
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
						<span className="dash-mono dash-dim dash-footer-line">
							<span
								className={
									online ? "dash-foot-online" : "dash-foot-offline"
								}
								title={
									runner ? `pid ${runner.pid} · ts ${runner.ts}` : "no heartbeat"
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
							<button
								className="dash-runner-btn"
								type="button"
								onClick={handleRunnerToggle}
								title={
									online
										? "restart runner daemon"
										: "start runner daemon"
								}
							>
								{online ? "↻ restart" : "▶ start"}
							</button>
							{online && runner?.in_flight && runner.in_flight.length > 0 ? (
								<>
									<span className="dash-foot-sep">·</span>
									<span
										className="dash-foot-running"
										title="skills running now"
									>
										▶ {runner.in_flight.join(", ")}
									</span>
								</>
							) : null}
							<span className="dash-foot-sep">·</span>
							<span title={lastTs || ""}>last pull {lastAgo} ago</span>
							<span className="dash-foot-sep">·</span>
							<span>
								next{" "}
								{next
									? next.overdue
										? `overdue ${humanDuration(-next.ms)}`
										: `in ${humanDuration(next.ms)}`
									: "—"}
							</span>
						</span>
					);
				})()}
			</footer>
		</div>
	);
}
