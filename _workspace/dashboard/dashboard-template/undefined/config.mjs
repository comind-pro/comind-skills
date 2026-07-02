// src/lib/config.ts
var WIDGET_TYPES = [
  "metric-grid",
  "token-burn-chart",
  "activity-feed",
  "action-bar",
  "focus",
  "top3",
  "daily-drivers",
  "schedule",
  "runs"
];
var DEFAULT_CONFIG = {
  version: 1,
  tabs: [
    { id: "overview", label: "overview" },
    { id: "tasks", label: "tasks" },
    { id: "activity", label: "activity" }
  ],
  widgets: [
    { type: "token-burn-chart", tabs: ["overview"], source: "claude_code", metric: "tokens_5h" },
    {
      type: "metric-grid",
      tabs: ["overview"],
      cards: [
        { key: "tasks:open", label: "Open Tasks", format: "integer" },
        { key: "tasks:in_progress", label: "In Progress", format: "integer" },
        { key: "runs:today", label: "Runs Today", format: "integer" },
        { key: "git:commits_today", label: "Commits Today", format: "integer" }
      ]
    },
    {
      type: "metric-grid",
      tabs: ["tasks"],
      cards: [
        { key: "tasks:open", label: "Open Tasks", format: "integer" },
        { key: "tasks:in_progress", label: "In Progress", format: "integer" },
        { key: "tasks:blocked", label: "Blocked", format: "integer" },
        { key: "tasks:done_7d", label: "Done \xB7 7d", format: "integer" }
      ]
    },
    {
      type: "metric-grid",
      tabs: ["activity"],
      cards: [{ key: "runs:today", label: "Runs Today", format: "integer" }]
    },
    {
      type: "action-bar",
      tabs: ["overview", "tasks", "activity"],
      buttons: [
        { skill: "plan-today", label: "Plan Today" },
        { skill: "plan-tomorrow", label: "Plan Tomorrow" },
        { skill: "morning-report", label: "Morning Brief" },
        {
          skill: "deep-research",
          label: "Deep Research\u2026",
          prompt: "topic",
          promptLabel: "Deep research \u2014 topic",
          placeholder: "e.g. claude code agent rotations 2026"
        },
        { skill: "weekly-review", label: "Weekly Review" },
        { skill: "vault-cleanup", label: "Vault Cleanup" },
        { skill: "metrics-pull", label: "Pull Metrics" }
      ]
    },
    { type: "focus", tabs: ["tasks"] },
    { type: "schedule", tabs: ["overview"] },
    { type: "top3", tabs: ["tasks"] },
    { type: "daily-drivers", tabs: ["overview", "tasks"] },
    { type: "activity-feed", tabs: ["activity"], limit: 8 }
  ]
};
var CARD_FORMATS = ["currency", "integer", "compact", "percent"];
var TAB_ID_RE = /^[a-z0-9-]+$/;
function isObject(v) {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function show(v) {
  return typeof v === "string" ? `"${v}"` : JSON.stringify(v);
}
function validateConfig(raw) {
  const errors = [];
  const err = (path, msg) => errors.push(`${path}: ${msg}`);
  if (!isObject(raw)) {
    return {
      errors: ["config: must be a JSON object"],
      shellValid: false,
      widgetErrors: {}
    };
  }
  for (const key of Object.keys(raw)) {
    if (!["version", "tabs", "widgets"].includes(key)) {
      err(key, "unknown top-level key");
    }
  }
  if (raw.version !== 1) {
    err("version", `must be the integer 1, got ${show(raw.version)}`);
  }
  const tabIds = /* @__PURE__ */ new Set();
  const errorsBeforeTabs = errors.length;
  if (!Array.isArray(raw.tabs) || raw.tabs.length < 1 || raw.tabs.length > 8) {
    err("tabs", "must be an array of 1..8 entries");
  } else {
    raw.tabs.forEach((tab, i) => {
      const p = `tabs[${i}]`;
      if (!isObject(tab)) {
        err(p, "must be an object { id, label }");
        return;
      }
      for (const key of Object.keys(tab)) {
        if (!["id", "label"].includes(key)) err(`${p}.${key}`, "unknown key");
      }
      if (typeof tab.id !== "string" || !TAB_ID_RE.test(tab.id)) {
        err(`${p}.id`, `must match [a-z0-9-]+, got ${show(tab.id)}`);
      } else if (tabIds.has(tab.id)) {
        err(`${p}.id`, `duplicate tab id "${tab.id}"`);
      } else {
        tabIds.add(tab.id);
      }
      if (typeof tab.label !== "string" || tab.label.length === 0) {
        err(`${p}.label`, "must be a non-empty string");
      }
    });
  }
  const tabsValid = errors.length === errorsBeforeTabs;
  if (!Array.isArray(raw.widgets)) {
    err("widgets", "must be an array");
  }
  const shellValid = errors.length === 0;
  const widgetErrors = {};
  if (Array.isArray(raw.widgets)) {
    raw.widgets.forEach((w, i) => {
      const wErrs = [];
      validateWidget(
        w,
        `widgets[${i}]`,
        tabsValid ? tabIds : null,
        (p, m) => wErrs.push(`${p}: ${m}`)
      );
      if (wErrs.length > 0) {
        widgetErrors[i] = wErrs;
        errors.push(...wErrs);
      }
    });
  }
  if (errors.length > 0) return { errors, shellValid, widgetErrors };
  return {
    config: raw,
    errors,
    shellValid,
    widgetErrors
  };
}
function requireString(obj, key, path, err) {
  const v = obj[key];
  if (typeof v !== "string" || v.length === 0) {
    err(`${path}.${key}`, `must be a non-empty string, got ${show(v)}`);
  }
}
function checkKeys(obj, allowed, path, err) {
  for (const key of Object.keys(obj)) {
    if (!allowed.includes(key)) err(`${path}.${key}`, "unknown key");
  }
}
function validateWidget(w, p, tabIds, err) {
  if (!isObject(w)) {
    err(p, "must be an object");
    return;
  }
  if (!Array.isArray(w.tabs) || w.tabs.length === 0) {
    err(`${p}.tabs`, "must be a non-empty array of tab ids");
  } else if (tabIds) {
    w.tabs.forEach((t, i) => {
      if (typeof t !== "string" || !tabIds.has(t)) {
        err(`${p}.tabs[${i}]`, `unknown tab id ${show(t)}`);
      }
    });
  }
  const type = w.type;
  if (typeof type !== "string" || !WIDGET_TYPES.includes(type)) {
    err(`${p}.type`, `unknown widget type ${show(type)}`);
    return;
  }
  switch (type) {
    case "metric-grid": {
      checkKeys(w, ["type", "tabs", "cards"], p, err);
      if (!Array.isArray(w.cards) || w.cards.length < 1 || w.cards.length > 24) {
        err(`${p}.cards`, "must be an array of 1..24 cards");
        break;
      }
      const seenKeys = /* @__PURE__ */ new Set();
      w.cards.forEach((card, i) => {
        const cp = `${p}.cards[${i}]`;
        if (!isObject(card)) {
          err(cp, "must be an object { key, label, format, hero? }");
          return;
        }
        checkKeys(card, ["key", "label", "format", "hero"], cp, err);
        requireString(card, "key", cp, err);
        if (typeof card.key === "string" && card.key.length > 0) {
          if (seenKeys.has(card.key)) {
            err(`${cp}.key`, `duplicate card key "${card.key}"`);
          }
          seenKeys.add(card.key);
        }
        requireString(card, "label", cp, err);
        if (typeof card.format !== "string" || !CARD_FORMATS.includes(card.format)) {
          err(`${cp}.format`, `unknown value ${show(card.format)}`);
        }
        if (card.hero !== void 0 && typeof card.hero !== "boolean") {
          err(`${cp}.hero`, `must be a boolean, got ${show(card.hero)}`);
        }
      });
      break;
    }
    case "token-burn-chart": {
      checkKeys(w, ["type", "tabs", "source", "metric"], p, err);
      requireString(w, "source", p, err);
      requireString(w, "metric", p, err);
      break;
    }
    case "activity-feed": {
      checkKeys(w, ["type", "tabs", "limit"], p, err);
      if (w.limit !== void 0) {
        if (!Number.isInteger(w.limit) || w.limit < 1 || w.limit > 50) {
          err(`${p}.limit`, `must be an integer 1..50, got ${show(w.limit)}`);
        }
      }
      break;
    }
    case "action-bar": {
      checkKeys(w, ["type", "tabs", "buttons"], p, err);
      if (!Array.isArray(w.buttons) || w.buttons.length < 1 || w.buttons.length > 16) {
        err(`${p}.buttons`, "must be an array of 1..16 buttons");
        break;
      }
      w.buttons.forEach((btn, i) => {
        const bp = `${p}.buttons[${i}]`;
        if (!isObject(btn)) {
          err(bp, "must be an object { skill, label, prompt?, promptLabel?, placeholder? }");
          return;
        }
        checkKeys(btn, ["skill", "label", "prompt", "promptLabel", "placeholder"], bp, err);
        requireString(btn, "skill", bp, err);
        requireString(btn, "label", bp, err);
        if (btn.prompt !== void 0 && btn.prompt !== "topic" && btn.prompt !== "url") {
          err(`${bp}.prompt`, `must be "topic" or "url", got ${show(btn.prompt)}`);
        }
        if (btn.promptLabel !== void 0 && typeof btn.promptLabel !== "string") {
          err(`${bp}.promptLabel`, `must be a string, got ${show(btn.promptLabel)}`);
        }
        if (btn.placeholder !== void 0 && typeof btn.placeholder !== "string") {
          err(`${bp}.placeholder`, `must be a string, got ${show(btn.placeholder)}`);
        }
      });
      break;
    }
    case "focus":
    case "top3":
    case "daily-drivers":
    case "schedule":
    case "runs":
      checkKeys(w, ["type", "tabs"], p, err);
      break;
  }
}
export {
  DEFAULT_CONFIG,
  WIDGET_TYPES,
  validateConfig
};
