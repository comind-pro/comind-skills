import type { App } from "obsidian";

export const QUEUE_DIR = "system/queue";
export const RUNS_DIR = "system/runs";

export interface Intent {
	id: string;
	ts: string;
	skill: string;
	args: Record<string, unknown>;
	from: "plugin";
}

export type RunStatus = "running" | "ok" | "error";

export interface RunRecord {
	id: string;
	skill: string;
	args: Record<string, unknown>;
	ts_queued: string;
	ts_started: string;
	ts_completed: string | null;
	status: RunStatus;
	exit_code: number | null;
	summary: string;
	log_path: string;
	md_path?: string;
	deliverable_path?: string | null;
}

function genUuid(): string {
	// crypto.randomUUID is available in Electron's renderer (Obsidian).
	if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
		return crypto.randomUUID();
	}
	// Fallback — RFC4122 v4ish.
	return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
		const r = (Math.random() * 16) | 0;
		const v = c === "x" ? r : (r & 0x3) | 0x8;
		return v.toString(16);
	});
}

export async function writeIntent(
	app: App,
	skill: string,
	args: Record<string, unknown> = {},
): Promise<string> {
	const id = genUuid();
	const intent: Intent = {
		id,
		ts: new Date().toISOString(),
		skill,
		args,
		from: "plugin",
	};
	if (!(await app.vault.adapter.exists(QUEUE_DIR))) {
		await app.vault.adapter.mkdir(QUEUE_DIR);
	}
	await app.vault.adapter.write(
		`${QUEUE_DIR}/${id}.json`,
		JSON.stringify(intent, null, 2) + "\n",
	);
	return id;
}

export async function listRecentRuns(app: App, limit = 8): Promise<RunRecord[]> {
	if (!(await app.vault.adapter.exists(RUNS_DIR))) return [];
	const listing = await app.vault.adapter.list(RUNS_DIR);
	const jsonFiles = listing.files.filter((f) => f.endsWith(".json"));
	const records: RunRecord[] = [];
	for (const f of jsonFiles) {
		try {
			const raw = await app.vault.adapter.read(f);
			records.push(JSON.parse(raw) as RunRecord);
		} catch {
			continue;
		}
	}
	records.sort((a, b) => {
		const aTs = a.ts_completed || a.ts_started;
		const bTs = b.ts_completed || b.ts_started;
		return bTs.localeCompare(aTs);
	});
	return records.slice(0, limit);
}

export async function readRun(
	app: App,
	id: string,
): Promise<RunRecord | null> {
	const path = `${RUNS_DIR}/${id}.json`;
	if (!(await app.vault.adapter.exists(path))) return null;
	try {
		return JSON.parse(await app.vault.adapter.read(path)) as RunRecord;
	} catch {
		return null;
	}
}
