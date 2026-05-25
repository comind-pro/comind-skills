---
title: "Agentic OS — Part 3 · Dashboard (Streamlit path)"
type: doc
audience: dual (human follow-along + Claude Code as pair-builder)
origin: chase-ai masterclass (adapted)
---

# Streamlit Dashboard (Part 3 · Path A)

> **Not vendored in this template.** The comind-skills template only builds the
> **Obsidian** path (`part-3-dashboard-obsidian.md`, vendored at `_workspace/dashboard/`).
> This Streamlit path clones an **external** repo (`github.com/cth9191/agentic-os-dashboard`)
> at build time — there is no local copy of its code in this repo. Kept here as the
> alternative-path instruction set for completeness.

You built skills in Part 1, set up the Obsidian memory layer in Part 2. This is Part 3 — the observability dashboard. Two paths: **Streamlit (this one)** for distribution-friendly local-web deployment, or **Obsidian** (see `part-3-dashboard-obsidian.md`) for an Obsidian-native plugin. Pick one; either works for the masterclass.

Single copy-paste prompt. Drop into Claude Code in any folder. The agent:
1. **Build phase** — clones the v2 repo, installs deps, copies config, boots in DEMO_MODE so you see the dashboard at `localhost:8501` within ~2 minutes
2. **Conversation phase** — interviews you to wire YOUR skills, calibrate YOUR plan, theme YOUR brand, optionally flip to live data

Goal: you end Day 1 with `localhost:8501` showing your skills, your accent color, your data feeds. Not a placeholder grid.

---

## THE PROMPT

