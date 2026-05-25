import type { App } from "obsidian";

export type Verdict = "Hit" | "Steady" | "Miss" | "Climbing" | "Unknown";

export interface UploadRow {
	title: string;
	views: number;
	vsBaselinePct: number | null;
	likes: number;
	comments: number;
	verdict: Verdict;
}

export interface YtReview {
	path: string;
	date: string;
	window: string;
	channel: string;
	tldr: string[];
	uploads: UploadRow[];
	baselineViews: number | null;
	baselineLikes: number | null;
	topPerformer: { title: string; body: string } | null;
	underperformer: { title: string; body: string } | null;
	channelSignal: string[];
	recommendations: string[];
}

const DIR = "inbox/reports/yt-reviews";

export async function findLatestReview(app: App): Promise<string | null> {
	if (!(await app.vault.adapter.exists(DIR))) return null;
	const listing = await app.vault.adapter.list(DIR);
	const mds = listing.files
		.filter((f) => f.endsWith(".md"))
		.sort();
	return mds.length === 0 ? null : mds[mds.length - 1]!;
}

export async function readLatestReview(app: App): Promise<YtReview | null> {
	const path = await findLatestReview(app);
	if (!path) return null;
	const raw = await app.vault.adapter.read(path);
	return parseReview(path, raw);
}

function parseLooseNumber(s: string): number | null {
	const clean = s.replace(/,/g, "").replace(/\s+/g, "").trim();
	if (!clean) return null;
	const n = parseFloat(clean);
	return Number.isFinite(n) ? n : null;
}

function extractBullets(body: string): string[] {
	return body
		.split("\n")
		.map((l) => l.trim())
		.filter((l) => l.startsWith("-") || l.startsWith("*"))
		.map((l) => l.replace(/^[-*]\s+/, ""));
}

function parseUploadTable(body: string): UploadRow[] {
	const out: UploadRow[] = [];
	let sawSeparator = false;
	for (const rawLine of body.split("\n")) {
		const line = rawLine.trim();
		if (!line.startsWith("|")) continue;
		const cells = line
			.split("|")
			.slice(1, -1)
			.map((s) => s.trim());
		if (cells.length < 6) continue;
		// Skip header row
		if (cells[0]!.toLowerCase() === "video") continue;
		// Detect + skip separator row (---|---|---)
		if (cells.every((c) => /^-+$/.test(c))) {
			sawSeparator = true;
			continue;
		}
		if (!sawSeparator) continue;
		const views = parseLooseNumber(cells[1]!);
		const vsBaseline = parseLooseNumber(cells[2]!.replace("%", ""));
		const likes = parseLooseNumber(cells[3]!);
		const comments = parseLooseNumber(cells[4]!);
		const v = (cells[5] || "").toLowerCase();
		let verdict: Verdict = "Unknown";
		if (v.includes("hit")) verdict = "Hit";
		else if (v.includes("steady")) verdict = "Steady";
		else if (v.includes("miss")) verdict = "Miss";
		else if (v.includes("climb")) verdict = "Climbing";
		out.push({
			title: cells[0]!,
			views: views ?? 0,
			vsBaselinePct: vsBaseline,
			likes: likes ?? 0,
			comments: comments ?? 0,
			verdict,
		});
	}
	return out;
}

function parseReview(path: string, raw: string): YtReview {
	const fm: Record<string, string> = {};
	const fmMatch = raw.match(/^---\n([\s\S]*?)\n---\n/);
	if (fmMatch) {
		for (const line of fmMatch[1]!.split("\n")) {
			const m = line.match(/^(\w+):\s*(.*)$/);
			if (m) fm[m[1]!] = m[2]!.trim();
		}
	}
	const body = fmMatch ? raw.slice(fmMatch[0].length) : raw;

	const sections = new Map<string, string>();
	let cur = "_pre";
	let buf: string[] = [];
	for (const line of body.split("\n")) {
		const m = line.match(/^##\s+(.+?)\s*$/);
		if (m) {
			sections.set(cur, buf.join("\n").trim());
			cur = m[1]!;
			buf = [];
		} else {
			buf.push(line);
		}
	}
	sections.set(cur, buf.join("\n").trim());

	const tldr = extractBullets(sections.get("TL;DR") || "");

	const uploadsRaw = sections.get("Uploads this week") || "";
	const uploads = parseUploadTable(uploadsRaw);

	let baselineViews: number | null = null;
	let baselineLikes: number | null = null;
	const baselineMatch = uploadsRaw.match(
		/median\s+of\s+last\s+10\s+uploads\s*=\s*([\d,]+)\s+views,\s+([\d,]+)\s+likes/i,
	);
	if (baselineMatch) {
		baselineViews = parseInt(baselineMatch[1]!.replace(/,/g, ""), 10);
		baselineLikes = parseInt(baselineMatch[2]!.replace(/,/g, ""), 10);
	}

	let topPerformer: YtReview["topPerformer"] = null;
	let underperformer: YtReview["underperformer"] = null;
	for (const [key, val] of sections.entries()) {
		if (key.startsWith("Top performer")) {
			const m = key.match(/Top performer\s*[—-]\s*(.+)/);
			topPerformer = {
				title: m ? m[1]!.trim() : key,
				body: val,
			};
		}
		if (key.startsWith("Underperformer")) {
			const m = key.match(/Underperformer\s*[—-]\s*(.+)/);
			underperformer = {
				title: m ? m[1]!.trim() : key,
				body: val,
			};
		}
	}

	const channelSignal = extractBullets(
		sections.get("Channel-wide signal") || "",
	);
	const recommendations = extractBullets(
		sections.get("Recommended next 7 days") || "",
	);

	return {
		path,
		date: fm.date || "",
		window: fm.window || "",
		channel: fm.channel || "",
		tldr,
		uploads,
		baselineViews,
		baselineLikes,
		topPerformer,
		underperformer,
		channelSignal,
		recommendations,
	};
}
