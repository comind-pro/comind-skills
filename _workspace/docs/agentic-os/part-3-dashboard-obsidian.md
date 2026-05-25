---
title: "Agentic OS — Part 3 · Dashboard (Obsidian path)"
type: doc
audience: dual (human follow-along + Claude Code as pair-builder)
origin: chase-ai masterclass (adapted)
---

# Build Your Own Agentic OS (Part 3 · Path B — Obsidian)

> **Where this fits.** Part 1 is `part-1-skill-architecture.md` (build the skills).
> This is Part 3, the observability dashboard. The template's operational,
> boilerplate-adapted version of this guide — the one the `dashboard-build` skill
> pulls — is `_workspace/references/dashboard-build-guide.md`, and the build code is
> vendored at `_workspace/dashboard/`. This doc is the original masterclass
> instruction set the reference was derived from.

You built skills in Part 1, set up the Obsidian memory layer in Part 2. This is Part 3 — the observability dashboard. Two paths: **Obsidian (this one)** for an Obsidian-native plugin (more customizable, solo-operator friendly), or **Streamlit** (see `part-3-dashboard-streamlit.md`) for a distribution-ready local-web dashboard. Pick one; either works for the masterclass.

A working template for a personal agentic operating system that lives inside Obsidian. You'll end up with: a markdown vault that doubles as your memory, a custom Obsidian plugin that surfaces the metrics + actions you care about, a background daemon that turns button clicks into headless Claude Code skill invocations, and a set of customizable skills wired to your workflow.

The pattern is universal. The specifics are yours to customize. This guide walks you through the universal scaffold AND the swap-points where your domain shapes the build.

---

## What this is — and what it isn't

**This is a template.** The reference implementation it's based on belongs to a content creator who tracks YouTube / Instagram / TikTok metrics and runs content-cascade automations. Most of that is irrelevant to you unless you do the same thing. The **pattern** survives; the **specifics** swap.

**Universal pattern (same for everyone):**
- Karpathy 3-stage vault folders (staging → working → output) + knowledge zone + plumbing
- A frozen daily-note schema that acts as the parser contract between every writer
- An Obsidian plugin shell (Preact + esbuild + Hot Reload) that reads the vault and surfaces a dashboard pane
- A Node daemon that watches a queue of intent files and spawns headless `claude -p` subprocesses
- Anthropic MCP connectors for Gmail / Calendar / Drive (one-click OAuth)
- A PostToolUse hook that logs Claude's tool calls into your daily note
- Bases sidebar queries driven by frontmatter taxonomy

**Customizable swap-points (yours):**
- Which metrics you track (and how you pull them)
- Which skills your dashboard's ActionBar invokes
- Your aesthetic palette (the reference uses dark warm; yours can be anything)
- Your folder model overrides if the default doesn't fit your work

---

## How to use this guide

There are two ways to follow this guide.

**As a human checklist:** Read it end-to-end. Treat each `[ACTION]` block as a thing you do, each `[VERIFY]` block as a thing you check, and each `[FIX]` block as a fallback if your verify fails.

**As a Claude Code prompt (recommended):** Open this guide in your editor. Open a Claude Code session in an empty parent directory you'll use as your vault root. Paste this entire guide into the session with the prefix:

> "Help me build my personal agentic OS by following this guide. Start at Phase 0 and interview me. Pause for confirmation between phases. Don't skip the `[VERIFY]` checks. If a verify fails, branch into the `[FIX]` block and ask me before proceeding."

That turns Claude into your second pair of hands. The video walks you through what each phase looks like and why it exists; Claude executes the steps and verifies them with you in real-time.

---

## Phase 0 — Customization Interview

**Goal:** Capture the user's domain and customization choices BEFORE any code is written. These choices fill the `$VARIABLES` referenced throughout later phases.

> [ACTION] **Claude: run this interview verbatim with the user. Wait for each answer before moving to the next question. Capture all answers in a single summary block at the end. Don't proceed to Phase 1 until the user has confirmed the summary.**

### Interview script

**Q1 — Domain.**
"What kind of work do you want this dashboard to serve? Pick one and describe in a sentence: content creator / indie developer / founder running a business / researcher / personal productivity / something else?"

→ Store as `$DOMAIN`.

**Q2 — Metrics.**
"What 3-5 numbers do you want at a glance every day? Anything pullable counts — REST API metrics, scraped public counts, local file counts, manual entries. Examples: GitHub stars, newsletter subscribers, Stripe MRR, Strava miles, books read, tickets closed, words written."

→ For each metric, capture name + source type (api / scrape / local / manual). Store as `$METRICS = [{name, source_type, source_detail}, ...]`.

**Q3 — Skills / routines.**
"Which state are you in?
  (A) Just built skills in masterclass Part 1 → paste me the list of
      skill names + one-line descriptions. I'll wire those.
  (B) Have existing skills from before → run `ls ~/.claude/skills/` +
      paste output. I'll wire what makes sense as dashboard buttons.
  (C) No skills yet → describe the recurring tasks you want as
      one-click buttons. Examples: 'morning briefing', 'plan today',
      'weekly review', 'draft blog post from notes', 'triage GitHub
      issues'. I'll scaffold matching skills in Phase 7."

→ Store as `$SKILLS = [{name, trigger, description}, ...]`.
→ Remember which branch (A/B/C) — Phase 7 behavior differs:
  - A/B: write SKILL.md files matching existing skill names
  - C: scaffold new SKILL.md files from scratch using the 4 archetypes

**Q4 — Inbox triage.**
"Do you want the dashboard to triage your email? (yes → we'll wire MCP Gmail / no → we'll skip Gmail entirely)

Heads-up on what MCP Gmail can and can't do: it can read + draft, NOT autonomous-send. So the inbox-brief skill can scan your inbox, categorize messages, and draft replies — but YOU click Send in Gmail. If you wanted full autonomous send-on-your-behalf, that's a different setup (Google Workspace CLI path, more friction) and isn't covered here. Most members are fine with draft-only — say yes."

→ Store as `$WANT_GMAIL` boolean.

**Q5 — Calendar.**
"Do you want today's calendar surfaced in the dashboard? (yes → MCP Google Calendar / no → skip)"

→ Store as `$WANT_CALENDAR` boolean.

**Q6 — Folder model.**
"Default is the Karpathy 3-stage model: `inbox/` for staging, `projects/` for active work, `content/` for shipped output. Works well if you do creative or research work that produces shippable artifacts. If your work doesn't fit that shape, describe what would fit better."

→ Store as `$FOLDER_MODEL` (default `karpathy` or custom spec).

