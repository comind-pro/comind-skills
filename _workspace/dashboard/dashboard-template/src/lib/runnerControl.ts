import { App, FileSystemAdapter, Notice } from "obsidian";
import { spawn } from "child_process";

// Runner control from inside Obsidian.
//
// The dashboard plugin runs in Electron's renderer with Node integration, so it
// can spawn the runner daemon directly. The catch: a GUI-launched Obsidian has a
// minimal PATH (no node / claude). We launch through a LOGIN shell (`-lc`) so the
// user's profile is sourced and PATH matches what `make dashboard-runner` sees in
// a terminal — that's what lets the spawned runner find `node` and `claude`.

const RUNNER_PID_PATH = "_workspace/system/runner/runner.pid";

function vaultBasePath(app: App): string | null {
	const a = app.vault.adapter;
	return a instanceof FileSystemAdapter ? a.getBasePath() : null;
}

/** Resolve the runner script path: absolute, ~-expanded, or vault-relative. */
function resolveScript(base: string, p: string): string {
	let s = p.trim();
	if (s.startsWith("~/")) s = `${process.env.HOME || ""}/${s.slice(2)}`;
	if (s.startsWith("/")) return s;
	return `${base.replace(/\/$/, "")}/${s}`;
}

async function readPid(app: App): Promise<number | null> {
	try {
		if (!(await app.vault.adapter.exists(RUNNER_PID_PATH))) return null;
		const n = parseInt((await app.vault.adapter.read(RUNNER_PID_PATH)).trim(), 10);
		return Number.isInteger(n) ? n : null;
	} catch {
		return null;
	}
}

function spawnRunner(base: string, scriptRel: string): void {
	const scriptAbs = resolveScript(base, scriptRel);
	const shell = process.env.SHELL || "/bin/zsh";
	// Login shell (-l) sources the profile → full PATH. -c runs the command.
	const cmd = `COMIND_VAULT=${JSON.stringify(base)} node ${JSON.stringify(scriptAbs)}`;
	const child = spawn(shell, ["-lc", cmd], {
		cwd: base,
		detached: true,
		stdio: "ignore",
	});
	child.unref();
}

/** Start the runner if it isn't already alive (its own singleton lock no-ops a dup). */
export async function startRunner(app: App, scriptRel: string): Promise<boolean> {
	const base = vaultBasePath(app);
	if (!base) {
		new Notice("Dashboard: vault is not on the local filesystem — cannot start runner.");
		return false;
	}
	spawnRunner(base, scriptRel);
	new Notice("Runner starting…");
	return true;
}

/** Kill the current runner (if any) then start a fresh one. */
export async function restartRunner(app: App, scriptRel: string): Promise<boolean> {
	const base = vaultBasePath(app);
	if (!base) {
		new Notice("Dashboard: vault is not on the local filesystem — cannot start runner.");
		return false;
	}
	const pid = await readPid(app);
	if (pid !== null) {
		try {
			process.kill(pid, "SIGTERM");
		} catch {
			/* already dead — pidfile was stale */
		}
	}
	// Give the old process a beat to release its singleton pidfile before the new
	// one boots and runs its own alive-check.
	await new Promise((r) => setTimeout(r, 700));
	spawnRunner(base, scriptRel);
	new Notice(pid !== null ? "Runner restarting…" : "Runner starting…");
	return true;
}
