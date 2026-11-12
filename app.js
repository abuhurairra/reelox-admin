'use strict';
/* Reelox Admin app. Talks to the Apps Script server (actions starting with "admin."). */
const API = 'https://script.google.com/macros/s/AKfycbyiY_4JR7Sls5neh_aR6px7hG9W-yG9YKbwjm31AhoeMcuIiqPxOzWF9WRaGavWC6Vn/exec';
const VERSION = '1.1.2';
const LOCK_AFTER_MS = 2 * 60 * 1000;

/* ---------- tiny helpers ---------- */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const store = {
  get(k, d = null) { try { const v = localStorage.getItem('rx.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('rx.' + k, JSON.stringify(v)); } catch (e) { /* storage full or blocked */ } },
  del(k) { try { localStorage.removeItem('rx.' + k); } catch (e) { /* ignore */ } }
};
const pkr = (n) => 'Rs ' + Math.round(n || 0).toLocaleString('en-IN');
const usd = (n) => '$' + Number(n || 0).toLocaleString('en-US');
const short = (n) => { n = Math.round(n || 0); const a = Math.abs(n); if (a >= 10000000) return (n / 10000000).toFixed(1).replace(/\.0$/, '') + ' crore'; if (a >= 100000) return (n / 100000).toFixed(1).replace(/\.0$/, '') + ' lakh'; return n.toLocaleString('en-IN'); };
const fmtMins = (m) => { const h = Math.floor(m / 60), mm = m % 60; return ((h + 11) % 12 + 1) + ':' + String(mm).padStart(2, '0') + ' ' + (h >= 12 ? 'PM' : 'AM'); };
const todayYmd = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const thisMonth = () => todayYmd().slice(0, 7);
const shiftMonth = (ym, k) => { const [y, m] = ym.split('-').map(Number); const d = new Date(y, m - 1 + k, 1); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); };
const monthLabel = (ym) => { const [y, m] = ym.split('-').map(Number); return new Date(y, m - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }); };
const dayLabel = (ymd) => { if (!ymd) return ''; const [y, m, d] = ymd.split('-').map(Number); return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); };
const initials = (n) => String(n || '').split(/\s+/).slice(0, 2).map((w) => w.charAt(0).toUpperCase()).join('');
const ago = (t) => { const s = Math.round((Date.now() - t) / 1000); if (s < 60) return 'just now'; if (s < 3600) return Math.round(s / 60) + ' min ago'; if (s < 86400) return Math.round(s / 3600) + ' h ago'; return Math.round(s / 86400) + ' days ago'; };

const ICONS = {
  home: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/>',
  cal: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  money: '<rect x="3" y="6" width="18" height="12" rx="3"/><circle cx="12" cy="12" r="2.5"/>',
  team: '<circle cx="9" cy="8" r="3.5"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7"/><path d="M18 14c2 .7 3 2.6 3 6"/>',
  more: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', minus: '<path d="M5 12h14"/>',
  bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
  mega: '<path d="M3 11l14-6v14L3 13z"/><path d="M7 13v5a2 2 0 0 0 4 0v-3"/>',
  doc: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h5"/>',
  share: '<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="M8.2 10.8l7.6-4.3M8.2 13.2l7.6 4.3"/>',
  cam: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  alert: '<path d="M12 3l9 16H3z"/><path d="M12 10v4M12 17v.5"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l8-8M16 7l3 3"/>',
  back: '<path d="M15 5l-7 7 7 7"/>', next: '<path d="M9 5l7 7-7 7"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  finger: '<path d="M12 11v3a6 6 0 0 1-1 3.3"/><path d="M8.5 7.5A5 5 0 0 1 17 11v2a10 10 0 0 1-.6 3.4"/><path d="M5.6 9.5A8 8 0 0 1 20 11v1"/><path d="M8 11a4 4 0 0 1 1-2.6M8 14v-1M7.5 18.5A9 9 0 0 0 8 16"/>',
  send: '<path d="M21 3L10 14"/><path d="M21 3l-7 18-4-7-7-4z"/>',
  repeat: '<path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/>',
  download: '<path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M4 21h16"/>',
  wifioff: '<path d="M2 8.8a15 15 0 0 1 4.2-2.6M10.7 5.1A15 15 0 0 1 22 8.8"/><path d="M5 12.5a10 10 0 0 1 5-2.4M14.5 10.4a10 10 0 0 1 4.5 2.1"/><path d="M8.5 16a5 5 0 0 1 7 0"/><path d="M12 20h.01"/><path d="M3 3l18 18"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  tasks: '<rect x="3" y="4" width="7" height="16" rx="2"/><rect x="14" y="4" width="7" height="10" rx="2"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  install: '<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M12 7v7M9 11l3 3 3-3"/>'
};
const ic = (n) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[n] || '') + '</svg>';

/* ---------- server ---------- */
class OfflineError extends Error {}
async function api(action, data) {
  const body = Object.assign({ action: 'admin.' + action, token: store.get('token') }, data || {});
  let res;
  try {
    res = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body) });
  } catch (e) { throw new OfflineError('You are offline.'); }
  let j;
  try { j = await res.json(); } catch (e) { throw new Error('The server did not answer properly. Try again.'); }
  if (!j.ok) {
    if (j.auth) { store.del('token'); setTimeout(showLogin, 0); }
    throw new Error(j.error || 'Something went wrong.');
  }
  return j;
}

/* ---------- theme ---------- */
function applyTheme() {
  const t = store.get('theme', 'auto');
  if (t === 'auto') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', t);
  const dark = t === 'dark' || (t === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  const meta = $('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', dark ? '#0A0A0F' : '#EFE9FF');
}

/* ---------- toast ---------- */
let toastTimer = null;
function toast(msg, actionLabel, onAction, ms) {
  let el = $('#toast');
  if (!el) { el = document.createElement('div'); el.id = 'toast'; el.className = 'toast'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
  el.innerHTML = '<span>' + esc(msg) + '</span>' + (actionLabel ? '<button type="button">' + esc(actionLabel) + '</button>' : '');
  el.classList.remove('hidden');
  if (actionLabel) el.querySelector('button').onclick = () => { el.classList.add('hidden'); onAction(); };
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), ms || (actionLabel ? 8000 : 3000));
}

/* ---------- sheets (bottom sheets / dialogs) ---------- */
let sheetReturnFocus = null;
function openSheet(title, inner, onMount) {
  closeSheet();
  sheetReturnFocus = document.activeElement;
  const s = document.createElement('div');
  s.className = 'scrim';
  s.id = 'sheet';
  s.innerHTML = '<div class="sheet" role="dialog" aria-modal="true" aria-label="' + esc(title) + '"><div class="handle"></div>' +
    '<div class="row between"><h2 class="title">' + esc(title) + '</h2><button type="button" class="iconbtn" data-close aria-label="Close">' + ic('plus').replace('<path d="M12 5v14M5 12h14"/>', '<path d="M6 6l12 12M18 6L6 18"/>') + '</button></div>' + inner + '</div>';
  document.body.appendChild(s);
  s.addEventListener('click', (e) => { if (e.target === s || e.target.closest('[data-close]')) closeSheet(); });
  s.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSheet(); });
  if (onMount) onMount(s.querySelector('.sheet'));
  const first = s.querySelector('input, textarea, select, button:not([data-close])');
  if (first) setTimeout(() => first.focus(), 30);
  return s.querySelector('.sheet');
}
function closeSheet() {
  const s = $('#sheet');
  if (s) { s.remove(); if (sheetReturnFocus && sheetReturnFocus.focus) sheetReturnFocus.focus(); }
}
function busy(btn, on, label) {
  if (!btn) return;
  if (on) { btn.dataset.label = btn.innerHTML; btn.disabled = true; btn.textContent = label || 'Saving...'; }
  else { btn.disabled = false; if (btn.dataset.label) btn.innerHTML = btn.dataset.label; }
}
function confirmSheet(title, text, yesLabel, danger) {
  return new Promise((resolve) => {
    const sh = openSheet(title, '<p style="margin:0">' + esc(text) + '</p><div class="row"><button type="button" class="btn sec grow" data-no>Cancel</button><button type="button" class="btn ' + (danger ? 'danger' : 'pri') + ' grow" data-yes>' + esc(yesLabel) + '</button></div>');
    sh.querySelector('[data-no]').onclick = () => { closeSheet(); resolve(false); };
    sh.querySelector('[data-yes]').onclick = () => { closeSheet(); resolve(true); };
  });
}

/* ---------- views with offline cache ---------- */
let renderId = 0;
const main = () => $('#view');
function skeleton() {
  const row = '<div class="list-row"><span class="ibox" style="background:var(--grey-bg)"></span><div class="grow"><div class="sk" style="width:60%"></div><div class="sk" style="width:40%;margin-top:8px"></div></div></div>';
  return '<div class="card tight" aria-busy="true" aria-label="Loading">' + row + row + row + '</div>';
}
function paint(html) { const m = main(); if (m) m.innerHTML = html; }
async function load(key, action, params, draw, header) {
  const id = ++renderId;
  const ck = 'cache.' + key;
  const cached = store.get(ck);
  const head = header || '';
  if (cached) paint(head + draw(cached.d)); else paint(head + skeleton());
  try {
    const d = await api(action, params);
    if (id !== renderId) return null;
    store.set(ck, { d: d, t: Date.now() });
    paint(head + draw(d));
    return d;
  } catch (e) {
    if (id !== renderId) return null;
    if (e instanceof OfflineError) {
      const b = '<div class="banner" role="status">' + ic('wifioff') + '<span class="grow">' + (cached ? 'Offline · showing data from ' + esc(ago(cached.t)) : 'You are offline. Connect to the internet to load this.') + '</span><button type="button" class="btn sec" style="height:32px" data-act="retry">Retry</button></div>';
      paint(head + b + (cached ? draw(cached.d) : ''));
    } else {
      paint(head + '<div class="card empty"><div class="ibox">' + ic('alert') + '</div><p class="strong" style="margin:0 0 4px">Couldn’t load this</p><p class="sub" style="margin:0 0 16px">' + esc(e.message) + '</p><button type="button" class="btn pri" data-act="retry">Try again</button></div>');
    }
    return cached ? cached.d : null;
  }
}
function topBar(title, sub, right, back) {
  return '<header class="top"><div class="row" style="gap:8px;min-width:0">' + (back ? '<a class="iconbtn back" href="' + back + '" aria-label="Back">' + ic('back') + '</a>' : '') +
    '<div style="min-width:0">' + (sub ? '<div class="sub">' + esc(sub) + '</div>' : '') + '<h1 class="title ellipsis">' + esc(title) + '</h1></div></div>' + (right || '') + '</header>';
}
function monthNav(ym, act) {
  return '<div class="row" style="gap:4px"><button type="button" class="iconbtn" data-act="' + act + '" data-k="-1" aria-label="Previous month">' + ic('back') + '</button>' +
    '<span class="pill vio" style="height:32px;padding:0 12px">' + esc(monthLabel(ym)) + '</span>' +
    '<button type="button" class="iconbtn" data-act="' + act + '" data-k="1" aria-label="Next month"' + (ym >= thisMonth() ? ' disabled' : '') + '>' + ic('next') + '</button></div>';
}
function emptyBox(icon, title, text, btn) {
  return '<div class="card empty"><div class="ibox">' + ic(icon) + '</div><p class="h" style="margin:0 0 4px">' + esc(title) + '</p><p class="sub" style="margin:0">' + esc(text) + '</p>' + (btn || '') + '</div>';
}
function spark(vals) {
  const w = 120, h = 36, max = Math.max(...vals.map(Math.abs), 1), min = Math.min(...vals, 0);
  const pts = vals.map((v, i) => (2 + i * (w - 4) / Math.max(1, vals.length - 1)).toFixed(1) + ' ' + (h - 4 - ((v - min) / (max - min || 1)) * (h - 8)).toFixed(1));
  return '<svg width="120" height="36" viewBox="0 0 120 36" aria-hidden="true"><path d="M' + pts.join(' L') + '" fill="none" stroke="var(--violet)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
}
function barChart(months) {
  const max = Math.max(1, ...months.map((m) => Math.max(m.in, m.out)));
  return '<div class="chart" role="img" aria-label="Money in and out by month">' + months.map((m) => '<div class="col"><div class="pair"><i class="in" style="height:' + (m.in / max * 100) + '%"></i><i class="out" style="height:' + (m.out / max * 100) + '%"></i></div><span class="sub">' + esc(m.label) + '</span></div>').join('') +
    '</div><div class="legend"><span><i style="background:var(--violet)"></i>In</span><span><i style="background:var(--bar-out)"></i>Out</span></div>';
}