**Q7 — Aesthetic.**
"Default palette is dark warm (Near Black `#0e0f10` + Terracotta `#c96442` + JetBrains Mono). Pick: keep default / pick a different palette / I'll guide my own."

→ Store as `$PALETTE = {bg, fg, accent, font}`.

**Q8 — Operating system.**
"This guide is written for Windows 10/11. macOS and Linux work but require some path + script adaptations. Which are you on?"

→ Store as `$OS` (`windows` / `macos` / `linux`).

### Confirmation summary

After all answers, Claude must produce this summary and ask: "Confirm these choices before we build? Any tweaks?"

```
Domain:        $DOMAIN
Metrics:       $METRICS
Skills:        $SKILLS
Gmail wired:   $WANT_GMAIL
Calendar:      $WANT_CALENDAR
Folder model:  $FOLDER_MODEL
Palette:       $PALETTE
OS:            $OS
```

> [VERIFY] User explicitly confirms summary. If user wants to change anything, loop back to that question.

> [FIX] If user is unsure on any answer, suggest sensible defaults from the reference dashboard and let them edit later. Don't block on perfect answers — this is a template, not a contract.

---

## Pre-flight check

**Goal:** Verify the user's machine has the prerequisites.

> [ACTION] **Claude: run each of these commands, report the version, and flag anything missing.**

```bash
node --version          # need v20+
npm --version           # need v10+
python --version        # need 3.11+
git --version           # any recent
```

Then check for Claude Code CLI:

```bash
claude --version        # any recent
```

Then check Obsidian:
- Is Obsidian installed? If not, install from https://obsidian.md before continuing.
- **Obsidian version must be 1.9.10+** (Bases is core from that release — Phase 9 requires it). Check via Help → About. If older, update before continuing.
- Note the path to your future vault root (e.g. `~/the-vault`). All paths below assume vault root is `~/the-vault`. Substitute your own.

> [VERIFY] All five tools respond with a version. Obsidian is 1.9.10+.

> [FIX] If Node or Python is missing, install via your OS package manager (winget on Windows, brew on macOS, apt/dnf on Linux). If Claude Code CLI is missing, follow https://docs.claude.com/en/docs/agents-and-tools/claude-code/install — needs an Anthropic API key.

---

## Phase 0.5 — Clone the companion repo

**Goal:** Pull down the code companion. Every subsequent phase that needs orchestration plumbing references files from this repo.

> [ACTION] **Claude: clone the repo into a working directory the user picks (default `~/projects/`). DO NOT clone into the vault — this is source code, separate from the vault's content.**

```bash
mkdir -p ~/projects
git clone https://github.com/cth9191/agentic-os-runner.git ~/projects/agentic-os-runner
```

> [VERIFY] `ls ~/projects/agentic-os-runner/` shows `runner/`, `hooks/`, `metric-scripts/`, `README.md`, `LICENSE`.

The repo contains:
- `runner/` — Node daemon + Windows/Unix launchers + package.json
- `hooks/` — PostToolUse activity-log hook + Claude settings snippet
- `metric-scripts/` — Shared helper + 3 metric-pull templates (API / scrape / local) + run-all wrappers

Whenever a later phase says "copy `<path>` from the repo," it refers to this clone.

> [FIX] If `git clone` fails with auth error, the repo is public — no auth needed. Check your network. If it fails with `git: command not found`, install git first.

---

## Phase 1 — Vault skeleton

**Goal:** Build the folder structure that holds memory. Three stages + utilities.

> [ACTION] **Claude: create these folders. Use `$FOLDER_MODEL` from Phase 0 — if `karpathy`, use this layout exactly. If custom, adapt while preserving the four-zone split: staging / working / output / knowledge. Pick the OS-matching block below.**

**macOS / Linux (bash):**

```bash
mkdir -p ~/the-vault/{inbox,projects,content,wiki,daily-notes,ops,system,_archive-vault}
mkdir -p ~/the-vault/inbox/{notes,research,reports,personal,demo-assets,archive}
mkdir -p ~/the-vault/inbox/reports/{morning,weekly,cascades,inbox-briefs,plan-tomorrow,vault-cleanup,metrics}
mkdir -p ~/the-vault/system/{schemas,templates,metrics,queue,runs,bases,dashboards}
mkdir -p ~/the-vault/.claude/skills
```

**Windows (PowerShell):**

```powershell
$vault = "$env:USERPROFILE\the-vault"
"inbox","projects","content","wiki","daily-notes","ops","system","_archive-vault" | % { New-Item -ItemType Directory -Force "$vault\$_" | Out-Null }
"notes","research","reports","personal","demo-assets","archive" | % { New-Item -ItemType Directory -Force "$vault\inbox\$_" | Out-Null }
"morning","weekly","cascades","inbox-briefs","plan-tomorrow","vault-cleanup","metrics" | % { New-Item -ItemType Directory -Force "$vault\inbox\reports\$_" | Out-Null }
"schemas","templates","metrics","queue","runs","bases","dashboards" | % { New-Item -ItemType Directory -Force "$vault\system\$_" | Out-Null }
New-Item -ItemType Directory -Force "$vault\.claude\skills" | Out-Null
```

Then create the vault conventions doc.

> [ACTION] Write `~/the-vault/CLAUDE.md` with the vault conventions. Use this template — adapt the Tools / About sections to user's domain.

