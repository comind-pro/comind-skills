"""pull_template_scrape.py — Playwright scrape template.

Use this when there's no public API for the number you want — e.g. follower
counts visible only on a profile page. Requires Playwright Python:

    python -m pip install playwright
    python -m playwright install chromium

Public pages only. For pages behind login, you'll need to seed an auth state
(see Playwright docs on `browser_context.storage_state`).

Copy this file, rename it (e.g. pull_instagram.py), and fill in:
  - SOURCE        — bucket name for metrics.csv
  - METRIC        — specific metric inside that source
  - PROFILE_URL   — page that contains the number
  - REGEX         — regex that extracts the number from page HTML

Notes:
  - The K/M/B suffix parser handles "195K Followers" → 195000 style strings,
    which is what Instagram/TikTok-style sites return at scale.
  - 30 second timeout per page load. Adjust if slow.
"""

from __future__ import annotations
import re

from playwright.sync_api import sync_playwright

from _common import env, now_iso, append_row, write_snapshot

# --- Customize these per metric ---------------------------------------------
SOURCE = "example"
METRIC = "followers_total"
PROFILE_URL_TEMPLATE = "https://example.com/@{handle}"
ENV_HANDLE_KEY = "EXAMPLE_HANDLE"
# Regex MUST have a single capture group around the numeric string
EXTRACT_REGEX = r'"follower_count":\s*"?([\d,.KMB]+)"?'
# ----------------------------------------------------------------------------


def parse_count(s: str) -> int:
    """Parse '1,234', '12.3K', '4.5M', '6.7B' → integer."""
    s = s.replace(",", "").strip()
    if not s:
        raise ValueError("empty count string")
    if s[-1] in "KMB":
        mult = {"K": 1_000, "M": 1_000_000, "B": 1_000_000_000}[s[-1]]
        return int(float(s[:-1]) * mult)
    return int(float(s))


def main():
    handle = env(ENV_HANDLE_KEY)
    if not handle:
        write_snapshot(SOURCE, "error", f"missing {ENV_HANDLE_KEY} in ~/.claude/.env")
        return

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(
                user_agent=(
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/120.0 Safari/537.36"
                )
            )
            page = context.new_page()
            page.goto(PROFILE_URL_TEMPLATE.format(handle=handle), timeout=30_000)
            content = page.content()
            browser.close()

        match = re.search(EXTRACT_REGEX, content)
        if not match:
            write_snapshot(
                SOURCE,
                "error",
                f"regex {EXTRACT_REGEX!r} did not match page HTML",
            )
            return

        value = parse_count(match.group(1))
        append_row(now_iso(), SOURCE, METRIC, float(value), "ok", "")
        write_snapshot(SOURCE, "ok")
    except Exception as e:
        write_snapshot(SOURCE, "error", str(e)[:200])


if __name__ == "__main__":
    main()
