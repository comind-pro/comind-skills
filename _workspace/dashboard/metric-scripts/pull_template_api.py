"""pull_template_api.py — REST API metric pull template.

Copy this file, rename it (e.g. pull_github_stars.py), and fill in:
  - SOURCE       — bucket name for metrics.csv (e.g. "github")
  - METRIC       — specific metric inside that source (e.g. "stars_total")
  - API_URL      — endpoint that returns your number
  - JSON path    — where in the response your value lives
  - env vars     — what credentials you need from ~/.claude/.env

The script:
  1. Reads creds from ~/.claude/.env (or system env).
  2. Makes an HTTP request.
  3. Appends one row to ~/the-vault/system/metrics/metrics.csv.
  4. Updates ~/the-vault/system/metrics/last-pull.json with status.

If the request fails, last-pull.json gets `status: error` + the message.
The dashboard's MetricCard reads both files and renders status-coded UI.
"""

from __future__ import annotations
import json
import urllib.request
import urllib.error

from _common import env, now_iso, append_row, write_snapshot

# --- Customize these per metric ---------------------------------------------
SOURCE = "example"                            # bucket name
METRIC = "followers_total"                    # metric name within bucket
API_URL_TEMPLATE = "https://api.example.com/v1/users/{handle}/stats"
ENV_HANDLE_KEY = "EXAMPLE_HANDLE"             # env var holding the user handle
ENV_API_KEY_KEY = "EXAMPLE_API_KEY"           # env var holding the API key
JSON_FIELD_PATH = ["data", "followers"]       # path into JSON response
# ----------------------------------------------------------------------------


def get_value(json_data, path):
    """Walk a JSON object via a list of keys."""
    out = json_data
    for key in path:
        if isinstance(out, dict):
            out = out.get(key)
        else:
            return None
        if out is None:
            return None
    return out


def main():
    handle = env(ENV_HANDLE_KEY)
    api_key = env(ENV_API_KEY_KEY)
    if not handle or not api_key:
        write_snapshot(
            SOURCE,
            "error",
            f"missing {ENV_HANDLE_KEY} or {ENV_API_KEY_KEY} in ~/.claude/.env",
        )
        return

    try:
        req = urllib.request.Request(
            API_URL_TEMPLATE.format(handle=handle),
            headers={
                "Authorization": f"Bearer {api_key}",
                "Accept": "application/json",
            },
        )
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode("utf-8"))

        value = get_value(data, JSON_FIELD_PATH)
        if value is None:
            write_snapshot(
                SOURCE,
                "error",
                f"JSON path {JSON_FIELD_PATH} missing in response",
            )
            return

        append_row(now_iso(), SOURCE, METRIC, float(value), "ok", "")
        write_snapshot(SOURCE, "ok")
    except urllib.error.HTTPError as e:
        write_snapshot(SOURCE, "error", f"HTTP {e.code}: {str(e)[:160]}")
    except urllib.error.URLError as e:
        write_snapshot(SOURCE, "error", f"URL error: {str(e.reason)[:160]}")
    except Exception as e:
        write_snapshot(SOURCE, "error", str(e)[:200])


if __name__ == "__main__":
    main()
