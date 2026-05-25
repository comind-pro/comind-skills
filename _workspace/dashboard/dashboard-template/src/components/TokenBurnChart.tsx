import { h } from "preact";
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import type { SeriesPoint } from "../lib/metrics";

interface Props {
	series: SeriesPoint[];
	budget: number;
}

const WINDOW_MS = 5 * 60 * 60 * 1000;

function compact(n: number): string {
	return new Intl.NumberFormat("en-US", {
		notation: "compact",
		maximumFractionDigits: 2,
	}).format(n);
}

function humanDur(ms: number): string {
	if (ms < 0) ms = 0;
	const m = Math.round(ms / 60_000);
	if (m < 60) return `${m}m`;
	const h = Math.floor(m / 60);
	const rem = m - h * 60;
	return rem === 0 ? `${h}h` : `${h}h ${rem}m`;
}

function toneFor(pct: number): "cool" | "warm" | "hot" | "critical" {
	if (pct >= 95) return "critical";
	if (pct >= 80) return "hot";
	if (pct >= 50) return "warm";
	return "cool";
}

function useAnimatedNumber(target: number, duration = 700): number {
	const [value, setValue] = useState(target);
	const startRef = useRef(target);
	const firstRender = useRef(true);

	useEffect(() => {
		if (firstRender.current) {
			firstRender.current = false;
			setValue(target);
			startRef.current = target;
			return;
		}
		const from = startRef.current;
		const to = target;
		if (from === to) return;
		const startedAt = performance.now();
		let raf = 0;
		const tick = (now: number) => {
			const t = Math.min(1, (now - startedAt) / duration);
			const eased = 1 - Math.pow(1 - t, 3);
			setValue(from + (to - from) * eased);
			if (t < 1) raf = requestAnimationFrame(tick);
			else startRef.current = to;
		};
		raf = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(raf);
	}, [target, duration]);

	return value;
}

export function TokenBurnChart({ series, budget }: Props) {
	const now = Date.now();

	const latest = series.length > 0 ? series[series.length - 1]! : null;
	const elapsed = latest?.value ?? 0;
	const animatedElapsed = useAnimatedNumber(elapsed);
	const pct = budget > 0 ? Math.min(100, (elapsed / budget) * 100) : 0;
	const pctRaw = budget > 0 ? (elapsed / budget) * 100 : 0;
	const animatedPct = useAnimatedNumber(pctRaw);
	const tone = toneFor(pctRaw);

	// Projection: linear from 3 most recent samples, extrapolated to window-end.
	const projection = useMemo(() => {
		const recent = series.slice(-3);
		if (recent.length < 2 || !latest) return null;
		const first = recent[0]!;
		const last = recent[recent.length - 1]!;
		const dt = last.ts - first.ts;
		if (dt <= 0) return null;
		const slope = (last.value - first.value) / dt;
		const forwardMs = WINDOW_MS - (now - last.ts);
		if (forwardMs <= 0) return null;
		const projectedTotal = Math.max(
			elapsed,
			elapsed + slope * forwardMs,
		);
		return {
			projectedTotal,
			projectedPct: budget > 0 ? (projectedTotal / budget) * 100 : 0,
		};
	}, [series, latest, elapsed, budget, now]);

	const lastPullAgoMs = latest ? now - latest.ts : null;
	const ticks = [0, 0.25, 0.5, 0.75, 1];

	const projectedPctClamped = projection
		? Math.min(100, projection.projectedPct)
		: pct;
	const projectionWidth = Math.max(0, projectedPctClamped - pct);

	return (
		<section
			className={`dash-tokenburn dash-tokenburn--tone-${tone}`}
		>
			<span className="dash-tokenburn-corner dash-tokenburn-corner--tl" />
			<span className="dash-tokenburn-corner dash-tokenburn-corner--tr" />
			<span className="dash-tokenburn-corner dash-tokenburn-corner--bl" />
			<span className="dash-tokenburn-corner dash-tokenburn-corner--br" />

			<header className="dash-tokenburn-head">
				<span className="dash-tokenburn-title">
					§ TOKEN BURN · 5H WINDOW
				</span>
				<span className="dash-tokenburn-pulse">
					<span className="dash-tokenburn-pulse-dot" />
					LIVE
				</span>
				<span className="dash-tokenburn-meta">
					{lastPullAgoMs !== null
						? `last pull ${humanDur(lastPullAgoMs)} ago`
						: "no pulls yet"}
				</span>
			</header>

			<div className="dash-tokenburn-meter">
				<div className="dash-tokenburn-pct">
					<span className="dash-tokenburn-pct-num">
						{animatedPct.toFixed(0)}
					</span>
					<span className="dash-tokenburn-pct-unit">%</span>
				</div>

				<div className="dash-tokenburn-bar-wrap">
					<div className="dash-tokenburn-bar">
						<div className="dash-tokenburn-bar-track" />
						<div className="dash-tokenburn-bar-ticks" />
						{projection && projectionWidth > 0 ? (
							<div
								className="dash-tokenburn-bar-projection"
								style={{
									left: `${pct}%`,
									width: `${projectionWidth}%`,
								}}
							/>
						) : null}
						<div
							className="dash-tokenburn-bar-fill"
							style={{ width: `${pct}%` }}
						>
							<span className="dash-tokenburn-bar-scan" />
							<span className="dash-tokenburn-bar-comet" />
						</div>
						<div
							className="dash-tokenburn-bar-endpoint"
							style={{ left: `${pct}%` }}
						>
							<span className="dash-tokenburn-bar-endpoint-pulse" />
							<span className="dash-tokenburn-bar-endpoint-core" />
						</div>
					</div>
					<div className="dash-tokenburn-scale">
						{ticks.map((t) => (
							<span key={`tk-${t}`}>{compact(budget * t)}</span>
						))}
					</div>
				</div>

				<div className="dash-tokenburn-raw">
					<span className="dash-tokenburn-raw-elapsed">
						{compact(animatedElapsed)}
					</span>
					<span className="dash-tokenburn-raw-of">
						/ {compact(budget)}
					</span>
					{projection ? (
						<span className="dash-tokenburn-raw-proj">
							→ {compact(projection.projectedTotal)} proj
						</span>
					) : null}
				</div>
			</div>

		</section>
	);
}
