"""pull_template_local.py — local file metric pull template.

Use this when the number you want lives in a local file on your machine —
e.g. a daily journal word count, a time tracker JSON export, a sqlite db, a
CSV from a desktop app.

Copy this file, rename it (e.g. pull_journal_wordcount.py), and fill in:
  - SOURCE       — bucket name for metrics.csv
  - METRIC       — specific metric inside that source
  - DATA_PATH    — absolute path to your data file
  - parse_value()— function that reads the file and returns a number

The template below handles JSON. Adapt for CSV, sqlite, plain text, etc.
"""

from __future__ import annotations
import json
from pathlib import Path

from _common import now_iso, append_row, write_snapshot

# --- Customize these per metric ---------------------------------------------
SOURCE = "example"
METRIC = "todays_word_count"
DATA_PATH = Path.home() / "Documents" / "your-data-file.json"
# ----------------------------------------------------------------------------


def parse_value(path: Path) -> float:
    """Read DATA_PATH and return a numeric value. Adapt to your file format."""
    data = json.loads(path.read_text(encoding="utf-8"))
    # Example: data = {"daily": {"2026-05-13": {"words": 1234}}}
    # Customize this navigation per your file:
    return float(data["YOUR"]["JSON"]["PATH"])


def main():
    try:
        if not DATA_PATH.exists():
            write_snapshot(SOURCE, "error", f"{DATA_PATH} missing")
            return

        value = parse_value(DATA_PATH)
        append_row(now_iso(), SOURCE, METRIC, value, "ok", "")
        write_snapshot(SOURCE, "ok")
    except Exception as e:
        write_snapshot(SOURCE, "error", str(e)[:200])


if __name__ == "__main__":
    main()