/* ---------- routing ---------- */
const TABS = [['home', 'Home', '#/home'], ['cal', 'Attendance', '#/attendance'], ['money', 'Money', '#/money'], ['team', 'Team', '#/team'], ['more', 'More', '#/more']];
const SIDE = [['home', 'Home', '#/home'], ['cal', 'Attendance', '#/attendance'], ['money', 'Money', '#/money'], ['team', 'Team and payroll', '#/team'], ['tasks', 'Tasks', '#/tasks'], ['chart', 'Reports', '#/reports'], ['more', 'More', '#/more']];
function route() {
  const hash = location.hash || '#/home';
  const parts = hash.slice(2).split('/').map(decodeURIComponent);
  const base = (parts[0] || 'home').split('?')[0];
  const tabKey = { home: 'home', attendance: 'cal', money: 'money', team: 'team', payroll: 'team' }[base] || 'more';
  const sideKey = { home: 'home', attendance: 'cal', money: 'money', team: 'team', payroll: 'team', tasks: 'tasks', reports: 'chart' }[base] || 'more';
  $$('.tabbar a').forEach((a) => { if (a.dataset.k === tabKey) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  $$('.side a').forEach((a) => { if (a.dataset.k === sideKey) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  closeSheet();
  const views = { home: vHome, attendance: vAttendance, money: vMoney, team: parts[1] ? () => vEditor(parts[1]) : vTeam, payroll: vPayroll, more: vMore, tasks: vTasks, plan: vPlan, reports: vReports, alerts: vAlerts, settings: vSettings };
  (views[base] || vHome)();
  window.scrollTo(0, 0);
  const m = main(); if (m) m.focus({ preventScroll: true });
}

/* ---------- HOME ---------- */
function vHome() {
  load('home', 'home', {}, (d) => {
    const t = d.today;
    const onTime = t.rows.filter((r) => r.kind === 'ok' || (r.kind === 'done' && !r.wasLate)).length;
    const pct = t.total ? t.present / t.total : 0;
    const C = 2 * Math.PI * 40;
    const greet = d.mins < 720 ? 'Good morning' : d.mins < 1020 ? 'Good afternoon' : 'Good evening';
    let h = topBar(greet + ', ' + (store.get('ownerName') || 'Abu'), new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }),
      '<a class="iconbtn" href="#/alerts" aria-label="Alerts">' + ic('bell') + '</a>');
    h += '<section class="hero row" style="gap:16px" aria-label="Live attendance"><div class="ring"><svg viewBox="0 0 96 96"><circle cx="48" cy="48" r="40" fill="none" stroke="var(--ring-track)" stroke-width="10"/><circle cx="48" cy="48" r="40" fill="none" stroke="var(--ring)" stroke-width="10" stroke-linecap="round" stroke-dasharray="' + (C * pct).toFixed(1) + ' ' + C.toFixed(1) + '"/></svg><div class="c"><div class="v">' + t.present + '/' + t.total + '</div><div style="font-size:12px;opacity:.85">in office</div></div></div>' +
      '<div class="stack" style="gap:4px"><div class="h">Live attendance</div><div style="font-size:14px;opacity:.9">' + onTime + ' on time · ' + t.late + ' late · ' + t.notIn + ' not in yet</div><div style="font-size:12px;opacity:.75">' + (t.workday ? 'Office opens ' + fmtMins(d.start) : 'Today is a day off') + '</div></div></section>';
    d.late.forEach((l) => {
      h += '<div class="alert" role="note"><span class="ibox">' + ic('alert') + '</span><div class="grow"><div class="strong">' + esc(l.name) + ' checked in ' + l.lateMin + ' min late</div><div class="sub">' + esc(l.at) + (l.reason ? ' · ' + esc(l.reason) : '') + ' · ' + l.lates + ' of ' + l.per + ' lates this month</div></div></div>';
    });
    h += '<div class="quick">' +
      '<button type="button" data-act="addMoney" data-type="Out"><span class="q">' + ic('minus') + '</span>Expense</button>' +
      '<button type="button" data-act="addMoney" data-type="In"><span class="q">' + ic('plus') + '</span>Income</button>' +
      '<button type="button" data-act="go" data-href="#/attendance?leaves"><span class="q">' + ic('cal') + (d.pendingLeaves ? '<span class="badge">' + d.pendingLeaves + '</span>' : '') + '</span>Leaves</button>' +
      '<button type="button" data-act="announce"><span class="q">' + ic('mega') + '</span>Announce</button></div>';
    h += '<div class="grid2"><div class="stack">';
    h += '<section class="card"><div class="row between" style="margin-bottom:4px"><h2 class="h">Due today</h2><a class="seeall" href="#/tasks">See all</a></div>' +
      (d.due.length ? d.due.map((x) => '<div class="list-row"><div class="grow"><div class="strong ellipsis">' + esc(x.title) + '</div><div class="sub ellipsis">' + esc([x.client, x.who].filter(Boolean).join(' · ')) + '</div></div><span class="pill ' + (x.overdue ? 'bad' : 'late') + '">' + (x.overdue ? x.daysLate + (x.daysLate === 1 ? ' day' : ' days') + ' late' : 'Due today') + '</span></div>').join('') : '<p class="sub" style="margin:8px 0 0">Nothing due today.</p>') + '</section>';
    h += '<a class="card row between" href="#/money" style="color:inherit"><div><div class="k">Profit this month</div><div class="v ' + (d.money.profit < 0 ? 't-bad' : '') + '">' + pkr(d.money.profit) + '</div><div class="sub">In ' + short(d.money.in) + ' · Out ' + short(d.money.out) + '</div></div>' + spark(d.money.spark) + '</a>';
    h += '</div><section class="card tight" aria-label="Team today"><div class="h" style="padding:12px 0 4px">Team today</div>' + t.rows.map((r) => '<div class="list-row"><span class="av">' + esc(r.initials) + '</span><div class="grow"><div class="strong ellipsis">' + esc(r.name) + '</div><div class="sub ellipsis">' + esc(r.task || (r.kind === 'wait' ? 'No check-in yet' : r.kind === 'absent' ? 'Did not check in' : '')) + '</div></div><span class="pill ' + r.kind + '">' + esc(r.status) + '</span></div>').join('') + '</section></div>';
    return h;
  });
}

/* ---------- ATTENDANCE ---------- */
const att = { month: thisMonth(), name: null, tab: 'cal', day: null };
function vAttendance() {
  if (location.hash.indexOf('leaves') > -1) att.tab = 'leaves';
  const seg = '<div class="seg" role="group" aria-label="View"><button type="button" aria-pressed="' + (att.tab === 'cal') + '" data-act="attTab" data-v="cal">Calendar</button><button type="button" aria-pressed="' + (att.tab === 'leaves') + '" data-act="attTab" data-v="leaves">Leaves</button></div>';
  if (att.tab === 'leaves') {
    load('leaves', 'leaves', {}, (d) => {
      let h = '';
      if (!d.pending.length) h += emptyBox('cal', 'No leave requests waiting', 'When an editor asks for leave from their PC, it shows up here.');
      d.pending.forEach((r) => {
        h += '<section class="card"><div class="row"><span class="av">' + esc(initials(r.name)) + '</span><div class="grow"><div class="strong">' + esc(r.name) + '</div><div class="sub">' + esc(dayLabel(r.from) + (r.to && r.to !== r.from ? ' – ' + dayLabel(r.to) : '')) + ' · ' + esc(r.reason || 'No reason') + '</div></div></div>' +
          '<div class="row" style="margin-top:12px"><button type="button" class="btn sec grow" data-act="leaveDecide" data-row="' + r.row + '" data-yes="0">Decline</button><button type="button" class="btn pri grow" data-act="leaveDecide" data-row="' + r.row + '" data-yes="1">Approve</button></div></section>';
      });
      if (d.recent.length) h += '<section class="card tight"><div class="h" style="padding:12px 0 4px">Decided</div>' + d.recent.map((r) => '<div class="list-row"><div class="grow"><div class="strong">' + esc(r.name) + '</div><div class="sub">' + esc(dayLabel(r.from) + (r.to && r.to !== r.from ? ' – ' + dayLabel(r.to) : '') + ' · ' + r.reason) + '</div></div><span class="pill ' + (r.status === 'Approved' ? 'ok' : 'grey') + '">' + esc(r.status) + '</span></div>').join('') + '</section>';
      return h;
    }, topBar('Attendance') + seg);
    return;
  }
  load('att.' + att.month + '.' + (att.name || ''), 'attendance', { month: att.month, name: att.name }, (d) => {
    att.name = d.name;
    const names = '<div class="scrollx" role="group" aria-label="Person">' + d.names.map((n) => '<button type="button" class="chip" aria-pressed="' + (n === d.name) + '" data-act="attName" data-v="' + esc(n) + '">' + esc(n) + '</button>').join('') + '</div>';
    const today = todayYmd();
    let cal = '';
    for (let i = 0; i < d.firstDow; i++) cal += '<span></span>';
    d.days.forEach((x) => {
      const dis = x.st === 'future' || x.st === 'none';
      cal += '<button type="button" class="s-' + x.st + (x.date === today ? ' today' : '') + '" data-act="attDay" data-v="' + x.d + '"' + (dis ? ' disabled' : '') + ' aria-label="' + x.d + ' ' + esc(x.st) + '">' + x.d + '<i></i></button>';
    });
    const sel = att.day ? d.days.find((x) => x.d === att.day) : null;
    const word = { ok: 'On time', late: 'Late', absent: 'Absent', leave: 'On leave', off: 'Day off', wait: 'Not in yet', none: 'Not counted', future: '' };
    let h = names + '<section class="card"><div class="row" style="justify-content:center;margin-bottom:12px">' + monthNav(d.month, 'attMonth') + '</div>' +
      '<div class="cal-head" aria-hidden="true"><div>M</div><div>T</div><div>W</div><div>T</div><div>F</div><div>S</div><div>S</div></div><div class="cal">' + cal + '</div>' +
      '<div class="legend wrap"><span><i style="background:#17A05D"></i>On time</span><span><i style="background:#E8892B"></i>Late</span><span><i style="background:#E5484D"></i>Absent</span><span><i style="background:#5B8DEF"></i>Leave</span></div></section>';
    if (sel) h += '<section class="card"><div class="row between"><div class="h">' + esc(dayLabel(sel.date)) + '</div><span class="pill ' + sel.st + '">' + esc(word[sel.st] || '') + '</span></div>' +
      (sel.in ? '<div class="sub" style="margin-top:4px">In ' + esc(sel.in) + (sel.outT ? ' · Out ' + esc(sel.outT) : '') + ' · ' + sel.hours + ' h' + (sel.lateMin ? ' · ' + sel.lateMin + ' min late' : '') + '</div>' : '') +
      (sel.task ? '<div style="margin-top:4px">' + esc(sel.task) + '</div>' : '') + (sel.reason ? '<div class="sub">Reason: ' + esc(sel.reason) + '</div>' : '') + '</section>';
    h += '<div class="tiles"><div class="card"><div class="k">Present</div><div class="v">' + (d.totals.ok + d.totals.late) + '</div></div><div class="card"><div class="k">Late</div><div class="v t-late">' + d.totals.late + '</div></div><div class="card"><div class="k">Absent</div><div class="v t-bad">' + d.totals.absent + '</div></div></div>' +
      '<div class="tiles"><div class="card"><div class="k">Leave</div><div class="v">' + d.totals.leave + '</div></div><div class="card"><div class="k">Hours</div><div class="v">' + d.totals.hours + '</div></div><div class="card"><div class="k">Shift</div><div class="strong" style="margin-top:4px">' + (d.shift ? fmtMins(d.shift.start) : '–') + '</div></div></div>';
    return h;
  }, topBar('Attendance') + seg);
}

/* ---------- MONEY ---------- */
const mon = { tab: 'overview', month: thisMonth(), filter: 'all' };
function moneySeg() {
  return '<div class="seg" role="group" aria-label="Money view">' + [['overview', 'Overview'], ['invoices', 'Invoices'], ['clients', 'Clients']].map(([k, l]) => '<button type="button" aria-pressed="' + (mon.tab === k) + '" data-act="monTab" data-v="' + k + '">' + l + '</button>').join('') + '</div>';
}
function vMoney() {
  const head = topBar('Money', null, mon.tab === 'overview' ? monthNav(mon.month, 'monMonth') : '') + moneySeg();
  if (mon.tab === 'invoices') return load('invoices', 'invoices', {}, drawInvoices, head);
  if (mon.tab === 'clients') return load('clients', 'clients', {}, drawClients, head);
  load('money.' + mon.month, 'money', { month: mon.month }, (d) => {
    store.set('lists', d.lists);
    let h = '<div class="tiles"><div class="card" style="background:var(--violet);border-color:var(--violet);color:#fff"><div class="k" style="color:#EDE6FF">In</div><div class="v">' + short(d.in) + '</div></div><div class="card"><div class="k">Out</div><div class="v">' + short(d.out) + '</div></div><div class="card"><div class="k">Profit</div><div class="v ' + (d.profit < 0 ? 't-bad' : 't-ok') + '">' + short(d.profit) + '</div></div></div>' +
      '<div class="row"><button type="button" class="btn sec grow" data-act="addMoney" data-type="Out">' + ic('minus') + 'Add expense</button><button type="button" class="btn pri grow" data-act="addMoney" data-type="In">' + ic('plus') + 'Add income</button></div>';
    h += '<div class="grid2"><div class="stack"><section class="card"><h2 class="h">Last 6 months</h2>' + barChart(d.months) + '</section>';
    h += '<section class="card"><h2 class="h">Spending by category</h2><div class="sub" style="margin:4px 0 8px">Office ' + pkr(d.office) + ' · Personal ' + pkr(d.personal) + '</div>' +
      (d.categories.length ? d.categories.map((c) => '<div style="padding:8px 0"><div class="row between"><span>' + esc(c.name) + '</span><span class="strong num">' + pkr(c.amount) + '</span></div><div class="barbox" style="margin-top:8px"><div class="bar" style="width:' + (c.amount / d.categories[0].amount * 100) + '%"></div></div></div>').join('') : '<p class="sub" style="margin:0">No spending this month.</p>') + '</section></div>';
    const list = d.list.filter((x) => mon.filter === 'all' || (mon.filter === 'in' ? x.type === 'In' : x.type === 'Out'));
    h += '<div class="stack"><div class="seg" role="group" aria-label="Filter">' + [['all', 'All'], ['in', 'In'], ['out', 'Out']].map(([k, l]) => '<button type="button" aria-pressed="' + (mon.filter === k) + '" data-act="monFilter" data-v="' + k + '">' + l + '</button>').join('') + '</div>';
    h += list.length ? '<section class="card tight">' + list.map((x) => '<button type="button" class="list-row" data-act="moneyItem" data-row="' + x.row + '"><span class="ibox" style="' + (x.type === 'In' ? 'background:var(--ok-bg);color:var(--ok)' : 'background:var(--grey-bg);color:var(--grey)') + '">' + ic('money') + '</span><div class="grow"><div class="strong ellipsis">' + esc(x.note || x.cat || x.client || (x.type === 'In' ? 'Money in' : 'Expense')) + '</div><div class="sub ellipsis">' + esc([x.cat, x.type === 'In' ? x.client : x.scope, dayLabel(x.date)].filter(Boolean).join(' · ')) + '</div></div><div style="text-align:right"><div class="strong num ' + (x.type === 'In' ? 't-ok' : '') + '">' + (x.type === 'In' ? '+' : '−') + pkr(x.amount).replace('Rs ', '') + '</div>' + (x.receipt ? '<div class="sub" style="color:var(--violet-ink)">Receipt</div>' : x.original ? '<div class="sub">' + esc(x.original.split(' @')[0]) + '</div>' : '') + '</div></button>').join('') + '</section>'
      : emptyBox('money', mon.filter === 'all' ? 'No money added this month' : 'Nothing here', 'Add an expense or income, or snap a receipt.', '<button type="button" class="btn pri" style="margin-top:16px" data-act="addMoney" data-type="Out">Add expense</button>');
    h += '</div></div>';
    MONEY_ITEMS = d.list;
    return h;
  }, head);
}
let MONEY_ITEMS = [];
function drawInvoices(d) {
  INVOICES = d.list;
  let h = '<section class="hero"><div style="font-size:12px;opacity:.85">Clients owe you</div><div class="big">' + (d.owedUsd ? usd(d.owedUsd) : pkr(d.owedPkr)) + '</div><div style="font-size:12px;opacity:.85">' + (d.owedUsd ? '≈ ' + pkr(d.owedPkr) + ' at ' + d.rate + ' · ' : '') + d.overdue + ' overdue</div></section>';
  h += '<button type="button" class="btn pri block" data-act="newInvoice">' + ic('plus') + 'New invoice</button>';
  if (!d.list.length) return h + emptyBox('doc', 'No invoices yet', 'Add one when you bill a client. You’ll see who owes you and get a reminder when it’s overdue.');
  d.list.forEach((i) => {
    const st = i.paid ? ['ok', 'Paid ' + dayLabel(i.paidOn)] : i.days === null ? ['grey', 'No due date'] : i.days < 0 ? ['bad', 'Overdue ' + (-i.days) + (i.days === -1 ? ' day' : ' days')] : i.days === 0 ? ['late', 'Due today'] : ['late', 'Due in ' + i.days + (i.days === 1 ? ' day' : ' days')];
    h += '<section class="card"><div class="row between" style="align-items:flex-start"><div style="min-width:0"><div class="strong">' + esc(i.client) + '</div><div class="sub">' + esc(i.no + (i.desc ? ' · ' + i.desc : '')) + '</div></div><span class="pill ' + st[0] + '">' + esc(st[1]) + '</span></div>' +
      '<div class="row between" style="margin-top:8px"><div><div class="v">' + (i.currency === 'USD' ? usd(i.amount) : pkr(i.amount)) + '</div>' + (i.currency === 'USD' ? '<div class="sub">' + pkr(i.pkr) + '</div>' : '') + '</div>' +
      (i.paid ? '' : '<div class="row" style="gap:8px"><button type="button" class="btn sec" data-act="remind" data-row="' + i.row + '">' + ic('send') + 'Remind</button><button type="button" class="btn pri" data-act="invoicePaid" data-row="' + i.row + '">Paid</button></div>') + '</div></section>';
  });
  return h;
}
let INVOICES = [];
function drawClients(d) {
  let h = '<p class="sub" style="margin:0">Last 30 days. Editor cost = hours on that client’s tasks × hourly salary.</p>';
  if (!d.clients.length) return h + emptyBox('chart', 'No client data yet', 'Add money in with a client, and check in with tasks from Notion.');
  d.clients.forEach((c) => {
    const cls = c.margin >= 50 ? 'ok' : c.margin >= 25 ? 'late' : 'bad';
    h += '<section class="card"><div class="row between"><div class="strong">' + esc(c.name) + '</div><span class="pill ' + cls + '">' + c.margin + '% margin</span></div>' +
      '<div class="tiles" style="margin-top:8px"><div><div class="k">Income</div><div class="strong num">' + pkr(c.income) + '</div></div><div><div class="k">Editor cost</div><div class="strong num">' + pkr(c.cost) + '</div><div class="sub">' + c.hours + ' h</div></div><div><div class="k">Profit</div><div class="strong num ' + (c.profit < 0 ? 't-bad' : 't-ok') + '">' + pkr(c.profit) + '</div></div></div>' +
      '<div class="barbox" style="margin-top:8px"><div class="bar" style="width:' + Math.max(0, Math.min(100, c.margin)) + '%"></div></div></section>';
  });
  return h;
}

/* add money sheet */
async function compressImage(file) {
  const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = URL.createObjectURL(file); });
  const scale = Math.min(1, 1600 / Math.max(img.width, img.height));
  const c = document.createElement('canvas'); c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  URL.revokeObjectURL(img.src);
  const url = c.toDataURL('image/jpeg', 0.8);
  return { data: url.split(',')[1], mime: 'image/jpeg', preview: url };
}
function addMoneySheet(type, preset) {
  const lists = store.get('lists', { out: ['Rent', 'Salaries', 'Internet and phone', 'Food and tea', 'Equipment', 'Transport', 'Other'], in: ['Client payment', 'Other income'], clients: [] });
  const st = Object.assign({ type: type || 'Out', currency: 'PKR', rate: null, category: '', scope: 'Office', client: '', receipt: null, invoiceRow: null }, preset || {});
  const draw = () => {
    const isIn = st.type === 'In';
    const cats = isIn ? lists.in : lists.out;
    return '<div class="seg" role="group" aria-label="Type"><button type="button" aria-pressed="' + !isIn + '" data-t="Out">Money out</button><button type="button" aria-pressed="' + isIn + '" data-t="In">Money in</button></div>' +
      '<div><div class="row between"><span class="sub strong">Amount</span><div class="seg" role="group" aria-label="Currency" style="padding:2px"><button type="button" style="height:28px;padding:0 12px" aria-pressed="' + (st.currency === 'PKR') + '" data-c="PKR">PKR</button><button type="button" style="height:28px;padding:0 12px" aria-pressed="' + (st.currency === 'USD') + '" data-c="USD">USD</button></div></div>' +
      '<label class="amount" style="margin-top:8px"><span>' + (st.currency === 'USD' ? '$' : 'Rs') + '</span><input id="mAmount" inputmode="decimal" autocomplete="off" aria-label="Amount" placeholder="0" value="' + esc(st.amount || '') + '"></label></div>' +
      (st.currency === 'USD' ? '<div class="row between card" style="padding:12px;border-radius:12px;box-shadow:none;background:var(--surface-2)"><div><div class="sub">Rate</div><div class="strong">1 USD = Rs <input id="mRate" inputmode="decimal" aria-label="Rate" style="width:72px;border:0;background:transparent;font-weight:500;color:var(--ink)" value="' + esc(st.rate || '') + '"></div></div><div style="text-align:right"><div class="sub">You get</div><div class="strong t-ok" id="mGet">–</div></div></div>' : '') +
      '<div><div class="sub strong" style="margin-bottom:8px">' + (isIn ? 'Category' : 'Category') + '</div><div class="chips" role="group" aria-label="Category">' + cats.map((c) => '<button type="button" class="chip" data-cat="' + esc(c) + '" aria-pressed="' + (st.category === c) + '">' + esc(c) + '</button>').join('') + '</div></div>' +
      (isIn ? (lists.clients.length ? '<div><div class="sub strong" style="margin-bottom:8px">Client</div><div class="chips" role="group" aria-label="Client">' + lists.clients.map((c) => '<button type="button" class="chip" data-cl="' + esc(c) + '" aria-pressed="' + (st.client === c) + '">' + esc(c) + '</button>').join('') + '</div></div>' : '')
        : '<div class="seg" role="group" aria-label="Office or personal"><button type="button" aria-pressed="' + (st.scope === 'Office') + '" data-s="Office">Office</button><button type="button" aria-pressed="' + (st.scope === 'Personal') + '" data-s="Personal">Personal</button></div>') +
      '<div class="row">' + (st.receipt ? '<img src="' + st.receipt.preview + '" alt="Receipt" style="width:88px;height:88px;object-fit:cover;border-radius:8px;flex:none">' : '') +
      '<label class="btn sec grow" style="height:88px;flex-direction:column;border-style:dashed;cursor:pointer">' + ic('cam') + (st.receipt ? 'Change photo' : 'Take or attach a receipt') + '<input type="file" accept="image/*" capture="environment" id="mFile" class="hidden"></label></div>' +
      '<label class="field">Note<input class="input" id="mNote" value="' + esc(st.note || '') + '" placeholder="' + (isIn ? 'e.g. October retainer' : 'e.g. October internet bill') + '"></label>' +
      '<label class="field">Date<input class="input" type="date" id="mDate" value="' + esc(st.date || todayYmd()) + '" max="' + todayYmd() + '"></label>' +
      '<p class="err" id="mErr" role="alert"></p><button type="button" class="btn pri block" id="mSave">' + (isIn ? 'Save income' : 'Save expense') + '</button>';
  };
  const sheet = openSheet(st.type === 'In' ? 'Add income' : 'Add expense', '<div id="mBody" class="stack" style="gap:16px">' + draw() + '</div>');
  const body = $('#mBody', sheet);
  const keep = () => { const a = $('#mAmount', body); if (a) st.amount = a.value; const r = $('#mRate', body); if (r) st.rate = r.value; const n = $('#mNote', body); if (n) st.note = n.value; const dt = $('#mDate', body); if (dt) st.date = dt.value; };
  const calc = () => { const g = $('#mGet', body); if (!g) return; const a = parseFloat(String($('#mAmount', body).value).replace(/,/g, '')); const r = parseFloat($('#mRate', body).value); g.textContent = a > 0 && r > 0 ? pkr(a * r) : '–'; };
  const redraw = () => { keep(); body.innerHTML = draw(); sheet.querySelector('.title').textContent = st.type === 'In' ? 'Add income' : 'Add expense'; calc(); };
  body.addEventListener('input', calc);
  body.addEventListener('change', async (e) => {
    if (e.target.id === 'mFile' && e.target.files[0]) {
      try { st.receipt = await compressImage(e.target.files[0]); redraw(); } catch (err) { $('#mErr', body).textContent = 'Couldn’t read that photo. Try another one.'; }
    }
  });
  body.addEventListener('click', async (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.t) { st.type = b.dataset.t; st.category = ''; redraw(); }
    else if (b.dataset.c) {
      st.currency = b.dataset.c;
      if (st.currency === 'USD' && !st.rate) { try { const r = store.get('rate'); if (r && Date.now() - r.t < 6 * 3600 * 1000) st.rate = r.rate; else { const j = await api('rate'); st.rate = j.rate; store.set('rate', { rate: j.rate, t: Date.now() }); } } catch (err) { st.rate = 280; } }
      redraw();
    }
    else if (b.dataset.cat !== undefined) { st.category = b.dataset.cat; redraw(); }
    else if (b.dataset.cl !== undefined) { st.client = st.client === b.dataset.cl ? '' : b.dataset.cl; redraw(); }
    else if (b.dataset.s) { st.scope = b.dataset.s; redraw(); }
    else if (b.id === 'mSave') {
      keep();
      const amount = parseFloat(String(st.amount || '').replace(/,/g, ''));
      const err = $('#mErr', body);
      if (!(amount > 0)) { err.textContent = 'Enter an amount.'; $('#mAmount', body).focus(); return; }
      if (!st.category) { err.textContent = 'Pick a category.'; return; }
      busy(b, true);
      try {
        await api('moneyAdd', { type: st.type, amount: amount, currency: st.currency, rate: st.rate, category: st.category, scope: st.scope, client: st.client, note: st.note, date: st.date, receipt: st.receipt ? { data: st.receipt.data, mime: st.receipt.mime } : null, invoiceRow: st.invoiceRow });
        closeSheet();
        toast(st.type === 'In' ? 'Income saved' : 'Expense saved');
        Object.keys(localStorage).filter((k) => k.indexOf('rx.cache.money') === 0 || k === 'rx.cache.home' || k === 'rx.cache.invoices').forEach((k) => localStorage.removeItem(k));
        route();
      } catch (ex) { busy(b, false); err.textContent = ex instanceof OfflineError ? 'You’re offline. Connect and try again.' : ex.message; }
    }
  });
  if (st.currency === 'USD') calc();
}
function moneyItemSheet(row) {
  const x = MONEY_ITEMS.find((i) => i.row === Number(row));
  if (!x) return;
  const sh = openSheet(x.type === 'In' ? 'Money in' : 'Expense',
    '<div><div class="big ' + (x.type === 'In' ? 't-ok' : '') + '">' + pkr(x.amount) + '</div>' + (x.original ? '<div class="sub">' + esc(x.original) + '</div>' : '') + '</div>' +
    '<div class="card tight" style="box-shadow:none">' + [['Category', x.cat], [x.type === 'In' ? 'Client' : 'Office or personal', x.type === 'In' ? x.client : x.scope], ['Date', dayLabel(x.date)], ['Note', x.note], ['Added from', x.from]].filter((r) => r[1]).map((r) => '<div class="list-row"><span class="grow sub">' + r[0] + '</span><span>' + esc(r[1]) + '</span></div>').join('') + '</div>' +
    (x.receipt ? '<a class="btn sec block" href="' + esc(x.receipt) + '" target="_blank" rel="noopener">Open receipt</a>' : '') +
    '<button type="button" class="btn danger block" data-del>' + ic('trash') + 'Delete</button>');
  sh.querySelector('[data-del]').onclick = async (e) => {
    busy(e.currentTarget, true, 'Deleting...');
    try {
      await api('moneyDelete', { row: x.row });
      closeSheet();
      Object.keys(localStorage).filter((k) => k.indexOf('rx.cache.money') === 0 || k === 'rx.cache.home').forEach((k) => localStorage.removeItem(k));
      route();
      toast('Deleted', 'Undo', async () => { try { await api('moneyUndo', { row: x.row }); toast('Restored'); Object.keys(localStorage).filter((k) => k.indexOf('rx.cache.money') === 0).forEach((k) => localStorage.removeItem(k)); route(); } catch (ex) { toast(ex.message); } });
    } catch (ex) { busy(e.currentTarget, false); toast(ex.message); }
  };
}
function newInvoiceSheet() {
  const lists = store.get('lists', { clients: [] });
  const sh = openSheet('New invoice',
    '<label class="field">Client<input class="input" id="iClient" list="iClients" placeholder="Client name"><datalist id="iClients">' + (lists.clients || []).map((c) => '<option value="' + esc(c) + '">').join('') + '</datalist></label>' +
    '<label class="field">What for<input class="input" id="iDesc" placeholder="e.g. 20 hook ads, November"></label>' +
    '<div class="row"><label class="field grow">Amount<input class="input" id="iAmount" inputmode="decimal" placeholder="0"></label><label class="field" style="width:120px">Currency<select class="input" id="iCur"><option>USD</option><option>PKR</option></select></label></div>' +
    '<label class="field">Due date<input class="input" type="date" id="iDue" value="' + (() => { const d = new Date(Date.now() + 7 * 86400000); return d.toISOString().slice(0, 10); })() + '"></label>' +
    '<p class="err" id="iErr" role="alert"></p><button type="button" class="btn pri block" id="iSave">Save invoice</button>');
  sh.querySelector('#iSave').onclick = async (e) => {
    const err = $('#iErr', sh);
    const amount = parseFloat(String($('#iAmount', sh).value).replace(/,/g, ''));
    if (!$('#iClient', sh).value.trim()) { err.textContent = 'Add the client.'; return; }
    if (!(amount > 0)) { err.textContent = 'Enter an amount.'; return; }
    busy(e.currentTarget, true);
    try {
      const d = await api('invoiceAdd', { client: $('#iClient', sh).value.trim(), desc: $('#iDesc', sh).value.trim(), amount: amount, currency: $('#iCur', sh).value, due: $('#iDue', sh).value });
      store.set('cache.invoices', { d: d, t: Date.now() }); closeSheet(); toast('Invoice saved'); route();
    } catch (ex) { busy(e.currentTarget, false); err.textContent = ex.message; }
  };
}
async function shareText(title, text, url) {
  if (navigator.share) { try { await navigator.share({ title: title, text: text, url: url }); return; } catch (e) { if (e && e.name === 'AbortError') return; } }
  window.open('https://wa.me/?text=' + encodeURIComponent(text + (url ? ' ' + url : '')), '_blank', 'noopener');
}

