import { h, cloneElement } from "preact";
import { useEffect, useMemo, useRef, useState, useCallback } from "preact/hooks";
import { Notice } from "obsidian";
import type DashboardPlugin from "../main";
import {
	seriesForKey,
	readMetricsCsv,
	snapshotByKey,
	type MetricRow,
	type MetricSnapshot,
} from "../lib/metrics";
import {
	readDailyNote,
	todayPath,
	SUPPORTED_SCHEMA_VERSION,
	type DailyNoteRead,
} from "../lib/vault";
import { listRecentRuns, RUNS_DIR, type RunRecord } from "../lib/queue";
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
import {
	DEFAULT_CONFIG,
	validateConfig,
	type ActionBarWidget,
	type ActivityFeedWidget,
	type DashboardConfig,
	type MetricGridWidget,
	type SimpleWidget,
	type TokenBurnChartWidget,
	type WidgetSpec,
	type WidgetType,
} from "../lib/config";
import { MetricCard } from "./MetricCard";
import { ScheduleList } from "./ScheduleList";
import { DailyDriversChecklist } from "./DailyDriversChecklist";
import { Top3Priorities } from "./Top3Priorities";
import { FocusCard } from "./FocusCard";
import { TokenBurnChart } from "./TokenBurnChart";
import { ActionBar } from "./ActionBar";
import { ActivityFeed } from "./ActivityFeed";
import { startRunner, restartRunner } from "../lib/runnerControl";

// CUSTOMIZE — tabs, widgets, metric cards, and action buttons all live in
// <vaultSystemPath>/dashboard.config.json (written on first run). Edit the
// JSON and run `npm run validate:config` — the dashboard re-renders live,
// no rebuild and no TSX edits needed.

interface Props {
	plugin: DashboardPlugin;
}

const CHART_WINDOW_MS = 24 * 60 * 60 * 1000;

// Everything the widget renderers need, threaded through the registry.
interface WidgetCtx {
	plugin: DashboardPlugin;
	rows: MetricRow[] | null;
	snapshots: Map<string, MetricSnapshot> | null;
	daily: DailyNoteRead | null;
	runs: RunRecord[];
	todayNotePath: string;
	refresh: () => void;
}

type Renderer<W extends WidgetSpec = WidgetSpec> = (
	w: W,
	ctx: WidgetCtx,
) => h.JSX.Element;

const WIDGET_REGISTRY: {
	[K in WidgetType]: Renderer<Extract<WidgetSpec, { type: K }>>;
} = {
	"metric-grid": (w: MetricGridWidget, ctx) => (
		<section className="dash-card-row">
			{w.cards.map((c) => (
				<MetricCard
					key={c.key}
					label={c.label}
					snapshot={ctx.snapshots?.get(c.key) ?? null}
					format={c.format}
					hero={c.hero}
					// percent cards assume the Claude 5h token budget setting as
					// denominator — the only budget the plugin knows about today.
					budget={
						c.format === "percent"
							? ctx.plugin.settings.claudeTokenBudget5h
							: undefined
					}
				/>
			))}
		</section>
	),
	"token-burn-chart": (w: TokenBurnChartWidget, ctx) => (
		<TokenBurnChart
			series={
				ctx.rows ? seriesForKey(ctx.rows, w.source, w.metric, CHART_WINDOW_MS) : []
			}
			budget={ctx.plugin.settings.claudeTokenBudget5h}
		/>
	),
	"action-bar": (w: ActionBarWidget, ctx) => (
		<ActionBar
			plugin={ctx.plugin}
			buttons={w.buttons}
			onSubmitted={() => ctx.refresh()}
		/>
	),
	focus: (_w: SimpleWidget, ctx) => <FocusCard focus={ctx.daily!.focus} />,
	top3: (_w: SimpleWidget, ctx) => (
		<Top3Priorities
			app={ctx.plugin.app}
			path={ctx.todayNotePath}
			items={ctx.daily!.top3}
		/>
	),
	"daily-drivers": (_w: SimpleWidget, ctx) => (
		<DailyDriversChecklist
			app={ctx.plugin.app}
			path={ctx.todayNotePath}
			items={ctx.daily!.drivers}
		/>
	),
	schedule: (_w: SimpleWidget, ctx) => (
		<ScheduleList app={ctx.plugin.app} entries={ctx.daily!.schedule} />
	),
	runs: (_w: SimpleWidget, ctx) => (
		<ActivityFeed app={ctx.plugin.app} runs={ctx.runs.slice(0, 8)} />
	),
	"activity-feed": (w: ActivityFeedWidget, ctx) => (
		<ActivityFeed app={ctx.plugin.app} runs={ctx.runs.slice(0, w.limit ?? 8)} />
	),
};