```markdown
# Vault Conventions

> **Why a fixed structure.** At thousands of notes, an agent that has to glob the
> whole vault to find anything burns tokens fast. A logical layout + per-folder
> index files let Claude navigate by reading one small index instead of scanning
> the tree. Structure is a token-budget tool, not bureaucracy.

## Vault Structure

Mental model — Karpathy 3-stage: `inbox → projects → content` (staging → working → output) plus `wiki` for evergreen distillation + utility folders.

- `inbox/` — Stage 1 staging (raw, unstructured capture)
- `projects/` — Stage 2 working (frontmatter `status:` required)
- `content/` — Stage 3 output (finished, shippable)
- `wiki/` — Evergreen distilled knowledge (internal reports)
- `daily-notes/` — Schema-locked daily rhythm
- `ops/` — Business operations
- `system/` — Machine-readable plumbing
- `_archive-vault/` — Cold storage

## Index files

Every folder has an `_index.md` (table of contents) naming what lives there and
its conventions. Read the index first when navigating — it's cheaper than globbing.
When you add a note to a folder, update that folder's `_index.md`.

## Obsidian file format (write notes this way)

- **Wikilinks** — short-form `[[filename]]` between notes. Link liberally; the
  graph view + backlinks depend on it, and isolated notes are dead weight.
- **Embeds** — `![[other-note]]` to transclude a note, `![[other-note#Heading]]`
  for a section. Use embeds to compose (e.g. a weekly review embedding daily notes)
  instead of copy-pasting.
- **Tags** — `#area/topic` in frontmatter (`tags: [...]`) or inline. Use a small,
  consistent tag vocabulary so Bases/search stay useful.
- **Frontmatter** — every note opens with YAML (`type`, `date`, `tags` minimum).
  Bases queries read frontmatter, not inline text.
- File names `YYYY-MM-DD-slug.md` (lowercase, hyphens). Wiki articles use slug only.
- Brain dumps split: tasks → `projects/`, ideas → `inbox/notes/`, research → `inbox/research/`.

## Frontmatter status taxonomy (projects/)

| value | meaning |
|---|---|
| active | working right now |
| in-progress | started, paused |
| blocked | waiting on external |
| done | finished, kept |
| archived | finished + demoted |
```

Then create the root index.

> [ACTION] Write `~/the-vault/_index.md`:

```markdown
# Vault — top-level map

- [[CLAUDE]] — conventions
- inbox/ — staging
- projects/ — working
- content/ — output
- wiki/ — knowledge
- daily-notes/ — daily rhythm
- ops/ — business ops
- system/ — plumbing
```

Then drop a per-folder index into each top-level content folder.

> [ACTION] Write a minimal `_index.md` in `inbox/`, `projects/`, `content/`, and `wiki/`. Each names what lives in that folder + its local conventions, so Claude reads one small file instead of globbing the directory. Template:

```markdown
---
type: index
tags: [moc]
---

# <folder> — index

What lives here: <one line>. Convention: <filename pattern, required frontmatter>.

<!-- list notable notes as [[wikilinks]]; keep updated when you add files -->
```

Keep each `_index.md` updated as you add notes to that folder — a stale index costs more than no index.

> [VERIFY] Run `ls ~/the-vault/` and confirm 8 folders + 2 root `.md` files (CLAUDE.md + _index.md), and that `inbox/`, `projects/`, `content/`, `wiki/` each contain an `_index.md`.

> [FIX] If a mkdir failed, check parent directory write permissions. On Windows, ensure no path contains `OneDrive` redirects.

> [VERIFY] Open the vault root in Obsidian: File → Open vault → pick `~/the-vault`. Confirm sidebar shows 8 folders + 2 root docs.

---

## Phase 2 — Daily-note schema (the parser contract)

**Goal:** Lock the daily-note format. Every writer (skills, hooks, plugin) and every reader (plugin) honors this contract. Schema-first discipline is what lets all the pieces compose without coordinating.

> [ACTION] Write `~/the-vault/system/schemas/daily-note.md`:

```markdown
---
schema: daily-note
schema_version: 1
status: frozen
---

# Daily Note Schema

## File

- Location: `daily-notes/`
- Filename: `YYYY-MM-DD.md`
- Encoding: UTF-8

## Frontmatter

```yaml
date: YYYY-MM-DD
schema_version: 1
focus: ""
top3: ["", "", ""]
top3_done: [false, false, false]
effort: null
focus_blocks: null
posts_shipped: {}
videos_shipped_today: 0
```

## Body — exact section order, exact headings

```
# YYYY-MM-DD
## Current Focus
## Top 3 Priorities
## Schedule
## Daily Drivers
## Activity Log
## Notes
## EOD Reflection
```

Parser rules:
- Heading match is EXACT. Renaming any heading = parser miss = empty card.
- Top 3 items match `/^\d+\. \[([ x])\] (.+)$/`. Position = index into `top3_done`.
- Daily Drivers match the same regex without positional index.
- Schedule lines match `/^- (\d{2}:\d{2}) — (.+)$/`.
```

> [ACTION] Write `~/the-vault/system/templates/daily.md` — Templater template that creates a new daily note from this schema.

```markdown
---
date: 2026-05-13
schema_version: 1
focus: ""
top3: ["", "", ""]
top3_done: [false, false, false]
effort: null
focus_blocks: null
posts_shipped: {}
videos_shipped_today: 0
---

# 2026-05-13

## Current Focus


## Top 3 Priorities
1. [ ]
2. [ ]
3. [ ]

## Schedule

## Daily Drivers
- [ ] $DAILY_DRIVER_1
- [ ] $DAILY_DRIVER_2
- [ ] $DAILY_DRIVER_3

## Activity Log

## Notes

## EOD Reflection
```

Replace `$DAILY_DRIVER_*` with the user's recurring daily checklist items (from Phase 0 Q3, or sensible defaults like "Inbox triage", "Daily review", "Weekly priority block").

> [VERIFY] Open one of those files in Obsidian. Confirm renders cleanly + frontmatter is parsed.

> [FIX] If frontmatter shows as raw text in the body, you have a YAML syntax issue — usually a stray quote or wrong indentation. Validate at https://yamlchecker.com.

---

## Phase 3 — Plugin scaffold (Preact + esbuild)

**Goal:** Create the Obsidian plugin that renders the dashboard. We'll bootstrap a minimal version now; aesthetic + cards come in later phases.

> [ACTION] Clone the Obsidian sample plugin:

```bash
git clone https://github.com/obsidianmd/obsidian-sample-plugin ~/projects/my-dashboard
cd ~/projects/my-dashboard
```

> [ACTION] Replace its `package.json` deps with Preact + esbuild + Obsidian's API:

```json
{
  "name": "my-dashboard",
  "version": "0.0.1",
  "main": "main.js",
  "scripts": {
    "build": "tsc -noEmit -skipLibCheck && node esbuild.config.mjs production"
  },
  "devDependencies": {
    "@types/node": "^20",
    "esbuild": "^0.21",
    "obsidian": "latest",
    "preact": "^10",
    "typescript": "^5"
  }
}
```

> [ACTION] Configure `esbuild.config.mjs` to write directly into the vault's plugin folder (so Hot Reload picks up changes without manual copy):

```javascript
import esbuild from "esbuild";
import { copyFileSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

// Node string literals don't expand ~ — resolve via os.homedir().
// If your vault lives elsewhere, hardcode the absolute path here.
const VAULT_PLUGIN_DIR = join(homedir(), "the-vault", ".obsidian", "plugins", "my-dashboard");
mkdirSync(VAULT_PLUGIN_DIR, { recursive: true });

const opts = {
  entryPoints: ["src/main.ts"],
  bundle: true,
  format: "cjs",
  target: "es2018",
  platform: "browser",
  external: ["obsidian", "electron"],
  outfile: join(VAULT_PLUGIN_DIR, "main.js"),
  jsxFactory: "h",
  jsxFragment: "Fragment",
};

if (process.argv.includes("production")) {
  opts.minify = true;
  await esbuild.build(opts);
} else {
  const ctx = await esbuild.context(opts);
  await ctx.watch();
}

copyFileSync("manifest.json", join(VAULT_PLUGIN_DIR, "manifest.json"));
copyFileSync("styles.css", join(VAULT_PLUGIN_DIR, "styles.css"));
```

> [ACTION] Write `src/main.ts` — the plugin entrypoint:

```typescript
import { Plugin, ItemView, WorkspaceLeaf } from "obsidian";
import { h, render } from "preact";
import { Dashboard } from "./components/Dashboard";

const VIEW_TYPE = "my-dashboard";

class DashboardView extends ItemView {
  constructor(leaf: WorkspaceLeaf, private plugin: MyDashboard) {
    super(leaf);
  }
  getViewType() { return VIEW_TYPE; }
  getDisplayText() { return "Command Center"; }
  async onOpen() {
    render(h(Dashboard, { plugin: this.plugin }), this.contentEl);
  }
  async onClose() {
    render(null, this.contentEl);
  }
}

export default class MyDashboard extends Plugin {
  async onload() {
    this.registerView(VIEW_TYPE, leaf => new DashboardView(leaf, this));
    this.addRibbonIcon("layout-dashboard", "Open Command Center", () => {
      this.activateView();
    });
    this.addCommand({
      id: "open-dashboard",
      name: "Open Command Center",
      callback: () => this.activateView(),
    });
  }
  async activateView() {
    const { workspace } = this.app;
    let leaf = workspace.getLeavesOfType(VIEW_TYPE)[0];
    if (!leaf) {
      leaf = workspace.getLeaf("tab");
      await leaf.setViewState({ type: VIEW_TYPE });
    }
    workspace.revealLeaf(leaf);
  }
}
```

> [ACTION] Write `src/components/Dashboard.tsx` — minimal placeholder:

```tsx
import { h } from "preact";

export function Dashboard({ plugin }: { plugin: any }) {
  return (
    <div style={{ padding: 24 }}>
      <h1>Command Center</h1>
      <p>Dashboard boots. Phase 11 replaces this placeholder with the full HUD — metric cards, action bar, daily-note panel, activity feed.</p>
    </div>
  );
}
```

> [ACTION] Install Obsidian's [Hot Reload](https://github.com/pjeby/hot-reload) plugin (drop into `~/the-vault/.obsidian/plugins/hot-reload/`, enable in Community Plugins).

> [ACTION] Build the plugin:

```bash
cd ~/projects/my-dashboard
npm install
npm run build
```

> [VERIFY] In Obsidian → Settings → Community Plugins → enable "My Dashboard". Click the ribbon dashboard icon. Confirm pane opens with "Command Center" header.

> [FIX] If the plugin doesn't appear in Community Plugins, check that `manifest.json` landed in `~/the-vault/.obsidian/plugins/my-dashboard/`. If yes but still missing, restart Obsidian.

---

## Phase 4 — Metrics-pull skill (your domain's numbers)

**Goal:** Build the skill that refreshes the metrics CSV every 6 hours and on-demand. ONE skill, multiple source scripts — one per `$METRIC` from Phase 0.

### Copy the scaffolding from the companion repo

> [ACTION] Drop the shared helper + the run-all wrappers from the cloned repo into the skill's scripts folder.

```bash
mkdir -p ~/.claude/skills/metrics-pull/scripts
cp ~/projects/agentic-os-runner/metric-scripts/_common.py ~/.claude/skills/metrics-pull/scripts/
cp ~/projects/agentic-os-runner/metric-scripts/run_all.ps1 ~/.claude/skills/metrics-pull/scripts/    # Windows
cp ~/projects/agentic-os-runner/metric-scripts/run_all.sh ~/.claude/skills/metrics-pull/scripts/     # macOS / Linux
chmod +x ~/.claude/skills/metrics-pull/scripts/run_all.sh                                            # macOS / Linux
```

Now also pull down the three pull-script TEMPLATES — you'll copy + customize one per metric:

```bash
cp ~/projects/agentic-os-runner/metric-scripts/pull_template_api.py ~/.claude/skills/metrics-pull/scripts/
cp ~/projects/agentic-os-runner/metric-scripts/pull_template_scrape.py ~/.claude/skills/metrics-pull/scripts/
cp ~/projects/agentic-os-runner/metric-scripts/pull_template_local.py ~/.claude/skills/metrics-pull/scripts/
```

### Customize one script per metric

> [ACTION] **Claude: for each metric in `$METRICS` from Phase 0, do this:**

1. Copy the matching template to a real filename:
   - `source_type: api` → `cp pull_template_api.py pull_<metricname>.py`
   - `source_type: scrape` → `cp pull_template_scrape.py pull_<metricname>.py`
   - `source_type: local` → `cp pull_template_local.py pull_<metricname>.py`

2. Open the new file and fill in the customization block at the top:
   - `SOURCE` — bucket name (e.g. `github`, `stripe`, `strava`)
   - `METRIC` — specific metric (e.g. `stars_total`, `mrr_usd`, `miles_this_week`)
   - API URL / regex / file path appropriate to the source type
   - Env var names that hold credentials (e.g. `GITHUB_TOKEN`, `STRAVA_HANDLE`)

3. Each template includes inline comments explaining exactly what to change. The boilerplate (env loading, CSV write, snapshot update, error handling) stays untouched.

> [ACTION] Delete the unused templates after customization to keep the scripts folder clean.

### Skill definition

> [ACTION] Write `~/.claude/skills/metrics-pull/SKILL.md`:

```markdown
---
name: metrics-pull
description: "Pull all dashboard metrics. Append rows to system/metrics/metrics.csv + update last-pull.json snapshot. Trigger phrases: 'pull metrics', '/metrics-pull', 'refresh dashboard data'."
---

Pulls every metric source in parallel via `scripts/run_all.ps1`. Each source script writes its own status (ok / error). Append-only — CSV grows over time, never rewrites.
```

### Credentials

> [ACTION] Create `~/.claude/.env` with the credentials each metric needs:

```
# API keys + handles for metric pulls
$METRIC_API_KEY=...
$METRIC_HANDLE=...
```

> [VERIFY] Run one script manually: `python ~/.claude/skills/metrics-pull/scripts/pull_<metric>.py`. Check `~/the-vault/system/metrics/metrics.csv` has a new row + `last-pull.json` has the source listed with `status: ok`.

> [FIX] If `status: error`, read the error string from `last-pull.json` — usually a missing env var or wrong API endpoint. Common: rate-limit (429), bad auth (401), wrong field in JSON response.

### Schedule the cron

> [ACTION] On Windows, register a 6-hour Task Scheduler entry:

```powershell
schtasks /create /tn "My Metrics Pull" /tr "powershell.exe -NoProfile -ExecutionPolicy Bypass -File C:\Users\$env:USERNAME\.claude\skills\metrics-pull\scripts\run_all.ps1" /sc HOURLY /mo 6 /ru "%USERNAME%"
```

macOS/Linux: write a crontab entry `0 */6 * * * /path/to/run_all.sh`.

> [VERIFY] `schtasks /query /tn "My Metrics Pull"` (Windows) or `crontab -l` (macOS/Linux) shows the entry.

---

## Phase 5 — Runner daemon (button-click → headless claude -p)

**Goal:** A Node daemon that watches `system/queue/`, picks up intent JSON files (written by the plugin), spawns `claude -p` subprocesses to invoke the requested skill, and writes runs back to `system/runs/`.

### Copy the runner from the companion repo

> [ACTION] Install the runner files from the cloned repo:

```bash
mkdir -p ~/.claude/agentic-os-runner
cp ~/projects/agentic-os-runner/runner/runner.js ~/.claude/agentic-os-runner/
cp ~/projects/agentic-os-runner/runner/package.json ~/.claude/agentic-os-runner/
cp ~/projects/agentic-os-runner/runner/start-runner.vbs ~/.claude/agentic-os-runner/   # Windows
cp ~/projects/agentic-os-runner/runner/start-runner.sh ~/.claude/agentic-os-runner/    # macOS / Linux
chmod +x ~/.claude/agentic-os-runner/start-runner.sh                                   # macOS / Linux
```

### Tell the runner where your vault lives

The runner resolves the vault root via this priority order: `AGENTIC_OS_VAULT` environment variable → `AGENTIC_OS_VAULT` entry in `~/.claude/.env` → fallback `~/the-vault`. If your vault is at the fallback, no action needed. Otherwise:

> [ACTION] Add a line to `~/.claude/.env`:

```
AGENTIC_OS_VAULT=/absolute/path/to/your-vault
```

> [ACTION] Skim `runner.js` once for context. Key constants near the top:

- `MAX_CONCURRENT = 3` — how many parallel skills can run at once. Bump up if you're patient and run lots of long skills; drop to 1 to serialize everything.
- `SERIAL_SKILLS` — skills that share a single slot among themselves (write to the same daily-note or wiki-index, so racing would corrupt). Default set includes `plan-today`, `plan-tomorrow`, `refresh-schedule`, `close-day`, `harvest`. Add your own daily-note writers here.
- `DEDUPE_SKILLS` — skills where a second concurrent run is a no-op. Default `metrics-pull`. Add yours if applicable.
- `AUTONOMOUS_PREFIX` — the prompt prefix every headless skill invocation gets. Tells the spawned Claude session "don't ask, just do."

The `deliverablePathFor()` and `buildPrompt()` switches map each skill name to where it saves output + what prompt drives it. After Phase 7 when you have skills, add cases here.

### Auto-launch at login

> [ACTION] Wire the launcher.

- **Windows:** drop `start-runner.vbs` into `%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\`. Auto-launches on every login. No admin needed.
- **macOS:** create a `~/Library/LaunchAgents/com.local.agentic-os-runner.plist` LaunchAgent that invokes `~/.claude/agentic-os-runner/start-runner.sh`. Load with `launchctl load <plist>`.
- **Linux:** create a `~/.config/systemd/user/agentic-os-runner.service` unit. Enable with `systemctl --user enable --now agentic-os-runner.service`.

For now, start it manually to verify:

```bash
# Windows
wscript.exe "$env:USERPROFILE\.claude\agentic-os-runner\start-runner.vbs"

# macOS / Linux
bash ~/.claude/agentic-os-runner/start-runner.sh
```

> [VERIFY] Wait ~5 seconds. Check `~/the-vault/system/runner-status.json` exists with fields `pid`, `ts`, `active: 0`, `pending: 0`, `max_concurrent: 3`.

> [FIX] If `runner-status.json` doesn't appear, tail `~/.claude/agentic-os-runner/runner.log`. Common causes: wrong Node version (need 20+), `AGENTIC_OS_VAULT` points at a path that doesn't exist, or another runner is already alive holding the singleton lock (check `runner.pid` + `ps aux | grep runner.js`).

---

## Phase 6 — MCP connectors (Gmail / Calendar / Drive)

**Goal:** Authenticate Anthropic-managed MCP connectors. One-click OAuth. Headless `claude -p` subprocesses inherit the credentials.

Skip this phase if both `$WANT_GMAIL` and `$WANT_CALENDAR` are false.

> [ACTION] In any interactive Claude Code session, type `/mcp`. A list of available servers appears. For each enabled connector:

- `claude.ai Gmail` (if `$WANT_GMAIL`)
- `claude.ai Google Calendar` (if `$WANT_CALENDAR`)
- `claude.ai Google Drive` (if `$WANT_DRIVE` — drive is rarely needed; skip unless you have a use case)

Click → browser OAuth flow → consent → done. The connector becomes available as `mcp__claude_ai_Gmail__*` / `mcp__claude_ai_Google_Calendar__*` tools.

> [VERIFY] In the Claude Code session: `claude mcp list`. Expect "✓ Connected" rows for each connector you authenticated.

> [FIX] If OAuth fails, check that the Google account you're using has access to Gmail / Calendar. Anthropic-managed connectors are read-mostly — Gmail can't autonomous-send, Drive can't update existing files. That's fine for this build; we're not doing autonomous sends.

---

## Phase 7 — Skills (your routines)

**Goal:** For each skill from Phase 0 Q3, write a `SKILL.md` that Claude Code can match on the user's natural language and execute.

### Skill anatomy

Every SKILL.md has:
- YAML frontmatter with `name`, `description` (trigger phrases live here)
- Markdown body explaining: why it exists, the workflow, boundaries
- Optional sibling scripts the skill shells out to

### Skill templates (4 archetypes)

Pick the matching archetype for each `$SKILL`:

**Archetype 1 — Daily-note writer** (e.g. `plan-today`, `close-day`):
Reads context, writes structured content into today's daily note. Idempotent.

**Archetype 2 — Information gatherer** (e.g. `morning-report`, `deep-research`):
Pulls from multiple sources (web, API, MCP), synthesizes, saves a deliverable in `inbox/reports/<source>/` or `inbox/research/`.

**Archetype 3 — Content generator** (e.g. `content-cascade`, `harvest`):
Reads source material, generates new artifacts (drafts, distillations), saves to `content/` or `wiki/`.

**Archetype 4 — Mechanical script wrapper** (e.g. `metrics-pull`):
Thin wrapper around a deterministic script. No AI judgment. Runner spawns direct-exec (skips claude -p entirely).

### Example: a `plan-today` skill

> [ACTION] Write `~/the-vault/.claude/skills/plan-today/SKILL.md`:

```markdown
---
name: plan-today
description: "Opinionated start-of-day planner. Creates today's daily note from the schema, suggests 3 Top 3 priorities from carryover, drops calendar into Schedule. Idempotent. Trigger: 'plan today', 'plan my day', '/plan-today'."
---

## Steps

1. Compute today's date in local timezone. Path: `daily-notes/<YYYY-MM-DD>.md`.
2. If exists, read for existing Top 3 + Daily Drivers. We'll MERGE, not overwrite.
3. Read last 3 daily notes for unfinished Top 3 (carryover candidates).
4. Pull today's calendar via `mcp__claude_ai_Google_Calendar__list_events`.
5. Glob `projects/*.md` for files with `status: in-progress` modified in last 14 days.
6. Score candidate Top 3 items: carryover +50, due-today +40, calendar-prep +25.
7. Write the daily note using the frozen v1 schema. If exists, merge into empty Top 3 slots only.

End your reply with: `SAVED daily-notes/<date>.md`
```

> [ACTION] **Claude: write a SKILL.md for each `$SKILL` from Phase 0 using one of the 4 archetypes. Save to `~/the-vault/.claude/skills/<skill-name>/SKILL.md` (vault-scoped) or `~/.claude/skills/<skill-name>/SKILL.md` (user-global, available across all projects).**

### Add to the runner

For each new skill, add a `deliverablePathFor` case + `buildPrompt` case in `runner.js`:

```javascript
case "<skill-name>":
  return `inbox/reports/<bucket>/${date}-<slug>-${id8}.md`;

case "<skill-name>":
  return `${AUTONOMOUS_PREFIX}\n\nRun /<skill-name> on: ${args.topic}\n\nSave the deliverable at: ${deliverable}.\n\nEnd your reply with: SAVED ${deliverable}`;
```

> [VERIFY] From any vault-rooted Claude Code session, type the skill's trigger phrase. Confirm Claude matches the skill and runs it.

> [FIX] If Claude doesn't match, your trigger phrases in the `description` field are too narrow. Add more variations.

---

## Phase 8 — Activity-log hook

**Goal:** PostToolUse hook that appends each of Claude's tool calls to today's daily note's `## Activity Log` section. Result: your daily note auto-fills with a timestamped trail of what Claude did. `/weekly-review` reads it as signal.

### Copy the hook from the companion repo

> [ACTION] Install the hook files:

```bash
mkdir -p ~/.claude/hooks
cp ~/projects/agentic-os-runner/hooks/activity-log.js ~/.claude/hooks/
cp ~/projects/agentic-os-runner/hooks/package.json ~/.claude/hooks/
```

### Wire the hook into Claude Code settings

The repo includes `hooks/settings.example.json` as a reference snippet.

> [ACTION] Open `~/.claude/settings.json` (create if missing). Merge this `hooks` block into the existing JSON:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": ".*",
        "hooks": [
          {
            "type": "command",
            "command": "node \"$HOME/.claude/hooks/activity-log.js\""
          }
        ]
      }
    ]
  }
}
```

If your `settings.json` already has a `hooks` section, merge the `PostToolUse` array into it rather than replacing.

### Three load-bearing details (for understanding)

1. **Atomic file lock via `openSync(path, "wx")`** — OS-level exclusive create. Cross-process safe (matters when the runner's `MAX_CONCURRENT > 1` and multiple Claude sessions are appending to the same daily note).
2. **Allowlist** — only logs `Bash`, `Edit`, `Write`, `Skill`, `Agent`, `Task`. Read/Grep/Glob are too noisy and would bury the signal.
3. **Self-exclusion** — if the tool call's target IS today's daily note, skip it. Otherwise the hook recurses on its own appends.

The hook also resolves `AGENTIC_OS_VAULT` the same way the runner does (env var → `.env` → fallback `~/the-vault`), so it auto-finds your vault.

> [VERIFY] In a Claude Code session inside your vault, run a Bash command (e.g. `ls`). Then open today's daily note. The `## Activity Log` section should contain a line like `- 14:32 → Bash → ls`.