/* ---------- TEAM ---------- */
function vTeam() {
  load('team', 'team', {}, (d) => {
    TEAM = d.team;
    let h = '<a class="card row between" href="#/payroll" style="color:inherit"><div class="row"><span class="ibox">' + ic('doc') + '</span><div><div class="strong">Payroll · ' + esc(monthLabel(thisMonth())) + '</div><div class="sub">Salaries, cuts, advances, payslips</div></div></div>' + ic('next') + '</a>';
    h += '<section class="card tight">' + d.team.map((p) => '<a class="list-row" href="#/team/' + encodeURIComponent(p.name) + '" style="color:inherit"><span class="av">' + esc(p.initials) + '</span><div class="grow"><div class="strong ellipsis">' + esc(p.name) + '</div><div class="sub ellipsis">' + (p.salary ? pkr(p.salary) : 'Intern') + ' · ' + p.hours + ' h · ' + p.lates + ' late this month</div></div>' + (p.active ? (p.hasPin ? '' : '<span class="pill late">No PIN</span>') : '<span class="pill grey">Inactive</span>') + '</a>').join('') + '</section>';
    h += '<button type="button" class="btn sec block" data-act="addPerson">' + ic('plus') + 'Add a person</button>';
    return h;
  }, topBar('Team'));
}
let TEAM = [];
function vEditor(name) {
  load('editor.' + name, 'editor', { name: name }, (d) => {
    const p = d.perf || {};
    const maxW = Math.max(1, ...(p.weeks || [0]));
    let h = '<div class="tiles"><div class="card"><div class="k">On time</div><div class="v t-ok">' + (p.onTime == null ? '–' : p.onTime + '%') + '</div></div><div class="card"><div class="k">Revisions</div><div class="v">' + (p.revisions == null ? '–' : p.revisions) + '</div><div class="sub">per task</div></div><div class="card"><div class="k">Hours</div><div class="v">' + d.hours + '</div><div class="sub">this month</div></div></div>';
    h += '<section class="card"><div class="row between"><h2 class="h">Delivered tasks</h2><span class="sub">last 6 weeks · ' + (p.delivered || 0) + ' total</span></div><div style="display:flex;align-items:flex-end;gap:12px;height:80px;margin-top:12px" role="img" aria-label="Tasks delivered per week">' + (p.weeks || []).map((w, i) => '<div style="flex:1;height:' + Math.max(4, w / maxW * 100) + '%;border-radius:4px;background:' + (i === 5 ? 'var(--violet)' : 'var(--bar-out)') + '" title="' + w + '"></div>').join('') + '</div></section>';
    const a = d.advance;
    h += '<section class="card"><div class="row between"><h2 class="h">Salary advance</h2>' + (a.left ? '<span class="pill late">' + pkr(a.left) + ' left</span>' : '<span class="pill grey">None</span>') + '</div>' +
      (a.given ? '<div class="sub" style="margin-top:4px">Given ' + pkr(a.given) + ' · ' + pkr(a.cut) + ' cut each month</div><div class="barbox" style="margin-top:8px"><div class="bar" style="width:' + (a.given ? Math.round(a.repaid / a.given * 100) : 0) + '%"></div></div>' : '<div class="sub" style="margin-top:4px">Give an advance and it’s cut from salary each month.</div>') +
      '<div class="row" style="margin-top:12px"><button type="button" class="btn pri grow" data-act="giveAdvance" data-name="' + esc(d.name) + '">Give advance</button></div></section>';
    h += '<section class="card tight">' +
      '<button type="button" class="list-row" data-act="editPerson" data-name="' + esc(d.name) + '"><span class="grow">Salary</span><span class="strong num">' + (d.salary ? pkr(d.salary) : 'Intern') + '</span></button>' +
      '<button type="button" class="list-row" data-act="editPerson" data-name="' + esc(d.name) + '"><span class="grow">Shift</span><span class="strong">' + esc(d.shift) + '</span></button>' +
      '<button type="button" class="list-row" data-act="editPerson" data-name="' + esc(d.name) + '"><span class="grow">Notion email</span><span class="sub ellipsis" style="max-width:55%">' + esc(d.email || 'Not set') + '</span></button>' +
      '<button type="button" class="list-row" data-act="resetPin" data-name="' + esc(d.name) + '"><span class="grow">PIN</span><span class="strong t-bad">' + (d.hasPin ? 'Reset' : 'Not set yet') + '</span></button></section>';
    if (d.stats) h += '<p class="sub" style="margin:0">' + d.stats.lates + ' late this month · ' + d.stats.latesToNextCut + ' more until the next day cut</p>';
    return h;
  }, topBar(name, 'Team', '', '#/team'));
}
function personSheet(name) {
  const p = TEAM.find((t) => t.name === name) || { name: '', salary: '', shiftStart: '', shiftEnd: '', email: '', active: true };
  const sh = openSheet(name ? 'Edit ' + name : 'Add a person',
    (name ? '' : '<label class="field">Name<input class="input" id="pName" autocomplete="off"></label>') +
    '<label class="field">Monthly salary (PKR, blank for intern)<input class="input" id="pSalary" inputmode="numeric" value="' + esc(p.salary || '') + '"></label>' +
    '<div class="row"><label class="field grow">Shift start<input class="input" id="pStart" placeholder="11:00 AM" value="' + esc(p.shiftStart || '') + '"></label><label class="field grow">Shift end<input class="input" id="pEnd" placeholder="7:00 PM" value="' + esc(p.shiftEnd || '') + '"></label></div>' +
    '<p class="sub" style="margin:-8px 0 0">Leave the shift blank to use office time.</p>' +
    '<label class="field">Notion email<input class="input" id="pEmail" type="email" value="' + esc(p.email || '') + '"></label>' +
    '<div class="row between"><span>Active</span><button type="button" class="switch" role="switch" id="pActive" aria-checked="' + (p.active !== false) + '" aria-label="Active"></button></div>' +
    '<p class="err" id="pErr" role="alert"></p><button type="button" class="btn pri block" id="pSave">Save</button>');
  sh.querySelector('#pActive').onclick = (e) => e.currentTarget.setAttribute('aria-checked', e.currentTarget.getAttribute('aria-checked') !== 'true');
  sh.querySelector('#pSave').onclick = async (e) => {
    const nm = name || $('#pName', sh).value.trim();
    if (!nm) { $('#pErr', sh).textContent = 'Add a name.'; return; }
    busy(e.currentTarget, true);
    try {
      await api('teamSave', { name: nm, salary: $('#pSalary', sh).value, shiftStart: $('#pStart', sh).value.trim(), shiftEnd: $('#pEnd', sh).value.trim(), email: $('#pEmail', sh).value.trim(), active: $('#pActive', sh).getAttribute('aria-checked') === 'true' });
      closeSheet(); toast('Saved'); store.del('cache.team'); store.del('cache.editor.' + nm); route();
    } catch (ex) { busy(e.currentTarget, false); $('#pErr', sh).textContent = ex.message; }
  };
}
function advanceSheet(name) {
  const sh = openSheet('Give advance to ' + name,
    '<label class="amount"><span>Rs</span><input id="aAmount" inputmode="numeric" placeholder="0" aria-label="Amount"></label>' +
    '<label class="field">Cut from salary each month (PKR)<input class="input" id="aCut" inputmode="numeric" placeholder="e.g. 5000"></label>' +
    '<label class="field">Note<input class="input" id="aNote" placeholder="Optional"></label>' +
    '<p class="sub" style="margin:0">It’s also added to Money as an office expense.</p><p class="err" id="aErr" role="alert"></p><button type="button" class="btn pri block" id="aSave">Give advance</button>');
  sh.querySelector('#aSave').onclick = async (e) => {
    const amount = parseFloat($('#aAmount', sh).value.replace(/,/g, ''));
    if (!(amount > 0)) { $('#aErr', sh).textContent = 'Enter an amount.'; return; }
    busy(e.currentTarget, true);
    try { await api('advanceAdd', { name: name, amount: amount, cut: $('#aCut', sh).value, note: $('#aNote', sh).value }); closeSheet(); toast('Advance saved'); store.del('cache.editor.' + name); route(); }
    catch (ex) { busy(e.currentTarget, false); $('#aErr', sh).textContent = ex.message; }
  };
}

