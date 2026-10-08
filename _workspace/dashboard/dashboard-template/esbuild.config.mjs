import esbuild from "esbuild";
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// In-place infra build. The Makefile passes DASHBOARD_PLUGIN_DIR pointing at
// <project>/.obsidian/plugins/dashboard. A bare `npm run build` falls back to
// the same in-repo path (project root = 3 dirs up) — never a vault outside
// this repo. Standalone vaults: set DASHBOARD_PLUGIN_DIR.
const VAULT_PLUGIN_DIR =
  process.env.DASHBOARD_PLUGIN_DIR ||
  join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", ".obsidian", "plugins", "dashboard");
mkdirSync(VAULT_PLUGIN_DIR, { recursive: true });

const opts = {
  entryPoints: ["src/main.ts"],
  bundle: true,
  format: "cjs",
  target: "es2018",
  platform: "browser",
  external: ["obsidian", "electron", "child_process"],
  outfile: join(VAULT_PLUGIN_DIR, "main.js"),
  jsxFactory: "h",
  jsxFragment: "Fragment",
};

if (process.argv.includes("production")) {
  opts.minify = true;
  await esbuild.build(opts);
  console.log(`built → ${opts.outfile}`);
} else {
  const ctx = await esbuild.context(opts);
  await ctx.watch();
  console.log(`watching → ${opts.outfile}`);
}

copyFileSync("manifest.json", join(VAULT_PLUGIN_DIR, "manifest.json"));
copyFileSync("styles.css", join(VAULT_PLUGIN_DIR, "styles.css"));