> [FIX] If nothing appears, tail `~/.claude/hooks/activity-log-errors.log`. Common: today's daily note doesn't exist yet (run `/plan-today` first, see Phase 7) or its `## Activity Log` heading is missing (Phase 2 schema mismatch). If errors mention path resolution, check `AGENTIC_OS_VAULT` in `~/.claude/.env`.

---

## Phase 9 — Bases sidebar (frontmatter-driven queries)

**Goal:** Native Obsidian Bases queries surface your active projects + content pipeline in the right sidebar without writing custom plugin code.

Prereq: Obsidian 1.9.10+ (verified in pre-flight).

> [ACTION] Write `~/the-vault/system/bases/projects-active.base`:

```yaml
filters:
  and:
    - file.folder == "projects"
    - status != "done"
    - status != "archived"
views:
  - type: table
    name: Active projects
    order:
      - file.name
      - status
    sort:
      - property: status
        direction: ASC
      - property: file.mtime
        direction: DESC
```

> [ACTION] Optionally write `~/the-vault/system/bases/content-pipeline.base` if you have a `content/` folder with pipeline-staged drafts:

```yaml
filters:
  and:
    - file.path.startsWith("content/")
    - status != "published"
views:
  - type: table
    name: Pipeline
    order:
      - file.name
      - status
```