/* ---------- PAYROLL ---------- */
const pay = { month: thisMonth() };
function vPayroll() {
  load('payroll.' + pay.month, 'payroll', { month: pay.month }, (d) => {
    let h = '<section class="hero"><div style="font-size:12px;opacity:.85">Total to pay</div><div class="big">' + pkr(d.total.toPay) + '</div><div class="row wrap" style="gap:16px;font-size:12px;opacity:.85;margin-top:4px"><span>Salaries ' + pkr(d.total.salary) + '</span><span>Cuts ' + pkr(d.total.cuts) + '</span><span>' + d.total.paid + ' of ' + d.total.paid0 + ' paid</span></div></section>';
    if (!d.rows.length) return h + emptyBox('doc', 'No month tab yet', 'The month tab is created on the 1st.');
    d.rows.forEach((r) => {
      const st = r.paid ? ['ok', 'Paid'] : r.salary ? ['late', 'Unpaid'] : ['grey', 'Intern'];
      h += '<section class="card"><div class="row"><span class="av">' + esc(r.initials) + '</span><div class="grow"><div class="strong">' + esc(r.name) + '</div><div class="sub">Salary ' + pkr(r.salary).replace('Rs ', '') + ' · Cuts ' + pkr(r.deduction).replace('Rs ', '') + (r.advanceCut ? ' · Advance ' + pkr(r.advanceCut).replace('Rs ', '') : '') + '</div></div><div style="text-align:right"><div class="strong num">' + pkr(r.toPay) + '</div><span class="pill ' + st[0] + '">' + st[1] + '</span></div></div>' +
        (r.salary ? '<div class="row" style="margin-top:12px"><button type="button" class="btn sec grow" data-act="payslip" data-name="' + esc(r.name) + '">' + ic('share') + 'Share payslip</button>' + (r.paid ? '<button type="button" class="btn sec grow t-ok" disabled>Paid ' + esc(dayLabel(r.paid.on)) + '</button>' : '<button type="button" class="btn pri grow" data-act="markPaid" data-name="' + esc(r.name) + '" data-amount="' + r.toPay + '">Mark paid</button>') + '</div>' : '') + '</section>';
    });
    h += '<p class="sub" style="margin:0;text-align:center">Mark paid adds the payment to Money.</p>';
    return h;
  }, topBar('Payroll', 'Team', monthNav(pay.month, 'payMonth'), '#/team'));
}