```
Set me up with the Agentic OS Dashboard v2 — a local Streamlit dashboard for
my Claude Code skills with three tabs (Overview / Audience / Research),
TokenBurn marquee, audience cards, and parallel skill runs through a
background queue.

This is a CLONE-AND-WIRE flow. The dashboard code is already production-
ready and lives at github.com/cth9191/agentic-os-dashboard. Your job is
to clone it, boot it in DEMO mode so I can see what we're working with,
then walk me through wiring it to MY environment.

Two phases:
  PHASE 1 — Clone + boot the shell (silent, just ship it running)
  PHASE 2 — Interview me to customize it

============================================================
PHASE 1 — CLONE + BOOT
============================================================

ORDER OF OPERATIONS (run silently, no questions until phase 2):

1. Check prerequisites:
   - python --version (need 3.10+)
   - git --version
   - claude --version
   If any fail, stop and ask me to install before continuing.

2. Clone the repo into the current working directory:
   git clone https://github.com/cth9191/agentic-os-dashboard.git

3. cd agentic-os-dashboard

4. pip install -r requirements.txt
   If permission errors on Mac/Linux, retry with --user.

5. Copy config:
   - Windows: copy config.example.py config.py
   - Mac/Linux: cp config.example.py config.py

6. Edit config.py — start in DEMO_MODE so the member sees the dashboard
   populated immediately without needing real data:
   - Set DEMO_MODE = True
   - Leave VAULT_PATH / VAULT_NAME / CLAUDE_CLI as placeholders for now
     (we calibrate in Phase 2)
   - Keep all ENABLED_CARDS = True so they see every component

7. Boot:
   streamlit run app.py --server.headless true --server.port 8501 &

   (Background it on Mac/Linux. On Windows, use Start-Process or
   spawn via `streamlit run app.py` in a new terminal window.)

8. Print to me, exactly:

   ────────────────────────────────────────────────────────
   DASHBOARD UP. NOW YOURS.
   ────────────────────────────────────────────────────────

   Open http://localhost:8501 in your browser.

   What you're looking at:
   • AGENTICOS header + quicknav pills
   • TokenBurn 5h marquee (currently showing demo data — 62%)
   • Three tabs: Overview / Audience / Research
   • Background queue card (empty for now)
   • Skill chips (placeholders — we wire YOUR skills in Phase 2)

   Everything you see is mocked while DEMO_MODE = True. We'll flip it
   to live data once we wire your environment.

   Open it in another window so you can see changes live as we work.

   ────────────────────────────────────────────────────────

============================================================
PHASE 2 — INTERVIEW + WIRE
============================================================

Do NOT stop after Phase 1. Ask me these in order. Wait for each answer
before moving on. Edit config.py in place between questions so I see
the dashboard update live.

QUESTION 1 — WORKING FOLDER
"Where's the folder Claude Code should run skills in + where the
dashboard should read data from? Could be your Obsidian vault, your
main project folder, anywhere you already work with Claude Code.

If you don't have one, say 'scaffold one'. I'll create a minimal
working folder at ~/agentic-os-data/ with these subdirs:
  queue/      — pending intent JSON files (parallel runs)
  runs/       — completed run logs (UUID per invocation)
  metrics/    — metrics.csv (timestamp,source,metric,value,status,error)
  reports/    — skill deliverables grouped by source
  daily-notes/ — optional, if you want a Schedule panel feed
  dashboard-runs/ — foreground run logs from the dashboard"

→ Set VAULT_PATH + VAULT_NAME in config.py
→ If they say 'scaffold one', create the folder structure first +
  drop an empty metrics.csv with the header row
→ The variable is named VAULT_PATH for historical reasons but it
  works with any folder — Obsidian-ness is optional

QUESTION 2 — CLAUDE CLI
"Run this in a terminal so I know where your Claude Code binary is:

   Windows:    where claude
   Mac/Linux:  which claude

Paste the full path."

→ Set CLAUDE_CLI in config.py to the absolute path

QUESTION 3 — CLAUDE PLAN
"Which Claude plan are you on?

   pro    → 5 routine runs / day
   max    → 15 routine runs / day
   team   → 25 routine runs / day
   enterprise → 25 routine runs / day"

→ Set CLAUDE_PLAN in config.py
→ NOTE about TokenBurn cap: Anthropic doesn't publish the exact 5h
   output-token cap. Community trackers report ~220K-440K for Max20x
   post the April 2026 policy. Default LIMITS["five_hour_tokens"] is
   5_000_000 which is conservative. If they want the meter to read
   closer to what claude.ai shows, tune it. Ask: "Want me to lower the
   5h cap so the % tracks your claude.ai dev page more closely? If yes,
   what % does claude.ai show right now and roughly how many tokens
   you've burned?"

QUESTION 4 — SKILLS (the leverage moment)
"Now the fun part. The config has ~18 placeholder skills across 6
categories (memory / productivity / research / content / finance /
custom).

First — which state are you in?
  (A) Just built skills in masterclass Part 1 → paste me the list of
      skill names + one-line descriptions you built. I'll wire those
      and drop the unrelated placeholders.
  (B) Have existing skills from before → run `ls ~/.claude/skills/`
      (user-global) + `ls <WORKING_FOLDER>/.claude/skills/` (project-
      scoped, if you keep skills there). Paste output. I'll cross-
      reference against the placeholder list.
  (C) No skills yet → say 'scaffold starters'. I'll generate 3 minimal
      starter skills via skill-creator (morning-brief, vault-cleanup,
      deep-research) so the dashboard has something real to fire.

Then, regardless of branch, tell me:
  (a) Which of the remaining placeholders to KEEP (their /slash-command
      exists in your environment)
  (b) Which to DELETE (don't apply — e.g. you don't do finance
      bookkeeping, kill the whole finance category)
  (c) Which to ADD that aren't in the placeholder list. For each new
      one: label, /slash-command, category, whether it needs {input}.

I'll rewrite the SKILLS list in config.py to match yours."

→ Rewrite SKILLS list
→ Update SKILL_CATEGORY_ORDER if categories changed
→ If (C), scaffold the 3 starter skills BEFORE rewriting SKILLS

QUESTION 5 — AUDIENCE METRICS
"Do you track audience metrics? Any of these? (check all that apply)
   - YouTube (subs + 28d views)
   - Instagram (followers)
   - TikTok (followers)
   - none of the above

If none, I'll set ENABLED_CARDS['audience_row'] = False and
ENABLED_CARDS['latest_upload'] = False — that hides the audience-tab
content tiles since they'd just sit empty. The audience tab still
exists but only renders the YtWeekReview marquee.

If yes to any: I'll need a metrics-pull script installed at
<VAULT>/.claude/skills/metrics-pull/. Want me to scaffold one? It scans
~/.claude/projects/*/*.jsonl for Claude Code usage + has placeholder
pulls for YouTube Data API / Instagram scrape / TikTok scrape that you
can fill in with your API keys."

→ Toggle ENABLED_CARDS accordingly
→ If scaffolding metrics-pull, write the skill folder + scripts

QUESTION 6 — BRAND / COLOR
"Default accent is terracotta (#c96442) + Near Black. Want to keep it
or re-skin?

If re-skin: give me a hex color or a vibe (deep cobalt, forest green,
electric purple). I'll swap --accent + --cc-accent in V2_CSS + the
crosshatch atmosphere tints + the TokenBurn fill gradient."

→ If re-skin, find/replace #c96442 + the rgba(201, 100, 66, …) values
  in V2_CSS + V2_BACKGROUND in app.py with the new tone.

QUESTION 7 — FLIP TO LIVE DATA
"Ready to leave DEMO_MODE? Once we flip it, the dashboard reads from
your real metrics.csv + latest-video.json + daily-notes + inbox/reports
instead of mocks.

If you say yes:
  - Run /metrics-pull manually once to seed metrics.csv with current
    Claude Code usage
  - Set DEMO_MODE = False in config.py
  - Tell me to refresh the browser
  - Click the ↻ pull pill in quicknav going forward to refresh whenever

If you say not yet: keep DEMO_MODE = True. The dashboard stays mocked
for recordings/demos. Flip when ready."

→ If flipping live: ensure metrics-pull skill exists, run it once,
  then DEMO_MODE = False

QUESTION 8 — AUTOSTART (optional)
"Want the dashboard to auto-launch on boot at localhost:8501? Adds it
to Task Scheduler (Windows) or launchd (macOS) so it's always running
in the background and you just bookmark the URL.

   - yes, set it up
   - no, I'll launch manually
   - tell me how and I'll do it"

→ If yes, scaffold the auto-launch config + walk through install

============================================================
PHASE 3 — WRAP
============================================================

After Phase 2 ends (member said no to autostart or yes-and-installed),
print:

   ────────────────────────────────────────────────────────
   YOU'RE WIRED IN.
   ────────────────────────────────────────────────────────

   Your dashboard lives at http://localhost:8501. Bookmark it.

   What's working now:
   • Your <N> skills are clickable
   • Your vault feeds the Schedule + Agent Runs chart
   • Your <platform list> are tracked on the audience tab
   • TokenBurn reads <live | mock> data
   • Background queue is ready — chip click during a run fires
     parallel via the runner pool

   What I left out (you can ask for any of these later):
   • Custom theme tweaks beyond the accent color
   • Additional metric cards (Stripe MRR, newsletter subs, etc.)
   • Mobile/responsive layout
   • Auth / multi-user
   • Anything else your version of the dashboard doesn't have but
     you've seen on someone else's

   To change anything: open this same folder in Claude Code and
   describe what you want. The dashboard was built with Claude Code
   and is built to be modified the same way.

NEVER commit the member's config.py. NEVER push to the upstream repo.
NEVER ship their paths/skills/API keys to GitHub. All edits stay in
their local clone.
```

---

## When something looks off — after-setup tweaks

The dashboard is built to be modified with Claude Code. After the
8 questions are done and the dashboard is live, keep the same
Claude Code session open in `agentic-os-dashboard/` and describe
what to change. Examples:

> "TokenBurn % is too high — I'm on Max and claude.ai shows 4% but
> dashboard shows 75%. Calibrate LIMITS['five_hour_tokens'] to match
> what claude.ai shows."

> "Move audience cards above Latest Upload on the Audience tab."

> "Replace terracotta accent with a deep cobalt blue across the whole
> CSS."

> "Add a fourth tab called 'Finance' with my Stripe MRR + churn + LTV
> cards."

> "YtWeekReview marquee is showing data from last week. Fire a fresh
> review via the RUN button — confirm it appears in the queue panel."

> "Swap the 3-column skill grid for a 4-column layout."

> "Add a 'last run' timestamp under each skill chip pulled from
> system/runs/."

The agent has the whole `app.py` + `config.py` + V2_CSS block in scope.
It knows the dashboard intimately because the dashboard was built with
Claude Code in the first place.