> [ACTION] In Obsidian: open both `.base` files, drag their tabs to the right sidebar. Drop on the TOP or BOTTOM edge of an existing pane (NOT the center) to split horizontally. Save the workspace: `Ctrl+P` → "Workspaces: Manage workspace layouts" → save as `dashboard`. Bind a hotkey to "Workspaces: Load" → dashboard.

> [VERIFY] Sidebar renders two Bases tables driven by frontmatter. Adding `status: blocked` to a project file makes it appear; setting `status: done` removes it.

> [FIX] If a project file has `**Status:** in-progress` written as inline markdown bold instead of YAML frontmatter, Bases can't see it. Convert all status values to proper YAML frontmatter.

---

## Phase 10 — Iconize aesthetic pass

**Goal:** Color-code the left sidebar so the folder model reads at a glance.

> [ACTION] Install Iconize: Settings → Community Plugins → Browse → "Iconize" → install + enable.

> [ACTION] Configure colors via `~/the-vault/.obsidian/plugins/obsidian-icon-folder/data.json`. Reference layout matching the Karpathy 3-stage model:

```json
{
  "settings": { "migrated": 2, "lucideIconPackType": "native" },
  "inbox": { "iconName": "LiInbox", "iconColor": "<your accent>" },
  "projects": { "iconName": "LiFolderCog", "iconColor": "<your brighter accent>" },
  "content": { "iconName": "LiSend", "iconColor": "<your peach>" },
  "wiki": { "iconName": "LiBookOpen", "iconColor": "<cool contrast color>" },
  "daily-notes": { "iconName": "LiCalendarDays", "iconColor": "<muted>" },
  "ops": { "iconName": "LiBriefcase", "iconColor": "<muted gold>" },
  "system": { "iconName": "LiServerCog", "iconColor": "<dim grey>" },
  "_archive-vault": { "iconName": "LiArchive", "iconColor": "<dimmest>" },
  "_index.md": { "iconName": "LiHome", "iconColor": "<your accent>" },
  "CLAUDE.md": { "iconName": "LiBookText", "iconColor": "<your accent>" }
}
```