/* ---------- MORE ---------- */
function vMore() {
  const items = [['tasks', 'Notion deadlines', 'Overdue and due this week', '#/tasks'], ['mega', 'Post an announcement', 'Shows on every office PC', 'announce'], ['repeat', 'Recurring and budgets', 'Auto expenses, spending limits', '#/plan'],
    ['chart', 'Reports and Excel', 'Monthly PDF, export, profit per client', '#/reports'], ['bell', 'Alerts', 'Late, absent, overdue, payments', '#/alerts'], ['gear', 'Settings', 'Theme, app lock, install, sign out', '#/settings']];
  paint(topBar('More') + '<section class="card tight">' + items.map((i) => (i[3].charAt(0) === '#' ? '<a class="list-row" href="' + i[3] + '" style="color:inherit">' : '<button type="button" class="list-row" data-act="' + i[3] + '">') + '<span class="ibox">' + ic(i[0]) + '</span><div class="grow"><div class="strong">' + i[1] + '</div><div class="sub">' + i[2] + '</div></div>' + ic('next') + (i[3].charAt(0) === '#' ? '</a>' : '</button>')).join('') + '</section><p class="sub" style="text-align:center;margin:0">Reelox Admin ' + VERSION + '</p>');
}
function vTasks() {
  load('tasks', 'tasks', {}, (d) => {
    const t = d.tasks;
    if (!t.length) return emptyBox('tasks', 'No open tasks', 'Tasks marked To do, Working or Revision in Notion show up here.');
    const sec = (title, list, pill) => list.length ? '<section class="card tight"><div class="row between" style="padding:12px 0 4px"><h2 class="h">' + title + '</h2><span class="pill ' + pill + '">' + list.length + '</span></div>' + list.map((x) => '<a class="list-row" href="' + esc(x.url) + '" target="_blank" rel="noopener" style="color:inherit"><div class="grow"><div class="strong ellipsis">' + esc(x.title) + '</div><div class="sub ellipsis">' + esc([x.who, x.client, x.status, x.revisions ? x.revisions + ' revisions' : ''].filter(Boolean).join(' · ')) + '</div></div><span class="pill ' + (x.overdue ? 'bad' : x.thisWeek ? 'vio' : 'grey') + '">' + (x.overdue ? x.daysLate + (x.daysLate === 1 ? ' day' : ' days') + ' late' : x.due ? dayLabel(x.due) : 'No date') + '</span></a>').join('') + '</section>' : '';
    return sec('Overdue', t.filter((x) => x.overdue), 'bad') + sec('Due this week', t.filter((x) => x.thisWeek), 'vio') + sec('Later', t.filter((x) => !x.overdue && !x.thisWeek), 'grey');
  }, topBar('Notion deadlines', 'More', '', '#/more'));
}
function announceSheet() {
  const sh = openSheet('Post an announcement',
    '<label class="field">Message<textarea class="input" id="anMsg" maxlength="300" placeholder="e.g. Team meeting today at 4:00 PM."></textarea></label>' +
    '<label class="field">Show until<input class="input" type="date" id="anUntil" value="' + todayYmd() + '" min="' + todayYmd() + '"></label>' +
    '<p class="sub" style="margin:0">It appears on every office PC’s check-in screen.</p><p class="err" id="anErr" role="alert"></p><button type="button" class="btn pri block" id="anSave">' + ic('send') + 'Post</button>');
  sh.querySelector('#anSave').onclick = async (e) => {
    const msg = $('#anMsg', sh).value.trim();
    if (!msg) { $('#anErr', sh).textContent = 'Write a message.'; return; }
    busy(e.currentTarget, true, 'Posting...');
    try { await api('announce', { message: msg, until: $('#anUntil', sh).value }); closeSheet(); toast('Posted to all PCs'); }
    catch (ex) { busy(e.currentTarget, false); $('#anErr', sh).textContent = ex.message; }
  };
}
function vPlan() {
  load('plan', 'plan', {}, (d) => {
    PLAN = d;
    let h = '<section class="card tight"><div class="row between" style="padding:12px 0 4px"><h2 class="h">Recurring</h2><span class="sub">added automatically</span></div>' +
      (d.recurring.length ? d.recurring.map((r) => '<button type="button" class="list-row" data-act="editRecurring" data-row="' + r.row + '"><span class="ibox">' + ic('repeat') + '</span><div class="grow"><div class="strong ellipsis">' + esc(r.name) + '</div><div class="sub">Day ' + r.day + ' of every month · ' + esc(r.category) + (r.active ? '' : ' · paused') + '</div></div><span class="strong num">' + (r.currency === 'USD' ? usd(r.amount) : pkr(r.amount)) + '</span></button>').join('') : '<p class="sub" style="margin:4px 0 12px">Rent, internet, software: add them once and they’re added every month.</p>') + '</section>' +
      '<button type="button" class="btn sec block" data-act="editRecurring">' + ic('plus') + 'Add recurring</button>';
    const over = d.budgets.filter((b) => b.spent > b.limit).length;
    h += '<section class="card tight"><div class="row between" style="padding:12px 0 4px"><h2 class="h">Budgets · ' + esc(monthLabel(thisMonth())) + '</h2>' + (over ? '<span class="pill bad">' + over + ' over</span>' : '') + '</div>' +
      (d.budgets.length ? d.budgets.map((b) => { const p = b.limit ? b.spent / b.limit : 0; return '<button type="button" class="list-row" style="flex-direction:column;align-items:stretch;gap:8px" data-act="editBudget" data-row="' + b.row + '"><div class="row between"><span class="strong">' + esc(b.name) + '</span><span class="sub"><b class="' + (p > 1 ? 't-bad' : '') + '" style="font-weight:600">' + pkr(b.spent) + '</b> of ' + pkr(b.limit).replace('Rs ', '') + '</span></div><div class="barbox"><div class="bar ' + (p > 1 ? 'over' : p > .8 ? 'warn' : '') + '" style="width:' + Math.min(100, p * 100) + '%"></div></div></button>'; }).join('') : '<p class="sub" style="margin:4px 0 12px">Set a monthly limit and get an alert when you cross it.</p>') + '</section>' +
      '<button type="button" class="btn sec block" data-act="editBudget">' + ic('plus') + 'Add budget</button>';
    return h;
  }, topBar('Recurring and budgets', 'More', '', '#/more'));
}
let PLAN = { recurring: [], budgets: [] };
function recurringSheet(row) {
  const r = PLAN.recurring.find((x) => x.row === Number(row)) || { name: '', type: 'Out', category: '', scope: 'Office', currency: 'PKR', amount: '', day: 1, active: true };
  const lists = store.get('lists', { out: [] });
  const sh = openSheet(row ? 'Edit recurring' : 'Add recurring',
    '<label class="field">Name<input class="input" id="rName" value="' + esc(r.name) + '" placeholder="e.g. Office rent"></label>' +
    '<div class="row"><label class="field grow">Amount<input class="input" id="rAmount" inputmode="decimal" value="' + esc(r.amount || '') + '"></label><label class="field" style="width:120px">Currency<select class="input" id="rCur"><option' + (r.currency === 'PKR' ? ' selected' : '') + '>PKR</option><option' + (r.currency === 'USD' ? ' selected' : '') + '>USD</option></select></label></div>' +
    '<label class="field">Category<select class="input" id="rCat">' + (lists.out || []).map((c) => '<option' + (c === r.category ? ' selected' : '') + '>' + esc(c) + '</option>').join('') + '</select></label>' +
    '<div class="row"><label class="field grow">Day of month<input class="input" id="rDay" type="number" min="1" max="28" value="' + r.day + '"></label><label class="field grow">Office or personal<select class="input" id="rScope"><option' + (r.scope === 'Office' ? ' selected' : '') + '>Office</option><option' + (r.scope === 'Personal' ? ' selected' : '') + '>Personal</option></select></label></div>' +
    '<div class="row between"><span>Active</span><button type="button" class="switch" role="switch" id="rActive" aria-checked="' + (r.active !== false) + '" aria-label="Active"></button></div>' +
    '<p class="err" id="rErr" role="alert"></p><div class="row">' + (row ? '<button type="button" class="btn danger grow" id="rDel">Delete</button>' : '') + '<button type="button" class="btn pri grow" id="rSave">Save</button></div>');
  sh.querySelector('#rActive').onclick = (e) => e.currentTarget.setAttribute('aria-checked', e.currentTarget.getAttribute('aria-checked') !== 'true');
  const save = async (btn, remove) => {
    if (!remove && (!$('#rName', sh).value.trim() || !(parseFloat($('#rAmount', sh).value) > 0))) { $('#rErr', sh).textContent = 'Add a name and an amount.'; return; }
    busy(btn, true);
    try {
      const d = await api('recurringSave', { row: row ? Number(row) : null, remove: !!remove, name: $('#rName', sh).value.trim(), amount: $('#rAmount', sh).value, currency: $('#rCur', sh).value, category: $('#rCat', sh).value, day: $('#rDay', sh).value, scope: $('#rScope', sh).value, active: $('#rActive', sh).getAttribute('aria-checked') === 'true' });
      store.set('cache.plan', { d: d, t: Date.now() }); closeSheet(); toast(remove ? 'Deleted' : 'Saved'); route();
    } catch (ex) { busy(btn, false); $('#rErr', sh).textContent = ex.message; }
  };
  sh.querySelector('#rSave').onclick = (e) => save(e.currentTarget, false);
  if (row) sh.querySelector('#rDel').onclick = (e) => save(e.currentTarget, true);
}
function budgetSheet(row) {
  const b = PLAN.budgets.find((x) => x.row === Number(row)) || { name: '', limit: '' };
  const lists = store.get('lists', { out: [] });
  const opts = ['Personal total'].concat(lists.out || []);
  const sh = openSheet(row ? 'Edit budget' : 'Add budget',
    '<label class="field">What to limit<select class="input" id="bName">' + opts.map((c) => '<option' + (c === b.name ? ' selected' : '') + '>' + esc(c) + '</option>').join('') + '</select></label>' +
    '<label class="field">Monthly limit (PKR)<input class="input" id="bLimit" inputmode="numeric" value="' + esc(b.limit || '') + '"></label>' +
    '<p class="err" id="bErr" role="alert"></p><div class="row">' + (row ? '<button type="button" class="btn danger grow" id="bDel">Delete</button>' : '') + '<button type="button" class="btn pri grow" id="bSave">Save</button></div>');
  const save = async (btn, remove) => {
    if (!remove && !(parseFloat($('#bLimit', sh).value) > 0)) { $('#bErr', sh).textContent = 'Enter a limit.'; return; }
    busy(btn, true);
    try { const d = await api('budgetSave', { row: row ? Number(row) : null, remove: !!remove, name: $('#bName', sh).value, limit: $('#bLimit', sh).value }); store.set('cache.plan', { d: d, t: Date.now() }); closeSheet(); toast(remove ? 'Deleted' : 'Saved'); route(); }
    catch (ex) { busy(btn, false); $('#bErr', sh).textContent = ex.message; }
  };
  sh.querySelector('#bSave').onclick = (e) => save(e.currentTarget, false);
  if (row) sh.querySelector('#bDel').onclick = (e) => save(e.currentTarget, true);
}
const rep = { month: thisMonth(), parts: { Money: true, Attendance: true, Payroll: true, Invoices: false } };
function vReports() {
  const h = topBar('Reports', 'More', '', '#/more') + '<div class="seg" role="group" aria-label="Month"><button type="button" aria-pressed="' + (rep.month === thisMonth()) + '" data-act="repMonth" data-v="0">This month</button><button type="button" aria-pressed="' + (rep.month === shiftMonth(thisMonth(), -1)) + '" data-act="repMonth" data-v="-1">Last month</button></div>' +
    '<div class="tiles" style="grid-template-columns:1fr 1fr">' +
    '<button type="button" class="card" style="text-align:left;cursor:pointer;color:inherit" data-act="report"><span class="ibox">' + ic('doc') + '</span><div class="strong" style="margin-top:12px">Monthly report</div><div class="sub">' + esc(monthLabel(rep.month)) + ' · PDF</div></button>' +
    '<a class="card" href="#/money" data-act="go" data-href="#/money" data-tab="clients" style="color:inherit"><span class="ibox">' + ic('chart') + '</span><div class="strong" style="margin-top:12px">Profit per client</div><div class="sub">Who earns you the most</div></a></div>' +
    '<section class="card"><h2 class="h">Export to Excel</h2><div class="sub" style="margin:4px 0 8px">Pick what to include</div>' +
    Object.keys(rep.parts).map((k) => '<div class="row between" style="padding:8px 0"><span>' + (k === 'Payroll' ? 'Payroll and advances' : k) + '</span><button type="button" class="switch" role="switch" aria-checked="' + rep.parts[k] + '" aria-label="' + k + '" data-act="repPart" data-v="' + k + '"></button></div>').join('') +
    '<button type="button" class="btn pri block" style="margin-top:8px" data-act="export">' + ic('download') + 'Download .xlsx</button></section>' +
    '<p class="sub" style="margin:0">Files are saved in your Google Drive (Reelox Reports and Reelox Exports).</p>';
  paint(h);
}
function vAlerts() {
  load('alerts', 'alerts', {}, (d) => {
    if (!d.alerts.length) return emptyBox('bell', 'No alerts yet', 'Late check-ins, people not in, overdue invoices and tasks, payments and budget alerts show up here.');
    const icon = { late: 'alert', absent: 'team', invoice: 'doc', tasks: 'tasks', revisions: 'repeat', budget: 'target', payment: 'money' };
    return '<section class="card tight">' + d.alerts.map((a) => '<div class="list-row"><span class="ibox">' + ic(icon[a.kind] || 'bell') + '</span><div class="grow"><div class="strong">' + esc(a.title) + '</div><div class="sub">' + esc(a.body) + '</div></div><span class="sub" style="white-space:nowrap">' + esc(ago(new Date(a.at).getTime())) + '</span></div>').join('') + '</section>';
  }, topBar('Alerts', 'More', '', '#/more'));
}