// Widgets that read from today's daily note — suppressed (with one shared
// notice) when the note is missing or has an unsupported schema.
const DAILY_TYPES = new Set<string>(["focus", "top3", "daily-drivers", "schedule"]);
// Panels that sit side-by-side inside a `dash-day-grid` section — consecutive
// runs of these are grouped to preserve the pre-config two-column layout.
const GRID_TYPES = new Set<string>(["schedule", "daily-drivers", "top3"]);

function renderWidget(w: WidgetSpec, ctx: WidgetCtx): h.JSX.Element {
	const renderer = (WIDGET_REGISTRY as Record<string, Renderer | undefined>)[
		w.type
	];
	if (!renderer) {
		// Runtime drift (config changed under us): error card in this slot only.
		return (
			<section className="dash-placeholder dash-error-box">
				<p className="dash-mono">&gt; unknown widget type "{String(w.type)}"</p>
				<p className="dash-mono dash-dim">
					fix dashboard.config.json and run npm run validate:config
				</p>
			</section>
		);
	}
	return renderer(w, ctx);
}

export function Dashboard({ plugin }: Props) {
	const [config, setConfig] = useState<DashboardConfig>(DEFAULT_CONFIG);
	const [configErrors, setConfigErrors] = useState<string[]>([]);
	const [widgetErrors, setWidgetErrors] = useState<Record<number, string[]>>({});
	const [rows, setRows] = useState<MetricRow[] | null>(null);
	const [daily, setDaily] = useState<DailyNoteRead | null>(null);
	const [runs, setRuns] = useState<RunRecord[]>([]);
	const [runner, setRunner] = useState<RunnerStatus | null>(null);
	const [lastPull, setLastPull] = useState<LastPullSnapshot | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [tab, setTab] = useState<string>(DEFAULT_CONFIG.tabs[0]!.id);

	const configPath = `${plugin.settings.vaultSystemPath}/dashboard.config.json`;
	const metricsCsvPath = `${plugin.settings.vaultSystemPath}/metrics/metrics.csv`;

	// Refs mirror config state so loadConfig/refresh stay referentially stable:
	// a config change must not tear down the vault watchers (see useEffect).
	const configRef = useRef<DashboardConfig>(DEFAULT_CONFIG);
	const configTextRef = useRef<string | null>(null);

	const applyConfig = useCallback(
		(next: DashboardConfig, errors: string[], wErrs: Record<number, string[]>) => {
			configRef.current = next;
			setConfig(next);
			setConfigErrors(errors);
			setWidgetErrors(wErrs);
		},
		[],
	);

	const loadConfig = useCallback(async () => {
		const adapter = plugin.app.vault.adapter;
		try {
			if (!(await adapter.exists(configPath))) {
				// First run: seed the vault so the agent has a file to edit.
				if (!(await adapter.exists(plugin.settings.vaultSystemPath))) {
					await adapter.mkdir(plugin.settings.vaultSystemPath);
				}
				const text = JSON.stringify(DEFAULT_CONFIG, null, 2) + "\n";
				await adapter.write(configPath, text);
				configTextRef.current = text;
				applyConfig(DEFAULT_CONFIG, [], {});
				new Notice(`Dashboard: wrote default config to ${configPath}`);
				return;
			}
			const text = await adapter.read(configPath);
			// Unchanged file → no state churn (watcher events, mounts, polls).
			if (text === configTextRef.current) return;
			configTextRef.current = text;
			const raw: unknown = JSON.parse(text);
			const { config: parsed, errors, shellValid, widgetErrors: wErrs } =
				validateConfig(raw);
			if (parsed) {
				applyConfig(parsed, [], {});
			} else if (shellValid) {
				// Shell (version/tabs/widgets array) is fine — render the valid
				// widgets and put an inline error card in each bad widget's slot.
				applyConfig(raw as DashboardConfig, errors, wErrs);
			} else {
				// Keep rendering the last-good config (or DEFAULT_CONFIG on boot).
				setConfigErrors(errors);
			}
		} catch (e) {
			setConfigErrors([`${configPath}: ${String(e)}`]);
		}
	}, [plugin, configPath, applyConfig]);

	const refresh = useCallback(async () => {
		try {
			const runsLimit = Math.max(
				8,
				// `?.` — a lenient (partial) config may hold malformed entries.
				...configRef.current.widgets.map((w) =>
					w?.type === "activity-feed" && typeof w.limit === "number"
						? w.limit
						: 0,
				),
			);
			const [metricRows, dn, recentRuns, rs, lp] = await Promise.all([
				readMetricsCsv(plugin.app, metricsCsvPath),
				readDailyNote(plugin.app, todayPath()),
				listRecentRuns(plugin.app, runsLimit),
				readRunnerStatus(plugin.app),
				readLastPull(plugin.app),
			]);
			setRows(metricRows);
			setDaily(dn);
			setRuns(recentRuns);
			setRunner(rs);
			setLastPull(lp);
			setError(null);
		} catch (e) {
			setError(String(e));
		}
	}, [plugin, metricsCsvPath]);

	const snapshots = useMemo(
		() => (rows ? snapshotByKey(rows) : null),
		[rows],
	);

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
		void loadConfig();
		void refresh();
		const handler = (file: { path: string }) => {
			if (file.path === configPath) {
				void loadConfig();
				return;
			}
			if (
				file.path === metricsCsvPath ||
				file.path === todayPath() ||
				file.path.startsWith(`${RUNS_DIR}/`)
			) {
				void refresh();
			}
		};
		plugin.app.vault.on("modify", handler);
		plugin.app.vault.on("create", handler);
		plugin.app.vault.on("delete", handler);

		const cacheHandler = (file: { path: string }) => {
			if (file.path === todayPath()) void refresh();
		};
		plugin.app.metadataCache.on("changed", cacheHandler);

		// Periodic poll for relative-time freshness + safety net.
		// Also crosses midnight: todayPath() is recomputed on every refresh.
		const interval = window.setInterval(() => void refresh(), 15_000);

		return () => {
			plugin.app.vault.off("modify", handler);
			plugin.app.vault.off("create", handler);
			plugin.app.vault.off("delete", handler);
			plugin.app.metadataCache.off("changed", cacheHandler);
			window.clearInterval(interval);
		};
	}, [plugin, refresh, loadConfig, configPath, metricsCsvPath]);

	const todayNotePath = todayPath();
	// If the active tab vanished from the config, fall back to the first tab.
	const activeTab = config.tabs.some((t) => t.id === tab)
		? tab
		: config.tabs[0]!.id;

	const dailyMissing = daily === null;
	const dailyUnsupported = daily !== null && !daily.supported;
	const dailyOk = !dailyMissing && !dailyUnsupported;

	const ctx: WidgetCtx = {
		plugin,
		rows,
		snapshots,
		daily,
		runs,
		todayNotePath,
		refresh: () => void refresh(),
	};

	const dailyNotice = dailyMissing ? (
		<section key="daily-notice" className="dash-placeholder">
			<p className="dash-mono dash-dim">
				&gt; no daily note at {todayNotePath}
			</p>
			<p className="dash-mono dash-dim">
				click "Open Today" above or run /today
			</p>
		</section>
	) : (
		<section key="daily-notice" className="dash-placeholder dash-error-box">
			<p className="dash-mono">
				&gt; unsupported schema_version: {daily?.schemaVersion}
			</p>
			<p className="dash-mono dash-dim">
				plugin supports v{SUPPORTED_SCHEMA_VERSION}. update template or bump
				parser.
			</p>
		</section>
	);

	// Render visible widgets in config order. Invalid widgets (lenient config)
	// become inline error cards in their slot; siblings render normally.
	// Consecutive day-grid panels share one `dash-day-grid` section; daily-note
	// widgets collapse into a single notice while the note is missing/unsupported.
	const renderWidgets = (): h.JSX.Element[] => {
		const visible = config.widgets
			.map((w, idx) => ({ w, idx }))
			.filter(({ w, idx }) => {
				const tabs: unknown = w?.tabs;
				if (Array.isArray(tabs) && tabs.length > 0) {
					return tabs.includes(activeTab);
				}
				// Widget with broken/missing tabs: show its error card on every tab.
				return widgetErrors[idx] !== undefined;
			});
		const out: h.JSX.Element[] = [];
		let dailyNoticeShown = false;
		let i = 0;
		while (i < visible.length) {
			const { w, idx } = visible[i]!;
			const errs = widgetErrors[idx];
			if (errs) {
				out.push(
					<section
						key={`widget-error-${idx}`}
						className="dash-placeholder dash-error-box"
					>
						<p className="dash-mono">
							&gt; invalid widget widgets[{idx}]
							{typeof w?.type === "string" ? ` ("${w.type}")` : ""}
						</p>
						{errs.map((e) => (
							<p key={e} className="dash-mono dash-dim">
								{e}
							</p>
						))}
					</section>,
				);
				i++;
				continue;
			}
			if (DAILY_TYPES.has(w.type) && !dailyOk) {
				if (!dailyNoticeShown) {
					out.push(dailyNotice);
					dailyNoticeShown = true;
				}
				i++;
				continue;
			}
			if (GRID_TYPES.has(w.type)) {
				const group: h.JSX.Element[] = [];
				const firstIdx = idx;
				while (
					i < visible.length &&
					GRID_TYPES.has(visible[i]!.w.type) &&
					!widgetErrors[visible[i]!.idx]
				) {
					const { w: gw, idx: gidx } = visible[i]!;
					group.push(
						cloneElement(renderWidget(gw, ctx), { key: `${gw.type}-${gidx}` }),
					);
					i++;
				}
				out.push(
					<section key={`grid-${firstIdx}`} className="dash-day-grid">
						{group}
					</section>,
				);
				continue;
			}
			out.push(cloneElement(renderWidget(w, ctx), { key: `${w.type}-${idx}` }));
			i++;
		}
		return out;
	};

	const runnerBusy =
		runner?.busy === true || (runner?.pending != null && runner.pending > 0);

	return (
		<div className={`dash-shell ${runnerBusy ? "dash-shell--busy" : ""}`}>
			<header className="dash-header">
				<h1 className="dash-title">Dashboard</h1>
				<span className="dash-status">
					{error ? "error" : rows ? "live" : "boot"}
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
				{config.tabs.map((t) => (
					<button
						key={t.id}
						type="button"
						className={`dash-tab ${t.id === activeTab ? "dash-tab-active" : ""}`}
						onClick={() => setTab(t.id)}
					>
						{t.label}
					</button>
				))}
			</nav>

			{configErrors.length > 0 ? (
				<section className="dash-placeholder dash-error-box">
					<p className="dash-mono">
						&gt; config errors in {configPath}
					</p>
					{configErrors.map((e) => (
						<p key={e} className="dash-mono dash-dim">
							{e}
						</p>
					))}
				</section>
			) : null}

			{error ? (
				<section className="dash-placeholder dash-error-box">
					<p className="dash-mono">&gt; read failed</p>
					<p className="dash-mono dash-dim">{error}</p>
				</section>
			) : null}

			{renderWidgets()}

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