Use the colors from your `$PALETTE` (Phase 0 Q7). The Karpathy 3-stage (inbox/projects/content) should be a gradient in your accent color, wiki should be a contrast color, utilities should be muted.

> [ACTION] Reload Obsidian (Ctrl+R or toggle Iconize off/on) to pick up the data.json.

> [VERIFY] Left sidebar renders folder icons in your palette. The 3-stage flow is visually distinct from the knowledge zone and utilities.

> [FIX] If an icon renders as a blank box, that Lucide name doesn't exist. Right-click the folder → "Change icon" → search the picker → I'll update `data.json` with the matching name.

---

## Phase 11 — Dashboard UI (the visual payoff)

**Goal:** Replace the Phase 3 placeholder Dashboard.tsx with the full HUD pane. Pulls a Preact + esbuild template from `dashboard-template/` inside the companion repo, drops it into your plugin folder, and customizes three swap-points per your Phase 0 answers. End state: a metric-card grid, a token-burn chart with live projection, an action bar with clickable skill buttons, a daily-note panel with click-to-toggle drivers, an activity feed showing recent runs, and a pulsing runner-status footer — all in a dark warm HUD aesthetic.

**Why this exists:** Phases 1-10 build the data layer (vault schema, runner queue, metrics pipeline, hook, bases, icons). Without Phase 11 the pane shows literal "Dashboard boots." Phase 11 is where the dashboard becomes a dashboard.