/* ---------- SETTINGS: theme, lock, install, sign out ---------- */
let installEvt = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvt = e; });
function vSettings() {
  const t = store.get('theme', 'auto');
  const hasPin = !!store.get('lockHash');
  const bio = !!store.get('bioId');
  const standalone = matchMedia('(display-mode: standalone)').matches;
  paint(topBar('Settings', 'More', '', '#/more') +
    '<section class="card"><h2 class="h">Theme</h2><div class="seg" role="group" aria-label="Theme" style="margin-top:12px">' + [['light', 'Light'], ['dark', 'Dark'], ['auto', 'Auto']].map(([k, l]) => '<button type="button" aria-pressed="' + (t === k) + '" data-act="theme" data-v="' + k + '">' + l + '</button>').join('') + '</div><p class="sub" style="margin:8px 0 0">Auto follows your phone or computer.</p></section>' +
    '<section class="card tight"><div class="list-row"><span class="ibox">' + ic('lock') + '</span><div class="grow"><div class="strong">App lock</div><div class="sub">' + (hasPin ? 'On · locks after 2 minutes away' : 'Off · anyone with your phone can open it') + '</div></div><button type="button" class="btn sec" data-act="setPin">' + (hasPin ? 'Change PIN' : 'Set PIN') + '</button></div>' +
    (hasPin && window.PublicKeyCredential ? '<div class="list-row"><span class="ibox">' + ic('finger') + '</span><div class="grow"><div class="strong">Fingerprint or face</div><div class="sub">Unlock without typing the PIN</div></div><button type="button" class="switch" role="switch" aria-checked="' + bio + '" aria-label="Fingerprint unlock" data-act="bio"></button></div>' : '') +
    (hasPin ? '<div class="list-row"><span class="grow sub">Turn the lock off</span><button type="button" class="btn sec" data-act="removePin">Remove PIN</button></div>' : '') + '</section>' +
    (standalone ? '' : '<section class="card row"><span class="ibox">' + ic('install') + '</span><div class="grow"><div class="strong">Install the app</div><div class="sub">' + (installEvt ? 'Adds Reelox Admin to your home screen or Start menu' : /iPhone|iPad/.test(navigator.userAgent) ? 'In Safari: tap Share → Add to Home Screen. Needed for notifications on iPhone.' : 'In Chrome: menu ⋮ → Install app (or Add to Home screen)') + '</div></div>' + (installEvt ? '<button type="button" class="btn pri" data-act="install">Install</button>' : '') + '</section>') +
    pushRow() +
    '<button type="button" class="btn danger block" data-act="signOut">Sign out</button><p class="sub" style="text-align:center;margin:0">Reelox Admin ' + VERSION + '</p>');
}
async function sha(s) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('reelox|' + s)); return Array.from(new Uint8Array(b)).map((x) => x.toString(16).padStart(2, '0')).join(''); }
function pinSheet() {
  let first = '', val = '';
  const sh = openSheet('Set app PIN', '<p class="sub" style="margin:0" id="psMsg">Pick a 4-digit PIN for this device.</p><div class="pin-dots" style="justify-content:center" aria-hidden="true"><i></i><i></i><i></i><i></i></div><p class="err" id="psErr" role="alert" style="text-align:center"></p>' + padHtml(false));
  const dots = () => $$('.pin-dots i', sh).forEach((d, i) => d.classList.toggle('on', i < val.length));
  sh.addEventListener('click', async (e) => {
    const b = e.target.closest('.pad button'); if (!b) return;
    if (b.dataset.k === 'del') val = val.slice(0, -1); else if (b.dataset.k && val.length < 4) val += b.dataset.k;
    dots();
    if (val.length === 4) {
      if (!first) { first = val; val = ''; setTimeout(dots, 150); $('#psMsg', sh).textContent = 'Type it again.'; }
      else if (val === first) { store.set('lockHash', await sha(val)); closeSheet(); toast('App lock is on'); vSettings(); }
      else { first = ''; val = ''; setTimeout(dots, 150); $('#psErr', sh).textContent = 'The PINs didn’t match. Start again.'; $('#psMsg', sh).textContent = 'Pick a 4-digit PIN for this device.'; }
    }
  });
}
function padHtml(withBio) {
  return '<div class="pad" style="margin:0 auto" role="group" aria-label="PIN pad">' + '123456789'.split('').map((k) => '<button type="button" data-k="' + k + '">' + k + '</button>').join('') +
    (withBio ? '<button type="button" class="ghost" data-k="bio" aria-label="Use fingerprint">' + ic('finger') + '</button>' : '<span></span>') +
    '<button type="button" data-k="0">0</button><button type="button" class="ghost" data-k="del" aria-label="Delete">' + ic('back') + '</button></div>';
}
const b64 = { enc: (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))), dec: (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0)) };
async function bioRegister() {
  const cred = await navigator.credentials.create({ publicKey: {
    challenge: crypto.getRandomValues(new Uint8Array(32)), rp: { name: 'Reelox Admin' },
    user: { id: crypto.getRandomValues(new Uint8Array(16)), name: 'owner', displayName: 'Reelox owner' },
    pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
    authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required' }, timeout: 60000 } });
  store.set('bioId', b64.enc(cred.rawId));
}
async function bioCheck() {
  const id = store.get('bioId'); if (!id) return false;
  await navigator.credentials.get({ publicKey: { challenge: crypto.getRandomValues(new Uint8Array(32)), allowCredentials: [{ type: 'public-key', id: b64.dec(id) }], userVerification: 'required', timeout: 60000 } });
  return true;
}

/* ---------- NOTIFICATIONS (Firebase Cloud Messaging) ---------- */
function pushRow() {
  const ok = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
  const on = ok && Notification.permission === 'granted' && store.get('pushOn');
  const blocked = ok && Notification.permission === 'denied';
  return '<section class="card row"><span class="ibox">' + ic('bell') + '</span><div class="grow"><div class="strong">Notifications on this device</div><div class="sub">' +
    (!ok ? (/iPhone|iPad/.test(navigator.userAgent) ? 'On iPhone: add the app to your Home Screen from Safari, then open it from there.' : 'This browser can’t show notifications. Install the app first.') : blocked ? 'Blocked. Allow notifications for this app in your phone or browser settings.' : on ? 'On · late, absent, overdue, payments and more' : 'Off · turn on to get alerts like WhatsApp') + '</div></div>' +
    (ok && !blocked ? (on ? '<button type="button" class="btn sec" data-act="pushTest">Test</button>' : '<button type="button" class="btn pri" data-act="pushOn">Turn on</button>') : '') + '</section>';
}
function loadScript(src) {
  return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('Couldn’t load the notification service. Check your internet.')); document.head.appendChild(s); });
}
async function enablePush() {
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') throw new Error('Notifications weren’t allowed.');
  const cfg = await api('pushConfig');
  if (!cfg.ready) throw new Error('Notifications aren’t set up on the server yet.');
  if (!window.firebase) {
    await loadScript('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
    await loadScript('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');
  }
  if (!firebase.apps.length) firebase.initializeApp(cfg.config);
  const reg = await navigator.serviceWorker.ready;
  const token = await firebase.messaging().getToken({ vapidKey: cfg.vapid, serviceWorkerRegistration: reg });
  if (!token) throw new Error('This device didn’t give a notification token.');
  const ua = navigator.userAgent;
  await api('pushRegister', { pushToken: token, device: /Android/.test(ua) ? 'Android phone' : /iPhone|iPad/.test(ua) ? 'iPhone' : /Windows/.test(ua) ? 'Windows PC' : 'Device' });
  store.set('pushOn', true);
}

/* ---------- LOCK and LOGIN screens ---------- */
let locked = false, hiddenAt = 0;
function showLock() {
  if (!store.get('lockHash') || locked) return;
  locked = true;
  const el = document.createElement('div');
  el.id = 'lock'; el.className = 'scrim'; el.style.cssText = 'align-items:stretch;background:var(--bg);z-index:80';
  el.innerHTML = '<div class="center-screen" style="width:100%" role="dialog" aria-modal="true" aria-label="App locked"><div class="logo-mark">' + ic('lock') + '</div><h1 class="title">Reelox Admin is locked</h1><p class="sub" style="margin:0">' + (store.get('bioId') ? 'Use your fingerprint or app PIN' : 'Type your app PIN') + '</p><div class="pin-dots" aria-hidden="true"><i></i><i></i><i></i><i></i></div><p class="err" id="lkErr" role="alert"></p>' + padHtml(!!store.get('bioId')) + '</div>';
  document.body.appendChild(el);
  let val = '';
  const dots = () => $$('.pin-dots i', el).forEach((d, i) => d.classList.toggle('on', i < val.length));
  const unlock = () => { locked = false; el.remove(); };
  const tryBio = async () => { try { if (await bioCheck()) unlock(); } catch (e) { $('#lkErr', el).textContent = 'Fingerprint didn’t work. Use your PIN.'; } };
  el.addEventListener('click', async (e) => {
    const b = e.target.closest('.pad button'); if (!b) return;
    if (b.dataset.k === 'bio') return tryBio();
    if (b.dataset.k === 'del') val = val.slice(0, -1); else if (val.length < 4) val += b.dataset.k;
    dots();
    if (val.length === 4) {
      if (await sha(val) === store.get('lockHash')) unlock();
      else { $('#lkErr', el).textContent = 'Wrong PIN.'; val = ''; setTimeout(dots, 150); }
    }
  });
  el.addEventListener('keydown', (e) => { const b = e.key >= '0' && e.key <= '9' ? el.querySelector('[data-k="' + e.key + '"]') : e.key === 'Backspace' ? el.querySelector('[data-k="del"]') : null; if (b) b.click(); });
  setTimeout(() => { const f = el.querySelector('.pad button'); if (f) f.focus(); }, 30);
  if (store.get('bioId')) setTimeout(tryBio, 300);
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden) hiddenAt = Date.now();
  else if (hiddenAt && Date.now() - hiddenAt > LOCK_AFTER_MS) { showLock(); if (store.get('token')) route(); }
});
function showLogin() {
  $('#app').innerHTML = '<main class="center-screen" id="view" tabindex="-1"><div class="logo-mark">' + ic('home') + '</div><h1 class="title">Reelox Admin</h1><p class="sub" style="margin:0">Sign in with your admin password</p>' +
    '<form id="loginForm" novalidate><label class="field">Password<input class="input" type="password" id="lgPass" autocomplete="current-password" required></label><p class="err" id="lgErr" role="alert"></p><button class="btn pri block" type="submit" id="lgBtn">Sign in</button></form></main>';
  $('#loginForm').onsubmit = async (e) => {
    e.preventDefault();
    const pass = $('#lgPass').value;
    if (!pass) { $('#lgErr').textContent = 'Type your password.'; return; }
    const btn = $('#lgBtn'); busy(btn, true, 'Signing in...');
    try {
      const ua = navigator.userAgent;
      const device = /Android/.test(ua) ? 'Android phone' : /iPhone|iPad/.test(ua) ? 'iPhone' : /Windows/.test(ua) ? 'Windows PC' : 'Device';
      const j = await api('login', { password: pass, device: device });
      store.set('token', j.token);
      startApp();
    } catch (ex) { busy(btn, false); $('#lgErr').textContent = ex instanceof OfflineError ? 'You’re offline. Connect and try again.' : ex.message; }
  };
  setTimeout(() => $('#lgPass') && $('#lgPass').focus(), 50);
}
function startApp() {
  $('#app').innerHTML = '<div class="shell"><nav class="side" aria-label="Sections"><div class="brand">Reelox Admin</div>' + SIDE.map(([k, l, href]) => '<a href="' + href + '" data-k="' + k + '">' + ic(k) + l + '</a>').join('') + '</nav>' +
    '<main id="view" tabindex="-1"></main></div><nav class="tabbar" aria-label="Sections">' + TABS.map(([k, l, href]) => '<a href="' + href + '" data-k="' + k + '"><span class="ind">' + ic(k) + '</span>' + l + '</a>').join('') + '</nav>';
  if (!location.hash) location.hash = '#/home'; else route();
}

