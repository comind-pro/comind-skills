#!/usr/bin/env node
// Validate a dashboard.config.json against the plugin's schema.
//
//   node scripts/validate-config.mjs [path]     (or: npm run validate:config)
//
// Config path resolution, first hit wins:
//   1. explicit CLI arg (resolved from cwd)
//   2. $COMIND_VAULT/_workspace/system/dashboard.config.json
//   3. walk up from cwd until a dir contains _workspace/system/dashboard.config.json
//      (covers both the template repo and a plugin copied into a vault)
// Exit 0 + "OK" on success; exit 1 with one error per line otherwise.
//
// Single source of truth: src/lib/config.ts (dependency-free) is bundled on
// the fly with esbuild and imported — no re-implemented checks here.

import { build } from "esbuild";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const templateDir = dirname(dirname(fileURLToPath(import.meta.url)));

function findConfigPath() {
	if (process.argv[2]) return resolve(process.cwd(), process.argv[2]);
	if (process.env.COMIND_VAULT) {
		return join(
			process.env.COMIND_VAULT,
			"_workspace",
			"system",
			"dashboard.config.json",
		);
	}
	for (let dir = process.cwd(); ; dir = dirname(dir)) {
		const candidate = join(dir, "_workspace", "system", "dashboard.config.json");
		if (existsSync(candidate)) return candidate;
		if (dirname(dir) === dir) return null; // hit filesystem root
	}
}

const configPath = findConfigPath();
if (!configPath) {
	console.error(
		"no _workspace/system/dashboard.config.json found above cwd — " +
			"pass the config path explicitly (node scripts/validate-config.mjs <path>) " +
			"or set COMIND_VAULT to your vault root",
	);
	process.exit(1);
}

const tmp = mkdtempSync(join(tmpdir(), "dash-validate-"));
let validateConfig;
try {
	const bundled = join(tmp, "config.mjs");
	await build({
		entryPoints: [join(templateDir, "src", "lib", "config.ts")],
		bundle: true,
		format: "esm",
		platform: "node",
		outfile: bundled,
		logLevel: "silent",
	});
	({ validateConfig } = await import(pathToFileURL(bundled).href));
} finally {
	// The module is already loaded into memory; the temp dir can go.
	rmSync(tmp, { recursive: true, force: true });
}

let raw;
try {
	raw = JSON.parse(readFileSync(configPath, "utf8"));
} catch (e) {
	console.error(`${configPath}: ${e.message ?? e}`);
	process.exit(1);
}

const { errors } = validateConfig(raw);
if (errors.length > 0) {
	for (const line of errors) console.error(line);
	process.exit(1);
}
console.log("OK");