### 11.1 Copy the template

> [ACTION] Phase 0.5 already cloned `agentic-os-runner` to `~/projects/agentic-os-runner`. Pull the latest so you have `dashboard-template/`:
>
> ```bash
> cd ~/projects/agentic-os-runner
> git pull origin main
> ls dashboard-template/
> ```
>
> You should see `src/`, `styles.css`, `tsconfig.json`, `README.md`, plus `manifest.json.template`, `package.json.template`, `esbuild.config.mjs.template`.

> [ACTION] Wipe your Phase 3 scaffold's `src/` so the template lands clean, then copy template files in:
>
> ```bash
> cd ~/projects/my-dashboard
> rm -rf src
> cp -r ~/projects/agentic-os-runner/dashboard-template/src ./src
> cp ~/projects/agentic-os-runner/dashboard-template/styles.css ./styles.css
> cp ~/projects/agentic-os-runner/dashboard-template/tsconfig.json ./tsconfig.json
> cp ~/projects/agentic-os-runner/dashboard-template/manifest.json.template ./manifest.json
> cp ~/projects/agentic-os-runner/dashboard-template/package.json.template ./package.json
> cp ~/projects/agentic-os-runner/dashboard-template/esbuild.config.mjs.template ./esbuild.config.mjs
> ```

> [VERIFY] `ls ~/projects/my-dashboard/src/components/` shows 17 `.tsx` / `.ts` files (Dashboard, MetricCard, TokenBurnChart, ActionBar, etc).

### 11.2 Customize the four swap-points

> [ACTION] **Swap-point 1 — `esbuild.config.mjs`**: edit `VAULT_PLUGIN_DIR` to point at your vault. On Windows use double-backslashes; on macOS/Linux use forward slashes.
>
> ```javascript
> // Windows example:
> const VAULT_PLUGIN_DIR = "C:\\Users\\you\\the-vault\\.obsidian\\plugins\\my-dashboard";
> // macOS / Linux example:
> // const VAULT_PLUGIN_DIR = process.env.HOME + "/the-vault/.obsidian/plugins/my-dashboard";
> ```

> [ACTION] **Swap-point 2 — `src/components/Dashboard.tsx` `CARDS` array**: one entry per `$METRIC` from Phase 0 Q2. The `key` field MUST match the `<source>:<metric>` your `pull_*.py` scripts emit (look at `system/metrics/metrics.csv` for the actual keys). Drop entries for metrics you don't have; add new ones in the same shape.
>
> Example, search for `// CUSTOMIZE` in the file. Default template ships with YouTube + Instagram + TikTok cards because that's the reference dashboard. Replace with your set, e.g.:
>
> ```typescript
> const CARDS: CardSpec[] = [
>   { key: "claude_code:tokens_5h", label: "Claude 5h", format: "compact", tabs: ["overview"] },
>   { key: "youtube:subscribers", label: "YouTube Subs", format: "integer", tabs: ["overview", "audience"], tone: "youtube" },
>   { key: "github:stars_total", label: "Stars", format: "integer", tabs: ["overview"] },
>   // … one per metric
> ];
> ```
>
> Cards whose `key` has no matching CSV row render an empty "no data" placeholder — safe to leave entries in for metrics you plan to wire later.

> [ACTION] **Swap-point 3 — `src/components/ActionBar.tsx` `BUTTONS` array**: one entry per `$SKILL` from Phase 0 Q3 that you wired in Phase 7. The `skill` field MUST match a `case` in your `runner.js` `buildPrompt()` switch. Skills needing string args get a `prompt: "topic"` or `prompt: "url"` field — clicking the button opens `IntentArgModal` for input.
>
> Search for `// CUSTOMIZE` near the top of the file. Default template ships with the reference dashboard's 10 buttons. Replace with your set, e.g.:
>
> ```typescript
> const BUTTONS: ButtonSpec[] = [
>   { skill: "plan-today", label: "Plan Today" },
>   { skill: "metrics-pull", label: "Pull Metrics" },
>   { skill: "ai-trend-scan", label: "Trend Scan" },
>   {
>     skill: "angle-brainstorm",
>     label: "Angle Brainstorm…",
>     prompt: "topic",
>     promptLabel: "Seed (URL / headline / sentence)",
>     placeholder: "e.g. anthropic ships sub-agents",
>   },
>   // … one per wired skill
> ];
> ```

