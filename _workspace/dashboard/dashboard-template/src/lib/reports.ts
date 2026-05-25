import type { App, TFile } from "obsidian";

export interface TrendingRepo {
	rank: number;
	owner: string;
	name: string;
	url: string;
	stars: string;
	language: string;
	description: string;
	aiDev: boolean;
}

export interface HeadlineItem {
	bold: string;
	body: string;
}

export interface ReportSnapshot<T> {
	sourcePath: string;
	dateLabel: string;
	items: T[];
}

const GITHUB_TRENDING_FOLDER = "inbox/research/github-trending";
const MORNING_REPORTS_FOLDER = "inbox/reports/morning";

function latestFileIn(app: App, folder: string): TFile | null {
	const af = app.vault.getAbstractFileByPath(folder);
	if (!af || !("children" in af)) return null;
	const candidates = (af as unknown as { children: TFile[] }).children.filter(
		(c) => "extension" in c && c.extension === "md" && !c.name.startsWith("_"),
	);
	if (candidates.length === 0) return null;
	candidates.sort((a, b) => b.name.localeCompare(a.name));
	return candidates[0] ?? null;
}

function dateFromFilename(name: string): string {
	const m = name.match(/(\d{4}-\d{2}-\d{2})/);
	return m?.[1] ?? name.replace(/\.md$/, "");
}

export async function readLatestGithubTrending(
	app: App,
): Promise<ReportSnapshot<TrendingRepo> | null> {
	const file = latestFileIn(app, GITHUB_TRENDING_FOLDER);
	if (!file) return null;
	const body = await app.vault.read(file);
	const repos = parseTrendingRepos(body);
	return {
		sourcePath: file.path,
		dateLabel: dateFromFilename(file.name),
		items: repos,
	};
}

export async function readLatestMorningHeadlines(
	app: App,
): Promise<ReportSnapshot<HeadlineItem> | null> {
	const file = latestFileIn(app, MORNING_REPORTS_FOLDER);
	if (!file) return null;
	const body = await app.vault.read(file);
	const items = parseHeadlines(body);
	return {
		sourcePath: file.path,
		dateLabel: dateFromFilename(file.name),
		items,
	};
}

export function parseTrendingRepos(md: string): TrendingRepo[] {
	const out: TrendingRepo[] = [];
	const blockRe =
		/^###\s+(\d+)\.\s+\[([^\]]+)\]\(([^)]+)\)(\s+\*\*\[AI\/DEV\]\*\*)?/gm;
	const matches: { rank: number; full: string; url: string; aiDev: boolean; idx: number }[] = [];
	let m: RegExpExecArray | null;
	while ((m = blockRe.exec(md)) !== null) {
		matches.push({
			rank: Number(m[1] ?? "0"),
			full: m[2] ?? "",
			url: m[3] ?? "",
			aiDev: Boolean(m[4]),
			idx: m.index,
		});
	}
	for (let i = 0; i < matches.length; i++) {
		const cur = matches[i];
		if (!cur) continue;
		const next = matches[i + 1];
		const blockEnd = next ? next.idx : md.length;
		const block = md.slice(cur.idx, blockEnd);
		const stars = (block.match(/\*\*Stars:\*\*\s*([0-9.,k]+)/i)?.[1] ?? "").trim();
		const lang = (block.match(/\*\*Language:\*\*\s*([A-Za-z+#.\-]+)/)?.[1] ?? "").trim();
		const desc = (block.match(/\*\*Description:\*\*\s*(.*)/m)?.[1] ?? "").trim();
		const parts = cur.full.split("/");
		const owner = parts.length > 1 ? (parts[0] ?? "") : "";
		const name = parts.length > 1 ? (parts[1] ?? cur.full) : cur.full;
		out.push({
			rank: cur.rank,
			owner,
			name,
			url: cur.url,
			stars,
			language: lang,
			description: desc,
			aiDev: cur.aiDev,
		});
	}
	return out;
}

export function parseHeadlines(md: string): HeadlineItem[] {
	const out: HeadlineItem[] = [];
	const sectionRe = /^##\s+Headlines\s*$/m;
	const start = md.search(sectionRe);
	if (start < 0) return out;
	const rest = md.slice(start);
	const endIdx = rest.slice(1).search(/^##\s+/m);
	const section = endIdx > 0 ? rest.slice(0, endIdx + 1) : rest;
	const lineRe = /^-\s+\*\*([^*]+)\*\*\s*[—-]?\s*(.*)$/gm;
	let m: RegExpExecArray | null;
	while ((m = lineRe.exec(section)) !== null) {
		const bold = (m[1] ?? "").trim();
		const body = (m[2] ?? "").trim();
		if (bold) out.push({ bold, body });
	}
	return out;
}
