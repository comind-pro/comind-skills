/* Dashboard front-end. Vanilla JS, no build step. */

const $ = (sel) => document.querySelector(sel);
const el = (tag, attrs = {}, ...kids) => {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') n.className = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2).toLowerCase(), v);
    else if (v != null) n.setAttribute(k, v);
  }
  for (const kid of kids) {
    if (kid == null) continue;
    n.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }
  return n;
};

const fmtTime = (s) => {
  if (!s) return '—';
  const d = new Date(s);
  const ago = Date.now() - d.getTime();
  if (ago < 60_000) return `${Math.floor(ago / 1000)}s ago`;
  if (ago < 3_600_000) return `${Math.floor(ago / 60_000)}m ago`;
  if (ago < 86_400_000) return `${Math.floor(ago / 3_600_000)}h ago`;
  return d.toISOString().slice(0, 10);
};
const fmtMs = (ms) => (ms == null ? '—' : ms > 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`);
const fmtCost = (n) => (n == null ? '—' : `$${Number(n).toFixed(4)}`);

function renderStatus(s) {
  const pill = $('#status-pill');
  const summary = $('#status-summary');
  if (!s) {
    pill.setAttribute('data-color', '');
    pill.querySelector('.label').textContent = 'no data yet';
    summary.textContent = 'Run a status check to populate.';
    return;
  }
  pill.setAttribute('data-color', s.status);
  pill.querySelector('.label').textContent = `${s.status} · ${fmtTime(s._at)}`;
  summary.textContent = s.summary || '';
}

function renderTaskCounts(rows) {
  const div = $('#task-counts');
  div.innerHTML = '';
  const order = ['overdue', 'blocked', 'in_progress', 'stale', 'todo', 'done'];
  const m = new Map(rows.map((r) => [r.status, r.c]));
  for (const k of order) {
    if (!m.get(k)) continue;
    div.append(el('span', {}, el('strong', {}, String(m.get(k))), ` ${k.replace('_', ' ')}`));
  }
  if (!div.children.length) div.append(el('span', {}, 'no tasks yet'));
}

async function renderTasks() {
  const tasks = await fetch('/api/tasks').then((r) => r.json());
  const ul = $('#task-list');
  ul.innerHTML = '';
  if (!tasks.length) {
    ul.append(el('li', {}, 'No tasks yet. Use /task new in Claude Code.'));
    return;
  }
  for (const t of tasks.slice(0, 12)) {
    ul.append(
      el('li', {},
        el('span', { class: `status ${t.status}` }, t.status),
        el('div', {},
          el('div', { class: 'title' }, t.title),
          el('div', { class: 'meta' },
            [t.area, t.priority, t.due && `due ${t.due}`].filter(Boolean).join(' · ')
          )
        ),
        el('span', { class: 'meta' }, t.assignee || '—')
      )
    );
  }
}

function renderRoutines(routines) {
  const body = $('#routines-body');
  body.innerHTML = '';
  for (const r of routines) {
    const enabled = r.enabled !== false;
    body.append(
      el('tr', {},
        el('td', {}, r.name),
        el('td', {}, r.cron),
        el('td', {}, r.agent),
        el('td', {}, el('span', { class: 'model' }, r.model)),
        el('td', {}, el('span', { class: 'state ' + (enabled ? 'on' : 'off') }, enabled ? 'on' : 'paused')),
        el('td', {},
          el('button', { class: 'primary', onclick: () =>
            fetch(`/api/run/${r.name}`, { method: 'POST' }) }, 'run'),
          ' ',
          el('button', { onclick: () =>
            fetch(`/api/${enabled ? 'pause' : 'resume'}/${r.name}`, { method: 'POST' })
              .then(() => loadOverview()) }, enabled ? 'pause' : 'resume')
        )
      )
    );
  }
}

function renderAgents(agents) {
  const ul = $('#agents-list');
  ul.innerHTML = '';
  for (const a of agents) {
    ul.append(
      el('li', {},
        el('span', { class: 'name' }, a.name),
        el('span', { class: 'model' }, a.model),
        el('div', { class: 'desc' }, a.description)
      )
    );
  }
}

function renderRuns(rows) {
  const body = $('#runs-body');
  body.innerHTML = '';
  for (const r of rows) {
    body.append(
      el('tr', { class: r.is_error ? 'error' : '' },
        el('td', {}, fmtTime(r.started_at)),
        el('td', {}, r.routine),
        el('td', {}, r.num_turns ?? '—'),
        el('td', {}, fmtCost(r.total_cost_usd)),
        el('td', {}, el('button', { onclick: () => openRun(r.id) }, 'open'))
      )
    );
  }
}

async function openRun(id) {
  const r = await fetch(`/api/run/${id}`).then((x) => x.json());
  $('#drawer-title').textContent = `${r.routine} · ${fmtTime(r.started_at)}`;
  $('#drawer-body').textContent =
    `routine:   ${r.routine}
session:   ${r.session_id || '—'}
duration:  ${fmtMs(r.duration_ms)}
turns:     ${r.num_turns ?? '—'}
cost:      ${fmtCost(r.total_cost_usd)}
exit code: ${r.exit_code}
is_error:  ${r.is_error}

──── result ────
${r.result_text || '(no result)'}

──── events (${r.events?.length || 0}) ────
${(r.events || []).map((e) => JSON.stringify(e)).join('\n')}`;
  $('#drawer').classList.add('open');
}
$('#drawer-close').addEventListener('click', () => $('#drawer').classList.remove('open'));

const liveFeed = $('#live-feed');
const MAX_LIVE = 80;
function pushLive(kind, text) {
  const now = new Date().toISOString().slice(11, 19);
  const li = el('li', {},
    el('span', { class: 'ts' }, now),
    el('span', {},
      el('span', { class: 'kind ' + kind }, kind),
      ' ',
      el('span', {}, text)
    )
  );
  liveFeed.prepend(li);
  while (liveFeed.children.length > MAX_LIVE) liveFeed.lastChild.remove();
}

function describeEvent(evt) {
  if (evt.type === 'assistant') {
    const c = evt.message?.content?.[0];
    if (c?.type === 'tool_use') return ['tool_use', `${c.name}(${Object.keys(c.input || {}).join(', ')})`];
    if (c?.type === 'text') return ['text', (c.text || '').slice(0, 200)];
  }
  if (evt.type === 'user') {
    const c = evt.message?.content?.[0];
    if (c?.type === 'tool_result') {
      const t = typeof c.content === 'string' ? c.content : JSON.stringify(c.content);
      return ['tool_use', `← ${t.slice(0, 200)}`];
    }
  }
  if (evt.type === 'result') {
    return [evt.is_error ? 'error' : 'result', (evt.result || '').slice(0, 300)];
  }
  if (evt.type === 'system') return ['text', `system: ${evt.subtype || ''}`];
  return ['text', evt.type];
}

async function loadOverview() {
  const o = await fetch('/api/overview').then((r) => r.json());
  $('#project-name').textContent = o.project;
  $('#project-path').textContent = o.project_root;
  renderStatus(o.status);
  renderTaskCounts(o.tasks_by_status);
  renderRoutines(o.routines);
  renderAgents(o.agents);
  renderRuns(o.recent_runs);
  renderTasks();
}

loadOverview();

const es = new EventSource('/api/stream');
es.addEventListener('run-started', (e) => {
  const d = JSON.parse(e.data);
  pushLive('text', `▶ ${d.routine} started`);
  setTimeout(loadOverview, 600);
});
es.addEventListener('run-event', (e) => {
  const d = JSON.parse(e.data);
  const [kind, text] = describeEvent(d.event);
  pushLive(kind, text);
});
es.addEventListener('memory-changed', () => renderTasks());
es.addEventListener('routine-paused', loadOverview);
es.addEventListener('routine-resumed', loadOverview);
es.addEventListener('routine-launched', (e) => {
  const d = JSON.parse(e.data);
  pushLive('text', `▶ launched ${d.name} (manual)`);
});

setInterval(loadOverview, 30_000);
