import type { App } from "obsidian";

export interface YtTrendingRow {
	title: string;
	creator: string;
	views: string;
	posted: string;
}

export interface MorningBrief {
	path: string;
	date: string;
	headlines: string[];
	ytTrending: YtTrendingRow[];
	xVoices: string[];
	contentOpportunities: string[];
	webCount: number;
	xVoicesCount: number;
	repoCount: number;
}

const DIR = "inbox/reports/morning";

export async function findLatestBrief(app: App): Promise<string | null> {
	if (!(await app.vault.adapter.exists(DIR))) return null;
	const listing = await app.vault.adapter.list(DIR);
	const mds = listing.files
		.filter((f) => f.endsWith(".md") && !f.endsWith("_index.md"))
		.sort();
	return mds.length === 0 ? null : mds[mds.length - 1]!;
}

export async function readLatestBrief(app: App): Promise<MorningBrief | null> {
	const path = await findLatestBrief(app);
	if (!path) return null;
	const raw = await app.vault.adapter.read(path);
	return parseBrief(path, raw);
}

function parseBrief(path: string, raw: string): MorningBrief {
	// Date — try frontmatter, then **Date:** line, then filename prefix
	let date = "";
	const fmMatch = raw.match(/^---\n([\s\S]*?)\n---\n/);
	if (fmMatch) {
		const dm = fmMatch[1]!.match(/^date:\s*(.+)$/m);
		if (dm) date = dm[1]!.trim();
	}
	if (!date) {
		const dm = raw.match(/\*\*Date:\*\*\s*(\S+)/);
		if (dm) date = dm[1]!.trim();
	}
	if (!date) {
		const fileM = path.match(/(\d{4}-\d{2}-\d{2})/);
		if (fileM) date = fileM[1]!;
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

	const findSection = (needle: string): string => {
		const lc = needle.toLowerCase();
		for (const [k, v] of sections.entries()) {
			if (k.toLowerCase().includes(lc)) return v;
		}
		return "";
	};

	const headlines = extractBullets(findSection("Headlines"));

	const oppsBody = findSection("Content Opportunities");
	const contentOpportunities = extractOpportunities(oppsBody);

	const ytBody = findSection("YouTube");
	const ytTrending = parseYtTable(ytBody);

	const xBody = findSection("X / Twitter") || findSection("X — ");
	const xVoices = extractXVoices(xBody);

	const webCount = countBullets(findSection("Web —")) ||
		countBullets(findSection("Web "));
	const xVoicesCount = xVoices.length || countBullets(xBody);
	const repoCount = countRepos(findSection("GitHub"));

	return {
		path,
		date,
		headlines,
		ytTrending,
		xVoices,
		contentOpportunities,
		webCount,
		xVoicesCount,
		repoCount,
	};
}

function parseYtTable(body: string): YtTrendingRow[] {
	const out: YtTrendingRow[] = [];
	let sawSeparator = false;
	for (const rawLine of body.split("\n")) {
		const line = rawLine.trim();
		if (!line.startsWith("|")) continue;
		const cells = line
			.split("|")
			.slice(1, -1)
			.map((s) => s.trim());
		if (cells.length < 4) continue;
		if (cells[0]!.toLowerCase() === "video") continue;
		if (cells.every((c) => /^-+$/.test(c))) {
			sawSeparator = true;
			continue;
		}
		if (!sawSeparator) continue;
		out.push({
			title: cells[0]!,
			creator: cells[1]!,
			views: cells[2]!,
			posted: cells[3]!,
		});
	}
	return out;
}

function extractXVoices(body: string): string[] {
	// Look for the "Top voices:" sub-bullet group first
	const lines = body.split("\n");
	const voices: string[] = [];
	let inVoices = false;
	for (const raw of lines) {
		const line = raw.trim();
		if (/^[-*]\s+\*\*Top voices:?\*\*/i.test(line)) {
			inVoices = true;
			continue;
		}
		if (inVoices) {
			if (/^[-*]\s+\*\*[A-Z]/.test(line)) {
				// next top-level bullet — stop
				if (!line.startsWith("  ") && !line.startsWith("\t")) break;
			}
			// nested bullet ("  - " or "    - ")
			const nested = line.match(
				/^\s*[-*]\s+\*\*([^*]+):?\*\*\s*[:—-]?\s*["“]?([^"”]*)["”]?\s*$/,
			);
			if (nested) {
				const who = nested[1]!.replace(/:$/, "").trim();
				const what = nested[2]!.trim();
				voices.push(what ? `${who}: ${what}` : who);
			}
		}
	}
	if (voices.length > 0) return voices;
	// Fallback: take top bullets in section
	return extractBullets(body)
		.slice(0, 3)
		.map((b) => b.replace(/\*\*([^*]+)\*\*/g, "$1").trim());
}

function extractBullets(body: string): string[] {
	return body
		.split("\n")
		.map((l) => l.trim())
		.filter((l) => l.startsWith("-") || l.startsWith("*"))
		.map((l) => l.replace(/^[-*]\s+/, ""));
}

function countBullets(body: string): number {
	return extractBullets(body).length;
}

function countRepos(body: string): number {
	// Best-effort — counts inline code-fenced repo refs like `owner/name` or bullets
	const ticks = body.match(/`[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+`/g);
	return ticks ? ticks.length : countBullets(body);
}

/**
 * Content Opportunities section uses numbered or bullet entries where each
 * "opportunity" is a bolded headline followed by a paragraph. Extract the
 * bolded headlines (trim quotes if present).
 */
function extractOpportunities(body: string): string[] {
	const out: string[] = [];
	for (const line of body.split("\n")) {
		const trimmed = line.trim();
		// Match bullet/numbered lines whose visible content starts with bold
		const m = trimmed.match(/^[-*0-9.]+\s+\*\*([^*]+)\*\*/);
		if (m) {
			out.push(m[1]!.replace(/^["“]|["”]$/g, "").trim());
		}
	}
	// Fall-back: bullets without bold but starting with quote
	if (out.length === 0) {
		for (const line of body.split("\n")) {
			const m = line.trim().match(/^[-*]\s+["“]([^"”]+)["”]/);
			if (m) out.push(m[1]!.trim());
		}
	}
	return out;
}