/* ---------- actions (event delegation) ---------- */
const ACT = {
  retry: () => route(),
  go: (el) => { if (el.dataset.tab) mon.tab = el.dataset.tab; location.hash = el.dataset.href; },
  addMoney: (el) => addMoneySheet(el.dataset.type),
  announce: () => announceSheet(),
  attTab: (el) => { att.tab = el.dataset.v; if (location.hash !== '#/attendance') history.replaceState(null, '', '#/attendance'); vAttendance(); },
  attName: (el) => { att.name = el.dataset.v; att.day = null; vAttendance(); },
  attMonth: (el) => { att.month = shiftMonth(att.month, Number(el.dataset.k)); att.day = null; vAttendance(); },
  attDay: (el) => { att.day = Number(el.dataset.v); vAttendance(); },
  leaveDecide: async (el) => {
    const yes = el.dataset.yes === '1';
    busy(el, true, yes ? 'Approving...' : 'Declining...');
    try { const d = await api('leaveDecide', { row: Number(el.dataset.row), approve: yes }); store.set('cache.leaves', { d: d, t: Date.now() }); store.del('cache.home'); toast(yes ? 'Leave approved' : 'Leave declined'); vAttendance(); }
    catch (ex) { busy(el, false); toast(ex.message); }
  },
  monTab: (el) => { mon.tab = el.dataset.v; vMoney(); },
  monMonth: (el) => { mon.month = shiftMonth(mon.month, Number(el.dataset.k)); vMoney(); },
  monFilter: (el) => { mon.filter = el.dataset.v; vMoney(); },
  moneyItem: (el) => moneyItemSheet(el.dataset.row),
  newInvoice: () => newInvoiceSheet(),
  remind: (el) => { const i = INVOICES.find((x) => x.row === Number(el.dataset.row)); if (!i) return; shareText('Payment reminder', 'Hi ' + i.client + ', a friendly reminder about ' + i.no + (i.desc ? ' (' + i.desc + ')' : '') + ' for ' + (i.currency === 'USD' ? usd(i.amount) : pkr(i.amount)) + (i.due ? ', due ' + dayLabel(i.due) : '') + '. Thank you! – Reelox Media'); },
  invoicePaid: (el) => { const i = INVOICES.find((x) => x.row === Number(el.dataset.row)); if (!i) return; addMoneySheet('In', { currency: i.currency, amount: i.amount, category: 'Client payment', client: i.client, note: i.no + (i.desc ? ' ' + i.desc : ''), invoiceRow: i.row }); },
  addPerson: () => personSheet(''),
  editPerson: (el) => personSheet(el.dataset.name),
  giveAdvance: (el) => advanceSheet(el.dataset.name),
  resetPin: async (el) => { if (!(await confirmSheet('Reset PIN?', el.dataset.name + ' will create a new PIN the next time they check in.', 'Reset PIN', true))) return; try { await api('resetPin', { name: el.dataset.name }); toast('PIN reset'); store.del('cache.team'); route(); } catch (ex) { toast(ex.message); } },
  payMonth: (el) => { pay.month = shiftMonth(pay.month, Number(el.dataset.k)); vPayroll(); },
  markPaid: async (el) => {
    if (!(await confirmSheet('Mark ' + el.dataset.name + ' as paid?', pkr(Number(el.dataset.amount)) + ' is added to Money as a salary payment.', 'Mark paid'))) return;
    try { const d = await api('payrollPay', { name: el.dataset.name, month: pay.month }); store.set('cache.payroll.' + pay.month, { d: d, t: Date.now() }); store.del('cache.home'); toast('Marked paid'); vPayroll(); } catch (ex) { toast(ex.message); }
  },
  payslip: async (el) => { busy(el, true, 'Making PDF...'); try { const j = await api('payslip', { name: el.dataset.name, month: pay.month }); busy(el, false); await shareText('Payslip', j.text, j.url); } catch (ex) { busy(el, false); toast(ex.message); } },
  editRecurring: (el) => recurringSheet(el.dataset.row || ''),
  editBudget: (el) => budgetSheet(el.dataset.row || ''),
  repMonth: (el) => { rep.month = Number(el.dataset.v) ? shiftMonth(thisMonth(), -1) : thisMonth(); vReports(); },
  repPart: (el) => { rep.parts[el.dataset.v] = !rep.parts[el.dataset.v]; el.setAttribute('aria-checked', rep.parts[el.dataset.v]); },
  report: async (el) => { const w = window.open('', '_blank'); busy(el, true, 'Making PDF...'); try { const j = await api('report', { month: rep.month }); busy(el, false); if (w) w.location = j.url; else location.href = j.url; } catch (ex) { if (w) w.close(); busy(el, false); toast(ex.message); } },
  export: async (el) => { const parts = Object.keys(rep.parts).filter((k) => rep.parts[k]); if (!parts.length) { toast('Pick at least one.'); return; } const w = window.open('', '_blank'); busy(el, true, 'Exporting...'); try { const j = await api('exportXlsx', { month: rep.month, parts: parts }); busy(el, false); if (w) w.location = j.url; else location.href = j.url; } catch (ex) { if (w) w.close(); busy(el, false); toast(ex.message); } },
  theme: (el) => { store.set('theme', el.dataset.v); applyTheme(); vSettings(); },
  pushOn: async (el) => { busy(el, true, 'Turning on...'); try { await enablePush(); toast('Notifications are on'); } catch (ex) { toast(ex.message); } vSettings(); },
  pushTest: async (el) => { busy(el, true, 'Sending...'); try { const j = await api('pushTest'); toast(j.sent ? 'Test sent. Check your notifications.' : 'No device is registered yet.'); } catch (ex) { toast(ex.message); } busy(el, false); },
  setPin: () => pinSheet(),
  removePin: async () => { if (!(await confirmSheet('Turn the lock off?', 'Anyone with this device could open the app.', 'Turn off', true))) return; store.del('lockHash'); store.del('bioId'); toast('App lock is off'); vSettings(); },
  bio: async (el) => {
    if (store.get('bioId')) { store.del('bioId'); toast('Fingerprint unlock is off'); return vSettings(); }
    try { await bioRegister(); toast('Fingerprint unlock is on'); } catch (e) { toast('This device couldn’t set up fingerprint unlock.'); }
    vSettings();
  },
  install: async () => { if (!installEvt) return; installEvt.prompt(); await installEvt.userChoice; installEvt = null; vSettings(); },
  signOut: async () => { if (!(await confirmSheet('Sign out?', 'You’ll need your admin password to sign in again.', 'Sign out', true))) return; try { await api('logout'); } catch (e) { /* signing out anyway */ } Object.keys(localStorage).filter((k) => k.indexOf('rx.') === 0 && k !== 'rx.theme').forEach((k) => localStorage.removeItem(k)); showLogin(); }
};
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el || el.disabled) return;
  const fn = ACT[el.dataset.act];
  if (fn) { if (el.tagName === 'A') e.preventDefault(); fn(el, e); }
});

/* ---------- start ---------- */
window.addEventListener('hashchange', () => { if (store.get('token')) route(); });
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
applyTheme();
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
if (store.get('token')) { startApp(); showLock(); } else showLogin();
