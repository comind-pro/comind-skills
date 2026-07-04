// Regression test for the IntentArgModal promise contract:
// EVERY close path (Cancel, X, backdrop, Obsidian Esc) must settle the
// askForArg promise exactly once — a pending promise freezes ActionBar's
// `busy` flag and disables every action button.
//
// Run: node scripts/test-intent-arg-modal.mjs
import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const templateDir = dirname(dirname(fileURLToPath(import.meta.url)));
const require = createRequire(import.meta.url);

// Minimal stub of the obsidian API surface the modal touches.
const stubPath = join(tmpdir(), "obsidian-stub-intent-arg.cjs");
writeFileSync(
	stubPath,
	`
class Modal {
	constructor(app) {
		this.app = app;
		const el = () => ({ addEventListener() {}, style: {}, onclick: null });
		this.contentEl = {
			empty() {},
			addClass() {},
			createEl: el,
			createDiv: () => ({ createEl: el }),
		};
	}
	open() { this.onOpen && this.onOpen(); }
	close() { this.onClose && this.onClose(); }
}
class Setting {
	constructor() { this.settingEl = { style: {} }; }
	addText(cb) {
		cb({
			setPlaceholder() { return this; },
			setValue() { return this; },
			inputEl: { style: {}, addEventListener() {}, focus() {}, select() {}, value: "" },
		});
		return this;
	}
}
class Notice {}
module.exports = { Modal, Setting, Notice, App: class {} };
`,
);

const outFile = join(tmpdir(), "intent-arg-modal-under-test.cjs");
execSync(
	`npx esbuild src/components/IntentArgModal.ts --bundle --format=cjs --platform=node ` +
		`--alias:obsidian=${stubPath} --outfile=${outFile}`,
	{ cwd: templateDir, stdio: "pipe" },
);
const { IntentArgModal } = require(outFile);

let fails = 0;
const check = (name, cond) => {
	console.log(`${cond ? "ok" : "FAIL"}: ${name}`);
	if (!cond) fails++;
};

// 1. External close (X / backdrop / Obsidian Esc) → resolves null.
{
	let val = "UNSET";
	const m = new IntentArgModal({}, "h", "p", "", (v) => (val = v));
	m.open();
	m.close();
	check("external close resolves null", val === null);
}

// 2. Double close → resolve fires exactly once.
{
	let n = 0;
	const m = new IntentArgModal({}, "h", "p", "", () => n++);
	m.open();
	m.close();
	m.close();
	check("double close resolves once", n === 1);
}

// 3. Submit with blank input → null, exactly once (submit then onClose).
{
	let n = 0;
	let val = "UNSET";
	const m = new IntentArgModal({}, "h", "p", "", (v) => {
		n++;
		val = v;
	});
	m.open();
	m["submit"]();
	check("blank submit resolves null once", n === 1 && val === null);
}

process.exit(fails ? 1 : 0);