> [ACTION] **Swap-point 4 (optional) — `styles.css` palette**: edit the `:root` block at the top to swap colors per `$PALETTE` from Phase 0 Q7. The reference uses dark warm (Near Black + Terracotta). If you picked a different palette, change `--accent`, `--bg`, `--text` etc.

### 11.3 Install + build

> [ACTION] Install deps and build:
>
> ```bash
> cd ~/projects/my-dashboard
> npm install
> npm run build
> ```

> [ACTION] Drop a marker so Hot Reload re-builds the plugin whenever you re-run `npm run build`:
>
> ```bash
> touch ~/the-vault/.obsidian/plugins/my-dashboard/.hotreload
> ```

### 11.4 Verify

> [VERIFY] Reload Obsidian (Ctrl+R). Open the Command Center pane via the activity ribbon icon. You should see:
> - Header `AGENTIC OS` with a heartbeat SVG + live status pill
> - Tabs: `overview` / `audience` / `research`
> - Token Burn chart (overview tab) with an animated meter + ticks + projection comet
> - Metric cards — one per `CARDS` entry, with status dot, animated number, delta arrow
> - Action bar — one button per `BUTTONS` entry
> - Daily Drivers checklist + Schedule list (if a daily note exists for today)
> - Activity Feed showing recent `system/runs/*.json` entries
> - Footer: pulsing online/offline runner status, last-pull "Xm ago", next-pull ETA
>
> Click any action button → Obsidian Notice flashes "Queued <skill>". Within ~10s the run shows up in Activity Feed.

> [FIX] **Blank pane**: open DevTools (Ctrl+Shift+I) → Console. Common: missing `preact/hooks` import (your `tsconfig.json` needs `"jsx": "react"` + `"jsxFactory": "h"` + `"jsxFragmentFactory": "Fragment"` — the template's tsconfig already has these, so if you replaced it with something else you broke it).
>
> **Metric values show "—" but CSV has rows**: your `CARDS` keys don't match the `<source>:<metric>` your pull scripts emit. Open `system/metrics/metrics.csv` → look at the actual `source,metric` column values → align your `CARDS` entries to those exact strings (with a colon separator).
>
> **Runner shows offline but you know it's running**: `system/runner-status.json` is stale (>5min old). Restart runner via `start-runner.vbs` and the heartbeat refreshes.
>
> **Buttons queue intents but nothing happens**: open `system/queue/` — if your intent JSONs sit there, the runner is consuming them but `buildPrompt()` in `runner.js` returns `null` for that skill (case missing or required args absent). Check `~/.claude/agentic-os-runner/runner.log`.

---

## End-to-end smoke test

After all 11 phases, run this validation sequence:

> [ACTION]
1. Open Obsidian → dashboard pane opens automatically.
2. Footer should show `● runner online` (your runner heartbeat is fresh).
3. Click the metrics-pull button — wait ~30s — Activity Feed shows a `metrics-pull` row with status `ok`.
4. Open `~/the-vault/system/metrics/metrics.csv` — confirm new rows appended.
5. Click `plan-today` button — wait ~30s — Activity Feed shows a `plan-today` row.
6. Open `~/the-vault/daily-notes/<today>.md` — confirm Top 3 + Schedule populated.
7. Open Claude Code in vault root, run a Bash command → close → reopen today's daily note → `## Activity Log` has new entry.
8. Right sidebar Bases queries render your project files + content pipeline.

> [VERIFY] All 8 steps pass. Your agentic OS is live.

> [FIX] For any failing step, the troubleshooting section below maps symptoms → root causes.

---

## Troubleshooting — top gotchas

| Symptom | Likely root cause |
|---|---|
| Dashboard boots empty / no metrics | metrics.csv has no rows yet — run the scheduled task manually once or hit the metrics-pull button |
| Runner offline | Check `~/.claude/agentic-os-runner/runner.log` — usually a Node version issue or singleton-lock collision. Kill zombie processes + relaunch via VBS |
| `claude -p` spawn says "Need topic" or "What do?" | runner.js prompt has multi-line content + `shell: true` truncated it at first newline. Fix: `shell: false` + `claude.exe` (Windows binary path) |
| Skill `/foo` doesn't fire from runner | Skill is project-scoped (`vault/.claude/skills/`) but runner spawned from `~/.claude/agentic-os-runner/` — fix: `cwd: VAULT_ROOT` on spawn |
| Multi-line activity-log entries don't append | `## Activity Log` heading missing from daily note. Phase 2 schema requires it |
| Bases query returns empty | Frontmatter status values don't match canonical taxonomy. Check YAML, not inline markdown |
| Plugin can't load | Check `~/the-vault/.obsidian/plugins/my-dashboard/manifest.json` exists. Restart Obsidian |
| Iconize icons missing | `lucideIconPackType: native` not set in data.json settings, or icon name has wrong prefix (must be `Li`) |

---

## Optional follow-ons

Once the base build is live, these are common extensions:

- **`/harvest` skill** — When a project flips `status: done`, automate wiki distillation. Reads project + linked research, drafts a wiki article, cross-links siblings, updates `_master-index.md`.
- **Dashboard aesthetic pass** — Custom marquee components (token-burn meter, weekly-review card, headline tiles). HUD corner brackets + threshold-tinted progress bars.
- **Token-budget gate on concurrency** — Drop `MAX_CONCURRENT` to 1 when Claude 5h budget is over 80%.
- **Per-card 7-day chart drill-in** — Click any metric card → opens a 7-day chart note.
- **Activity Feed render of `queued` runs** — Currently runs only appear in Activity Feed once runner picks them up. Plugin could scan `system/queue/` and synthesize placeholder rows.
- **Direct-exec routing for new mechanical skills** — For skills that "just run a script," bypass `claude -p` entirely. Faster, cheaper, immune to SessionStart hook side effects.

---

## Final notes

**This is a personal-scale system.** Single-user, single-machine, no auth boundary between you and the runner. Don't deploy to shared infrastructure as-is.

**Schema discipline is the load-bearing habit.** The frozen `daily-note.md` v1 schema is what lets every writer (skills, hooks, plugin) and every reader (plugin, Bases) compose without coordinating. If you copy one habit from this guide, copy that one.

**The runner is a thin shim.** ~500 lines of Node. Most of the leverage is in the skills, not the orchestration. When you want a new capability, write a new SKILL.md before you touch the runner.

**Caveman mode + autonomy preamble are workarounds.** They exist because headless `claude -p` UX isn't perfect. By the time you're building this, there may be cleaner patterns.

**Iterate.** Your version of this looks different from the reference within a month of use. That's the point. The template is a scaffold, not a destination.

Good luck. Ship the dashboard.
