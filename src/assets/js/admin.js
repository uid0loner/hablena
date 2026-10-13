// Hablena admin portal: overview, users, test accounts, premium codes and the audit log.
// Talks to /api/admin/* (admins only). All user data is escaped before it touches the DOM.
(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  const nf = new Intl.NumberFormat('de-DE');
  const DAY = 86_400_000;
  const LIFETIME = 253402214400000;
  const LOGIN = '/de/anmelden/';

  const ICON = {
    crown: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7l4.5 4L12 4l4.5 7L21 7l-2 12H5z"/></svg>',
    lock: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10V7a5 5 0 0 1 10 0v3h1a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1zm2 0h6V7a3 3 0 0 0-6 0z"/></svg>',
    check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20zm-1.2 13.6l6-6-1.4-1.4-4.6 4.6-2.2-2.2-1.4 1.4z"/></svg>',
    copy: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/></svg>',
    close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    search: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
    plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
    download: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>',
    star: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7l4.5 4L12 4l4.5 7L21 7l-2 12H5z"/></svg>',
    shield: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/></svg>',
    user: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.5-7 8-7s8 3 8 7"/></svg>',
    key: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M17 6l3 3M14 9l2 2"/></svg>',
    chart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
    history: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/></svg>',
    trash: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>',
    note: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg>',
    info: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/></svg>',
  };

  // ---------- formatting ----------
  const dateFmt = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const dateTimeFmt = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const rtf = new Intl.RelativeTimeFormat('de', { numeric: 'auto' });
  const fmtDate = (ms) => (ms ? dateFmt.format(new Date(ms)) : '–');
  const fmtDateTime = (ms) => (ms ? dateTimeFmt.format(new Date(ms)) : '–');
  const fmtDay = (day) => (day ? dateFmt.format(new Date(day + 'T12:00:00')) : '–');
  const relative = (ms) => {
    if (!ms) return '–';
    const diff = ms - Date.now();
    const abs = Math.abs(diff);
    if (abs < 60_000) return 'gerade eben';
    if (abs < 3_600_000) return rtf.format(Math.round(diff / 60_000), 'minute');
    if (abs < DAY) return rtf.format(Math.round(diff / 3_600_000), 'hour');
    if (abs < 30 * DAY) return rtf.format(Math.round(diff / DAY), 'day');
    if (abs < 365 * DAY) return rtf.format(Math.round(diff / (30 * DAY)), 'month');
    return rtf.format(Math.round(diff / (365 * DAY)), 'year');
  };
  const relDay = (day) => {
    if (!day) return 'nie';
    const today = new Date().toISOString().slice(0, 10);
    const n = Math.round((Date.parse(today) - Date.parse(day)) / DAY);
    return n <= 0 ? 'heute' : n === 1 ? 'gestern' : `vor ${n} Tagen`;
  };
  const daysLabel = (n) => (n === 1 ? '1 Tag' : n % 365 === 0 ? (n / 365 === 1 ? '1 Jahr' : `${n / 365} Jahre`) : `${nf.format(n)} Tage`);
  const isoDate = (ms) => new Date(ms - new Date(ms).getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
  const endOfDay = (dateStr) => new Date(dateStr + 'T23:59:59').toISOString();

  const ERRORS = {
    unauthorized: 'Deine Sitzung ist abgelaufen. Bitte melde dich neu an.',
    forbidden: 'Keine Berechtigung.',
    invalid_date: 'Bitte ein gültiges Datum in der Zukunft wählen.',
    invalid_email: 'Diese E-Mail-Adresse ist ungültig.',
    email_taken: 'Diese E-Mail-Adresse ist schon registriert.',
    invalid_request: 'Die Eingabe ist ungültig.',
    cannot_block_self: 'Du kannst dein eigenes Konto nicht sperren.',
    cannot_demote_self: 'Du kannst dir die Admin-Rolle nicht selbst entziehen.',
    cannot_expire_self: 'Du kannst dein eigenes Konto nicht befristen.',
    cannot_delete_self: 'Du kannst dein eigenes Konto hier nicht löschen.',
    confirmation_mismatch: 'Die Bestätigung stimmt nicht mit der E-Mail-Adresse überein.',
    not_found: 'Nicht gefunden.',
    rate_limited: 'Zu viele Anfragen. Bitte kurz warten.',
    network: 'Keine Verbindung zum Server.',
  };
  const errorText = (code) => ERRORS[code] || 'Etwas ist schiefgelaufen. Bitte erneut versuchen.';

  // ---------- API ----------
  async function api(path, body) {
    const opts = { credentials: 'same-origin', headers: {} };
    if (body !== undefined) {
      opts.method = 'POST';
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
    let res;
    try { res = await fetch(path, opts); } catch { return { ok: false, status: 0, data: { error: 'network' } }; }
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 && path.startsWith('/api/admin/')) showGate('login');
    return { ok: res.ok, status: res.status, data };
  }
  async function act(path, body, success) {
    const r = await api(path, body);
    if (!r.ok) { toast(errorText(r.data.error), true); return null; }
    if (success) toast(success);
    return r.data;
  }

  // ---------- UI helpers ----------
  function toast(message, error = false) {
    const box = $('[data-toasts]');
    const el = document.createElement('div');
    el.className = 'adm-toast' + (error ? ' is-error' : '');
    el.textContent = message;
    box.append(el);
    while (box.children.length > 2) box.firstElementChild.remove();
    setTimeout(() => el.remove(), error ? 6000 : 3000);
  }

  async function copy(text, label = 'Kopiert') {
    try { await navigator.clipboard.writeText(text); toast(label); }
    catch {
      const ta = Object.assign(document.createElement('textarea'), { value: text });
      document.body.append(ta); ta.select();
      try { document.execCommand('copy'); toast(label); } catch { toast('Kopieren nicht möglich', true); }
      ta.remove();
    }
  }

  function download(name, text, type = 'text/csv') {
    const url = URL.createObjectURL(new Blob(['﻿' + text], { type: `${type};charset=utf-8` }));
    const a = Object.assign(document.createElement('a'), { href: url, download: name });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const csv = (rows) => rows.map((r) => r.map((v) => {
    let s = String(v ?? '');
    if (/^[=+\-@]/.test(s)) s = "'" + s; // no formula injection when opened in Excel
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(';')).join('\n');

  // Confirmation dialog. With `confirmText`, the OK button only works once that text is typed.
  function confirmDialog({ title, html, ok = 'Bestätigen', danger = true, confirmText = null }) {
    const dlg = $('[data-dialog]');
    const okBtn = $('[data-dialog-ok]', dlg);
    $('[data-dialog-title]', dlg).textContent = title;
    const box = $('[data-dialog-text]', dlg);
    box.innerHTML = html + (confirmText ? `<label class="adm-field"><span>Zur Bestätigung eingeben: <b class="mono">${esc(confirmText)}</b></span><input class="adm-input" data-dialog-input autocomplete="off" spellcheck="false"></label>` : '');
    okBtn.textContent = ok;
    okBtn.className = 'adm-btn ' + (danger ? 'adm-btn--danger' : 'adm-btn--primary');
    okBtn.disabled = !!confirmText;
    const input = $('[data-dialog-input]', dlg);
    if (input) input.addEventListener('input', () => { okBtn.disabled = input.value.trim().toLowerCase() !== confirmText.toLowerCase(); });
    dlg.returnValue = '';
    dlg.showModal();
    (input || okBtn).focus();
    return new Promise((resolve) => {
      dlg.addEventListener('close', () => resolve(dlg.returnValue === 'ok'), { once: true });
    });
  }

  const AV = ['#C8102E', '#0A1633', '#2457D6', '#12805C', '#B7791F', '#7C3AED', '#0E7490', '#BE185D'];
  const avatar = (u) => {
    const label = (u.name || u.email || '?').trim();
    let h = 0;
    for (const ch of u.email || label) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return `<span class="adm-av" style="--av:${AV[h % AV.length]}" aria-hidden="true">${esc(label[0].toUpperCase())}</span>`;
  };
  const userCell = (u) => `<span class="adm-userlink">${avatar(u)}<span class="adm-userlink__text"><span class="adm-userlink__name">${esc(u.name || u.email.split('@')[0])}</span><span class="adm-userlink__email">${esc(u.email)}</span></span></span>`;

  function badges(u) {
    const out = [];
    if (u.premium?.lifetime) out.push(`<span class="badge badge--lifetime">${ICON.crown}Lifetime</span>`);
    else if (u.premium?.active) out.push(`<span class="badge badge--premium">${ICON.crown}Premium</span>`);
    if (u.admin) out.push('<span class="badge badge--admin">Admin</span>');
    if (u.isTest) out.push('<span class="badge badge--test">Test</span>');
    if (u.blocked) out.push('<span class="badge badge--blocked">Gesperrt</span>');
    else if (u.expired) out.push('<span class="badge badge--expired">Abgelaufen</span>');
    return `<span class="adm-badges">${out.join('')}</span>`;
  }
  const premiumText = (p) => {
    if (!p || !p.until) return '<span class="muted">Free</span>';
    if (p.lifetime) return '<b>Lifetime</b>';
    if (!p.active) return `<span class="muted">abgelaufen ${esc(fmtDate(p.until))}</span>`;
    return `bis ${esc(fmtDate(p.until))}`;
  };
  const sourceText = (s) => ({ admin: 'vom Admin vergeben', code: 'per Gutscheincode', paddle: 'per Zahlung' }[s] || '');

  // ---------- app state & routing ----------
  const view = $('[data-view]');
  let me = null;
  let current = '';
  const usersState = { q: '', filter: 'all', sort: 'newest', page: 0 };

  function showGate(kind) {
    const gate = $('[data-gate]');
    gate.hidden = false;
    $('[data-adm]').hidden = true;
    if (kind === 'login') {
      $('[data-gate-title]').textContent = 'Bitte anmelden';
      $('[data-gate-text]').textContent = 'Der Admin-Bereich ist nur für angemeldete Administratoren. Melde dich mit deinem Hablena-Konto an.';
      $('[data-gate-link]').textContent = 'Anmelden';
      $('[data-gate-link]').href = `${LOGIN}?next=/admin/`;
    } else {
      $('[data-gate-title]').textContent = 'Kein Zugriff';
      $('[data-gate-text]').textContent = 'Dieses Konto hat keine Admin-Rechte. Admins werden über die Variable ADMIN_EMAILS in Cloudflare oder von einem anderen Admin freigeschaltet.';
      $('[data-gate-link]').textContent = 'Zur App';
      $('[data-gate-link]').href = '/de/app/';
    }
  }

  function route() {
    const [path, query = ''] = location.hash.replace(/^#\/?/, '').split('?');
    const name = ['overview', 'users', 'test', 'codes', 'log'].includes(path) ? path : 'overview';
    const params = new URLSearchParams(query);
    $$('[data-nav]').forEach((a) => {
      const on = a.dataset.nav === name;
      a.classList.toggle('is-active', on);
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    if (name === 'users' && params.has('filter')) { usersState.filter = params.get('filter'); usersState.page = 0; }
    if (name === 'users' && params.has('q')) { usersState.q = params.get('q'); usersState.page = 0; }
    current = name;
    view.innerHTML = '<div class="adm-loading"><span class="adm-spin"></span></div>';
    ({ overview: renderOverview, users: renderUsers, test: renderTest, codes: renderCodes, log: renderLog })[name]();
    $('#main').focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }

  const refreshCurrent = () => {
    if (current === 'users') loadUsers();
    else if (current === 'test') loadTestList();
    else if (current === 'overview') renderOverview();
  };

  // ======================================================================
  // Overview
  // ======================================================================
  async function renderOverview() {
    const [r, audio] = await Promise.all([api('/api/admin/overview'), api('/api/audio/status')]);
    if (current !== 'overview') return;
    if (!r.ok) { view.innerHTML = `<div class="adm-empty">${esc(errorText(r.data.error))}</div>`; return; }
    const t = r.data.totals;
    const kpi = (label, value, sub, color, href) => `
      <a class="adm-card adm-kpi" href="${href}" style="--c:${color};text-decoration:none">
        <div class="adm-kpi__label"><i></i>${label}</div>
        <div class="adm-kpi__value">${nf.format(value)}</div>
        <div class="adm-kpi__sub">${sub}</div>
      </a>`;
    const a = audio.ok ? audio.data : null;
    const pct = a ? Math.min(100, Math.round((a.charsThisMonth / Math.max(1, a.monthlyLimit)) * 100)) : 0;
    view.innerHTML = `
      <header class="adm-head">
        <div><h1>Übersicht</h1><p>Stand ${esc(fmtDateTime(Date.now()))}</p></div>
        <div class="adm-head__actions">
          <a class="adm-btn" href="#/codes">${ICON.plus}Gutscheincodes</a>
          <a class="adm-btn adm-btn--gold" href="#/test">${ICON.plus}Testzugang</a>
        </div>
      </header>
      <div class="adm-kpis">
        ${kpi('Benutzer', t.users, `<b>+${nf.format(t.newWeek)}</b> in 7 Tagen`, 'var(--navy)', '#/users?filter=all')}
        ${kpi('Premium aktiv', t.premium, `davon ${nf.format(t.lifetime)} Lifetime`, 'var(--gold)', '#/users?filter=premium')}
        ${kpi('Aktiv heute', t.activeToday, `${nf.format(t.activeWeek)} in 7 Tagen`, 'var(--green)', '#/users?filter=all')}
        ${kpi('Lektionen (7 Tage)', t.lessonsWeek, `${nf.format(t.xpWeek)} XP gesammelt`, 'var(--red)', '#/users?filter=all')}
      </div>
      <div class="adm-split">
        <div class="adm-stack">
          <section class="adm-card">
            <div class="adm-card__head"><h2>Letzte 30 Tage</h2>
              <div class="adm-legend"><span><i style="background:var(--red)"></i>Registrierungen</span><span><i style="background:var(--navy)"></i>Aktive Lerner</span></div>
            </div>
            <div class="adm-card__body">${chart(r.data.days)}</div>
          </section>
          <section class="adm-card">
            <div class="adm-card__head"><h2>Neueste Benutzer</h2><a class="adm-btn adm-btn--sm" href="#/users">Alle anzeigen</a></div>
            <ul class="adm-list">${r.data.recent.map((u) => `
              <li><button class="adm-userlink" type="button" data-open-user="${esc(u.id)}">${avatar(u)}<span class="adm-userlink__text"><span class="adm-userlink__name">${esc(u.name || u.email.split('@')[0])}</span><span class="adm-userlink__email">${esc(u.email)}</span></span></button>
              <span class="muted nowrap" style="font-size:13px">${esc(relative(u.created_at))}</span></li>`).join('') || '<li class="muted">Noch keine Benutzer.</li>'}
            </ul>
          </section>
        </div>
        <div class="adm-stack">
          <section class="adm-card">
            <div class="adm-card__head"><h2>Konten</h2></div>
            <ul class="adm-list">
              <li><a href="#/users?filter=premium" style="flex:1">Premium aktiv</a><b>${nf.format(t.premium)}</b></li>
              <li><a href="#/users?filter=lifetime" style="flex:1">Lifetime</a><b>${nf.format(t.lifetime)}</b></li>
              <li><a href="#/users?filter=test" style="flex:1">Testzugänge</a><b>${nf.format(t.tests)}</b></li>
              <li><a href="#/users?filter=blocked" style="flex:1">Gesperrt</a><b>${nf.format(t.blocked)}</b></li>
              <li><span style="flex:1">Free</span><b>${nf.format(Math.max(0, t.users - t.premium))}</b></li>
            </ul>
          </section>
          ${a ? `<section class="adm-card">
            <div class="adm-card__head"><h2>Sprachausgabe</h2><span class="badge ${pct >= 100 ? 'badge--blocked' : pct >= 80 ? 'badge--premium' : 'badge--ok'}">${pct} %</span></div>
            <div class="adm-card__body">
              <div style="font-size:14px"><b>${nf.format(a.charsThisMonth)}</b> von ${nf.format(a.monthlyLimit)} Zeichen diesen Monat</div>
              <div class="adm-meter ${pct >= 100 ? 'is-full' : pct >= 80 ? 'is-warn' : ''}"><i style="width:${pct}%"></i></div>
              <div class="muted" style="font-size:13px">${nf.format(a.ready)} von ${nf.format(a.total)} Audios fertig${a.onDemandOnly ? ` · ${nf.format(a.onDemandOnly)} nur bei Bedarf` : ''}. Das Limit setzt du mit <span class="mono">TTS_MONTHLY_CHAR_LIMIT</span>.</div>
            </div>
          </section>` : ''}
        </div>
      </div>`;
  }

  function chart(days) {
    const W = 720, H = 220, L = 30, B = 24, T = 10;
    const max = Math.max(4, ...days.map((d) => Math.max(d.signups, d.active)));
    const step = Math.ceil(max / 4);
    const top = step * 4;
    const cw = (W - L) / days.length;
    const y = (v) => T + (H - T - B) * (1 - v / top);
    const grid = [0, 1, 2, 3, 4].map((i) => `<line class="grid" x1="${L}" x2="${W}" y1="${y(i * step)}" y2="${y(i * step)}"/><text x="${L - 6}" y="${y(i * step) + 4}" text-anchor="end">${i * step}</text>`).join('');
    const bars = days.map((d, i) => d.signups ? `<rect class="bar" x="${L + i * cw + cw * 0.22}" y="${y(d.signups)}" width="${cw * 0.56}" height="${y(0) - y(d.signups)}" rx="2"><title>${fmtDay(d.day)}: ${d.signups} Registrierungen</title></rect>` : '').join('');
    const pts = days.map((d, i) => `${L + i * cw + cw / 2},${y(d.active)}`);
    const labels = days.map((d, i) => (i % 5 === 0 || i === days.length - 1) ? `<text x="${L + i * cw + cw / 2}" y="${H - 6}" text-anchor="middle">${d.day.slice(8)}.${d.day.slice(5, 7)}.</text>` : '').join('');
    const dots = days.map((d, i) => `<circle cx="${L + i * cw + cw / 2}" cy="${y(d.active)}" r="${i === days.length - 1 ? 4 : 0}" fill="var(--navy)"><title>${fmtDay(d.day)}: ${d.active} aktiv</title></circle>`).join('');
    return `<svg class="adm-chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Registrierungen und aktive Lerner der letzten 30 Tage">
      <defs><linearGradient id="admArea" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#0A1633" stop-opacity=".14"/><stop offset="1" stop-color="#0A1633" stop-opacity="0"/></linearGradient></defs>
      ${grid}${bars}
      <path class="area" d="M${pts[0].split(',')[0]},${y(0)} L${pts.join(' L')} L${pts[pts.length - 1].split(',')[0]},${y(0)} Z"/>
      <polyline class="line" points="${pts.join(' ')}"/>${dots}${labels}
    </svg>`;
  }

  // ======================================================================
  // Users
  // ======================================================================
  const FILTERS = [['all', 'Alle'], ['premium', 'Premium'], ['free', 'Free'], ['lifetime', 'Lifetime'], ['test', 'Testzugänge'], ['blocked', 'Gesperrt'], ['expired', 'Abgelaufen'], ['admin', 'Admins']];
  const SORTS = [['newest', 'Neueste zuerst'], ['oldest', 'Älteste zuerst'], ['login', 'Letzter Login'], ['xp', 'Meiste XP'], ['premium', 'Premium-Ende'], ['email', 'E-Mail A–Z']];

  function renderUsers() {
    view.innerHTML = `
      <header class="adm-head">
        <div><h1>Benutzer</h1><p>Konten suchen, Premium vergeben oder entziehen, sperren, befristen und verwalten.</p></div>
        <div class="adm-head__actions">
          <button class="adm-btn" type="button" data-export>${ICON.download}CSV-Export</button>
          <a class="adm-btn adm-btn--gold" href="#/test">${ICON.plus}Testzugang</a>
        </div>
      </header>
      <section class="adm-card">
        <div class="adm-filters" role="group" aria-label="Filter">${FILTERS.map(([k, l]) => `<button type="button" data-filter="${k}" class="${usersState.filter === k ? 'is-active' : ''}" aria-pressed="${usersState.filter === k}">${l}</button>`).join('')}</div>
        <div class="adm-toolbar">
          <label class="adm-search">${ICON.search}<span class="sr-only">Suchen</span><input class="adm-input" type="search" data-search placeholder="E-Mail, Name oder Notiz suchen …" value="${esc(usersState.q)}"></label>
          <label><span class="sr-only">Sortierung</span><select class="adm-select" data-sort>${SORTS.map(([k, l]) => `<option value="${k}"${usersState.sort === k ? ' selected' : ''}>${l}</option>`).join('')}</select></label>
        </div>
        <div data-users-table><div class="adm-loading" style="min-height:200px"><span class="adm-spin"></span></div></div>
      </section>`;
    let timer;
    $('[data-search]').addEventListener('input', (e) => {
      clearTimeout(timer);
      timer = setTimeout(() => { usersState.q = e.target.value.trim(); usersState.page = 0; loadUsers(); }, 250);
    });
    $('[data-sort]').addEventListener('change', (e) => { usersState.sort = e.target.value; usersState.page = 0; loadUsers(); });
    $$('[data-filter]').forEach((b) => b.addEventListener('click', () => {
      usersState.filter = b.dataset.filter; usersState.page = 0;
      $$('[data-filter]').forEach((x) => { x.classList.toggle('is-active', x === b); x.setAttribute('aria-pressed', x === b); });
      loadUsers();
    }));
    $('[data-export]').addEventListener('click', exportUsers);
    loadUsers();
  }

  const usersQuery = (page) => `/api/admin/users?${new URLSearchParams({ q: usersState.q, filter: usersState.filter, sort: usersState.sort, page })}`;

  async function loadUsers() {
    const box = $('[data-users-table]');
    if (!box) return;
    const r = await api(usersQuery(usersState.page));
    if (!$('[data-users-table]')) return;
    if (!r.ok) { box.innerHTML = `<div class="adm-empty">${esc(errorText(r.data.error))}</div>`; return; }
    const { users, total, page, pageSize, more } = r.data;
    if (!users.length) { box.innerHTML = '<div class="adm-empty">Keine Benutzer gefunden.</div>'; return; }
    box.innerHTML = `
      <div class="adm-table-wrap"><table class="adm-table adm-table--cards">
        <thead><tr><th>Benutzer</th><th>Status</th><th>Premium</th><th class="num hide-s">XP</th><th class="num hide-m">Lektionen</th><th class="hide-m">Zuletzt aktiv</th><th class="hide-s">Registriert</th></tr></thead>
        <tbody>${users.map((u) => `
          <tr data-user="${esc(u.id)}" tabindex="0" aria-label="${esc(u.email)} öffnen">
            <td>${userCell(u)}</td>
            <td>${badges(u) || ''}${!u.premium.active && !u.admin && !u.isTest && !u.blocked && !u.expired ? '<span class="muted" style="font-size:13px">Free</span>' : ''}</td>
            <td class="nowrap">${premiumText(u.premium)}</td>
            <td class="num hide-s">${nf.format(u.xp)}</td>
            <td class="num hide-m">${nf.format(u.lessons)}</td>
            <td class="hide-m nowrap">${esc(relDay(u.lastActive))}</td>
            <td class="hide-s nowrap" title="${esc(fmtDateTime(u.createdAt))}">${esc(fmtDate(u.createdAt))}</td>
          </tr>`).join('')}</tbody>
      </table></div>
      <div class="adm-pager">
        <span>${nf.format(page * pageSize + 1)}–${nf.format(page * pageSize + users.length)} von ${nf.format(total)}</span>
        <div><button class="adm-btn adm-btn--sm" type="button" data-page="-1"${page === 0 ? ' disabled' : ''}>Zurück</button><button class="adm-btn adm-btn--sm" type="button" data-page="1"${more ? '' : ' disabled'}>Weiter</button></div>
      </div>`;
    $$('tr[data-user]', box).forEach((tr) => {
      tr.addEventListener('click', () => openUser(tr.dataset.user, tr));
      tr.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openUser(tr.dataset.user, tr); } });
    });
    $$('[data-page]', box).forEach((b) => b.addEventListener('click', () => { usersState.page += Number(b.dataset.page); loadUsers(); }));
  }

  async function exportUsers() {
    const all = [];
    for (let page = 0; page < 200; page++) {
      const r = await api(usersQuery(page));
      if (!r.ok) { toast(errorText(r.data.error), true); return; }
      all.push(...r.data.users);
      if (!r.data.more) break;
    }
    const rows = [['E-Mail', 'Name', 'Registriert', 'Letzter Login', 'Zuletzt aktiv', 'Premium', 'Premium bis', 'Quelle', 'Admin', 'Test', 'Gesperrt', 'Konto gültig bis', 'XP', 'Lektionen', 'Notiz']];
    for (const u of all) rows.push([u.email, u.name, fmtDateTime(u.createdAt), fmtDateTime(u.lastLoginAt), u.lastActive || '', u.premium.active ? 'ja' : 'nein', u.premium.lifetime ? 'Lifetime' : fmtDate(u.premium.until), u.premium.source || '', u.admin ? 'ja' : '', u.isTest ? 'ja' : '', u.blocked ? 'ja' : '', fmtDate(u.expiresAt), u.xp, u.lessons, u.note || '']);
    download(`hablena-benutzer-${isoDate(Date.now())}.csv`, csv(rows));
    toast(`${nf.format(all.length)} Benutzer exportiert`);
  }

  // ======================================================================
  // User drawer
  // ======================================================================
  let drawerReturn = null;
  let drawerUser = null;

  async function openUser(id, from) {
    const drawer = $('[data-drawer]');
    const body = $('[data-drawer-body]');
    if (drawer.hidden) {
      drawerReturn = from || document.activeElement;
      drawer.hidden = false;
      document.body.style.overflow = 'hidden';
      body.innerHTML = '<div class="adm-loading"><span class="adm-spin"></span></div>';
      $('.adm-drawer__panel').focus();
    }
    const r = await api(`/api/admin/users/${encodeURIComponent(id)}`);
    if (drawer.hidden) return;
    if (!r.ok) { body.innerHTML = `<div class="adm-empty">${esc(errorText(r.data.error))}</div>`; return; }
    drawerUser = r.data.user;
    renderDrawer(r.data);
  }

  function closeDrawer() {
    const drawer = $('[data-drawer]');
    if (drawer.hidden) return;
    drawer.hidden = true;
    document.body.style.overflow = '';
    drawerUser = null;
    if (drawerReturn && document.contains(drawerReturn)) drawerReturn.focus();
  }

  function renderDrawer(d) {
    const u = d.user;
    const s = d.stats;
    const p = u.premium;
    const self = me && me.id === u.id;
    const today = isoDate(Date.now());
    const statusBox = p.lifetime
      ? `<div class="adm-status is-lifetime"><span class="adm-status__icon">${ICON.crown}</span><div><b>Premium Lifetime</b><span>Unbegrenzt · ${esc(sourceText(p.source))}</span></div></div>`
      : p.active
        ? `<div class="adm-status is-premium"><span class="adm-status__icon">${ICON.crown}</span><div><b>Premium bis ${esc(fmtDateTime(p.until))}</b><span>Endet ${esc(relative(p.until))} · ${esc(sourceText(p.source))}</span></div></div>`
        : `<div class="adm-status"><span class="adm-status__icon">${ICON.crown}</span><div><b>Kein Premium</b><span>${p.until ? `Abgelaufen am ${esc(fmtDate(p.until))}` : 'Free-Konto'}</span></div></div>`;
    const accessBox = u.blocked
      ? `<div class="adm-status is-bad"><span class="adm-status__icon">${ICON.lock}</span><div><b>Gesperrt</b><span>Anmeldung nicht möglich</span></div></div>`
      : u.expired
        ? `<div class="adm-status is-bad"><span class="adm-status__icon">${ICON.lock}</span><div><b>Abgelaufen</b><span>Zugang endete am ${esc(fmtDateTime(u.expiresAt))}</span></div></div>`
        : `<div class="adm-status"><span class="adm-status__icon" style="color:var(--green)">${ICON.check}</span><div><b>Aktiv</b><span>${u.expiresAt ? `Befristet bis ${esc(fmtDateTime(u.expiresAt))} (${esc(relative(u.expiresAt))})` : 'Unbefristet'}</span></div></div>`;

    // 30-day activity strip
    const act = new Map(d.activity.map((a) => [a.day, a]));
    const heat = Array.from({ length: 30 }, (_, i) => {
      const day = new Date(Date.now() - (29 - i) * DAY).toISOString().slice(0, 10);
      const a = act.get(day);
      const cls = !a ? '' : a.frozen ? 'fz' : a.xp >= 60 ? 'l3' : a.xp >= 20 ? 'l2' : 'l1';
      return `<i class="${cls}" title="${esc(fmtDay(day))}: ${a ? (a.frozen ? 'Streak-Freeze' : `${a.xp} XP, ${a.lessons} Lektionen`) : 'keine Aktivität'}"></i>`;
    }).join('');

    $('[data-drawer-body]').innerHTML = `
      <header class="adm-dh">
        <div class="adm-dh__top">
          ${avatar(u)}
          <div style="min-width:0"><h2 id="drawer-title">${esc(u.name || u.email.split('@')[0])}</h2><div class="adm-dh__email">${esc(u.email)} <button class="adm-copy" type="button" data-copy="${esc(u.email)}" aria-label="E-Mail kopieren" style="color:var(--navy-text)">${ICON.copy}</button></div></div>
          <button class="adm-dh__close" type="button" data-drawer-close aria-label="Schließen">${ICON.close}</button>
        </div>
        ${badges(u)}
      </header>
      <div class="adm-stats">
        <div><b>${nf.format(s.xp)}</b><span>XP</span></div>
        <div><b>${nf.format(s.lessons)}</b><span>Lektionen</span></div>
        <div><b>${nf.format(s.streak)}</b><span>Serie</span></div>
        <div><b>${nf.format(s.words)}</b><span>Wörter</span></div>
        <div><b>${nf.format(s.sessions)}</b><span>Geräte</span></div>
      </div>

      <section class="adm-sec">
        <h3>${ICON.star}Premium</h3>
        <p class="lead">Zeit wird an ein laufendes Premium angehängt, sonst ab jetzt gerechnet.</p>
        ${statusBox}
        <div class="adm-quick">
          <button class="adm-btn" type="button" data-premium-days="1">+1 Tag</button>
          <button class="adm-btn" type="button" data-premium-days="7">+1 Woche</button>
          <button class="adm-btn" type="button" data-premium-days="30">+1 Monat</button>
          <button class="adm-btn" type="button" data-premium-days="365">+1 Jahr</button>
          <button class="adm-btn adm-btn--gold" type="button" data-premium-lifetime>Lifetime</button>
        </div>
        <div class="adm-sublabel">Individuell</div>
        <div class="adm-row">
          <label class="adm-field"><span>Tage hinzufügen</span><input class="adm-input" type="number" min="1" max="3650" step="1" placeholder="z. B. 14" data-premium-custom></label>
          <button class="adm-btn adm-btn--primary" type="button" data-premium-add>Hinzufügen</button>
        </div>
        <div class="adm-row">
          <label class="adm-field"><span>Premium genau bis</span><input class="adm-input" type="date" min="${today}" data-premium-date value="${p.active && !p.lifetime ? isoDate(p.until) : ''}"></label>
          <button class="adm-btn adm-btn--primary" type="button" data-premium-until>Festlegen</button>
        </div>
        ${p.until ? `<div class="adm-row" style="margin-top:16px"><button class="adm-btn adm-btn--ghost-danger" type="button" data-premium-revoke>Premium entziehen</button></div>` : ''}
      </section>

      <section class="adm-sec">
        <h3>${ICON.shield}Zugang</h3>
        <p class="lead">Befristete Konten werden zum Ablaufdatum automatisch abgemeldet und können sich nicht mehr anmelden.</p>
        ${accessBox}
        <div class="adm-sublabel">Konto befristen (ab jetzt)</div>
        <div class="adm-quick">
          <button class="adm-btn" type="button" data-expire-days="1"${self ? ' disabled' : ''}>1 Tag</button>
          <button class="adm-btn" type="button" data-expire-days="7"${self ? ' disabled' : ''}>1 Woche</button>
          <button class="adm-btn" type="button" data-expire-days="30"${self ? ' disabled' : ''}>1 Monat</button>
          <button class="adm-btn" type="button" data-expire-days="90"${self ? ' disabled' : ''}>3 Monate</button>
          <button class="adm-btn" type="button" data-expire-none${u.expiresAt ? '' : ' disabled'}>Unbefristet</button>
        </div>
        <div class="adm-row" style="margin-top:12px">
          <label class="adm-field"><span>Gültig bis</span><input class="adm-input" type="date" data-expire-date value="${u.expiresAt ? isoDate(u.expiresAt) : ''}"${self ? ' disabled' : ''}></label>
          <button class="adm-btn adm-btn--primary" type="button" data-expire-set${self ? ' disabled' : ''}>Speichern</button>
        </div>
        <div class="adm-sublabel">Status & Rolle</div>
        <div class="adm-row" style="align-items:center;justify-content:space-between">
          ${u.blocked
            ? '<button class="adm-btn adm-btn--primary" type="button" data-unblock>Entsperren</button>'
            : `<button class="adm-btn adm-btn--ghost-danger" type="button" data-block${self ? ' disabled' : ''}>${ICON.lock}Konto sperren</button>`}
          <label class="adm-check"><input type="checkbox" data-is-test${u.isTest ? ' checked' : ''}>Testkonto</label>
          <label class="adm-field" style="flex:0 1 180px"><span class="sr-only">Rolle</span>
            <select class="adm-select" data-role${self ? ' disabled' : ''}><option value="user"${u.role !== 'admin' ? ' selected' : ''}>Rolle: Benutzer</option><option value="admin"${u.role === 'admin' ? ' selected' : ''}>Rolle: Admin</option></select>
          </label>
        </div>
        ${u.admin && u.role !== 'admin' ? '<p class="muted" style="font-size:13px;margin:10px 0 0">Admin über die Variable ADMIN_EMAILS.</p>' : ''}
      </section>

      <section class="adm-sec">
        <h3>${ICON.note}Profil & Notiz</h3>
        <p class="lead">Die Notiz sieht nur das Admin-Team.</p>
        <div class="adm-field"><span>Name</span><input class="adm-input" data-name maxlength="60" value="${esc(u.name || '')}"></div>
        <div class="adm-field" style="margin-top:12px"><span>Interne Notiz</span><textarea class="adm-textarea" data-note maxlength="1000" placeholder="z. B. Influencer-Kooperation, Testphase bis Ende Mai …">${esc(u.note || '')}</textarea></div>
        <div class="adm-row" style="margin-top:12px"><button class="adm-btn adm-btn--primary" type="button" data-save-profile>Speichern</button></div>
      </section>

      <section class="adm-sec">
        <h3>${ICON.key}Sicherheit</h3>
        <p class="lead">Ein neues Passwort wird nur einmal angezeigt. Alle Geräte werden dabei abgemeldet.</p>
        <div class="adm-row">
          <button class="adm-btn" type="button" data-reset-pw>Neues Passwort erzeugen</button>
          <button class="adm-btn" type="button" data-logout-all${s.sessions ? '' : ' disabled'}>Überall abmelden (${nf.format(s.sessions)})</button>
        </div>
        <div data-pw-out></div>
      </section>

      <section class="adm-sec">
        <h3>${ICON.chart}Lernaktivität</h3>
        <div class="adm-sublabel" style="margin-top:8px">Letzte 30 Tage</div>
        <div class="adm-heat" aria-label="Aktivität der letzten 30 Tage">${heat}</div>
        <div class="adm-sublabel">Zuletzt abgeschlossen</div>
        ${d.progress.length ? `<ul class="adm-mini">${d.progress.slice(0, 8).map((x) => `<li><span class="mono">${esc(x.lessonId)}</span><span>${x.best}/${x.total} richtig · ${x.attempts}× · ${esc(relative(x.at))}</span></li>`).join('')}</ul>` : '<p class="muted" style="margin:0;font-size:14px">Noch keine Lektion abgeschlossen.</p>'}
        ${d.redemptions.length ? `<div class="adm-sublabel">Eingelöste Codes</div><ul class="adm-mini">${d.redemptions.map((x) => `<li><span class="mono">${esc(x.code)}</span><span>${esc(fmtDateTime(x.at))}</span></li>`).join('')}</ul>` : ''}
      </section>

      <section class="adm-sec">
        <h3>${ICON.info}Details</h3>
        <dl class="adm-kv" style="margin-top:10px">
          <dt>Registriert</dt><dd>${esc(fmtDateTime(u.createdAt))}</dd>
          <dt>Letzter Login</dt><dd>${u.lastLoginAt ? `${esc(fmtDateTime(u.lastLoginAt))} (${esc(relative(u.lastLoginAt))})` : 'noch nie'}</dd>
          <dt>Sprache</dt><dd>${u.lang === 'en' ? 'Englisch' : 'Deutsch'}</dd>
          <dt>Tagesziel</dt><dd>${u.dailyGoal ? `${u.dailyGoal} XP` : '–'}</dd>
          <dt>Motivation</dt><dd>${esc(u.motive || '–')}</dd>
          <dt>Streak-Freezes</dt><dd>${nf.format(u.freezes || 0)}</dd>
          <dt>ID</dt><dd class="mono">${esc(u.id)}</dd>
        </dl>
      </section>

      <section class="adm-sec">
        <h3>${ICON.history}Verlauf</h3>
        ${d.log.length ? `<ul class="adm-mini" style="margin-top:8px">${d.log.map((e) => `<li><span><span class="adm-action">${esc(actionLabel(e.action))}</span> <span class="adm-detail">${esc(detailText(e))}</span></span><span class="muted nowrap" title="${esc(fmtDateTime(e.at))}">${esc(relative(e.at))}</span></li>`).join('')}</ul>` : '<p class="muted" style="margin:8px 0 0;font-size:14px">Noch keine Admin-Aktionen.</p>'}
      </section>

      ${self ? '' : `<section class="adm-sec adm-sec--danger">
        <h3>${ICON.trash}Konto löschen</h3>
        <p class="lead">Löscht das Konto mit allem Lernfortschritt endgültig. Das lässt sich nicht rückgängig machen.</p>
        <button class="adm-btn adm-btn--danger" type="button" data-delete>Konto endgültig löschen</button>
      </section>`}`;
    bindDrawer(u);
  }

  function bindDrawer(u) {
    const body = $('[data-drawer-body]');
    const on = (sel, fn) => { const el = $(sel, body); if (el) el.addEventListener('click', fn); };
    const base = `/api/admin/users/${encodeURIComponent(u.id)}`;
    const after = async (data) => { if (data) { await openUser(u.id); refreshCurrent(); } };
    const premium = async (body, msg) => after(await act(`${base}/premium`, body, msg));
    const update = async (body, msg) => after(await act(`${base}/update`, body, msg));

    $$('[data-premium-days]', body).forEach((b) => b.addEventListener('click', () => {
      const days = Number(b.dataset.premiumDays);
      premium({ mode: 'days', days }, `Premium um ${daysLabel(days)} verlängert`);
    }));
    on('[data-premium-lifetime]', async () => {
      if (await confirmDialog({ title: 'Lifetime-Premium vergeben?', html: `<p><b>${esc(u.email)}</b> bekommt Premium ohne Ablaufdatum.</p>`, ok: 'Lifetime vergeben', danger: false })) premium({ mode: 'lifetime' }, 'Lifetime-Premium vergeben');
    });
    on('[data-premium-add]', () => {
      const days = Math.round(Number($('[data-premium-custom]', body).value));
      if (!(days >= 1 && days <= 3650)) return toast('Bitte 1 bis 3650 Tage eingeben.', true);
      premium({ mode: 'days', days }, `Premium um ${daysLabel(days)} verlängert`);
    });
    on('[data-premium-until]', () => {
      const v = $('[data-premium-date]', body).value;
      if (!v) return toast('Bitte ein Datum wählen.', true);
      premium({ mode: 'until', until: endOfDay(v) }, `Premium gilt bis ${fmtDay(v)}`);
    });
    on('[data-premium-revoke]', async () => {
      if (await confirmDialog({ title: 'Premium entziehen?', html: `<p>Premium für <b>${esc(u.email)}</b> endet sofort. Der Lernfortschritt bleibt erhalten.</p>`, ok: 'Premium entziehen' })) premium({ mode: 'revoke' }, 'Premium entzogen');
    });

    $$('[data-expire-days]', body).forEach((b) => b.addEventListener('click', () => {
      const days = Number(b.dataset.expireDays);
      update({ expiresAt: new Date(Date.now() + days * DAY).toISOString() }, `Zugang gilt noch ${daysLabel(days)}`);
    }));
    on('[data-expire-none]', () => update({ expiresAt: null }, 'Befristung aufgehoben'));
    on('[data-expire-set]', async () => {
      const v = $('[data-expire-date]', body).value;
      if (!v) return toast('Bitte ein Datum wählen.', true);
      const iso = endOfDay(v);
      if (Date.parse(iso) < Date.now() && !(await confirmDialog({ title: 'Datum liegt in der Vergangenheit', html: '<p>Das Konto ist damit sofort abgelaufen und wird abgemeldet.</p>', ok: 'Trotzdem speichern' }))) return;
      update({ expiresAt: iso }, `Zugang gilt bis ${fmtDay(v)}`);
    });
    on('[data-block]', async () => {
      if (await confirmDialog({ title: 'Konto sperren?', html: `<p><b>${esc(u.email)}</b> wird sofort auf allen Geräten abgemeldet und kann sich nicht mehr anmelden, bis du das Konto entsperrst.</p>`, ok: 'Sperren' })) update({ blocked: true }, 'Konto gesperrt');
    });
    on('[data-unblock]', () => update({ blocked: false }, 'Konto entsperrt'));
    const testBox = $('[data-is-test]', body);
    testBox.addEventListener('change', () => update({ isTest: testBox.checked }, testBox.checked ? 'Als Testkonto markiert' : 'Kein Testkonto mehr'));
    const role = $('[data-role]', body);
    role.addEventListener('change', async () => {
      const toAdmin = role.value === 'admin';
      const ok = await confirmDialog({
        title: toAdmin ? 'Zum Admin machen?' : 'Admin-Rechte entziehen?',
        html: toAdmin ? `<p><b>${esc(u.email)}</b> kann danach alle Konten verwalten, Premium vergeben und Konten löschen.</p>` : `<p><b>${esc(u.email)}</b> verliert den Zugang zum Admin-Bereich.</p>`,
        ok: toAdmin ? 'Admin machen' : 'Rechte entziehen', danger: !toAdmin,
      });
      if (ok) update({ role: role.value }, toAdmin ? 'Admin-Rechte vergeben' : 'Admin-Rechte entzogen');
      else role.value = toAdmin ? 'user' : 'admin';
    });
    on('[data-save-profile]', () => update({ name: $('[data-name]', body).value, note: $('[data-note]', body).value }, 'Gespeichert'));

    on('[data-reset-pw]', async () => {
      if (!(await confirmDialog({ title: 'Neues Passwort erzeugen?', html: '<p>Das alte Passwort funktioniert danach nicht mehr und alle Geräte werden abgemeldet. Gib das neue Passwort sicher weiter.</p>', ok: 'Passwort erzeugen' }))) return;
      const data = await act(`${base}/password-reset`, {}, 'Neues Passwort erzeugt');
      if (!data) return;
      await openUser(u.id);
      const out = $('[data-pw-out]');
      if (out) {
        out.innerHTML = `<div class="adm-secret"><p>Neues Passwort – wird nur jetzt angezeigt:</p><div class="adm-secret__row"><code>${esc(data.password)}</code><button class="adm-btn adm-btn--sm" type="button" data-copy="${esc(data.password)}">${ICON.copy}Kopieren</button></div></div>`;
        out.scrollIntoView({ block: 'nearest' });
      }
    });
    on('[data-logout-all]', async () => after(await act(`${base}/logout-all`, {}, 'Auf allen Geräten abgemeldet')));
    on('[data-delete]', async () => {
      const ok = await confirmDialog({ title: 'Konto endgültig löschen?', html: `<p>Alle Daten von <b>${esc(u.email)}</b> (Fortschritt, Serie, Wörter, Codes) werden gelöscht.</p>`, ok: 'Endgültig löschen', confirmText: u.email });
      if (!ok) return;
      const data = await act(`${base}/delete`, { confirm: u.email }, 'Konto gelöscht');
      if (data) { closeDrawer(); refreshCurrent(); }
    });
  }

  // ---------- log labels ----------
  const ACTIONS = {
    premium_granted: 'Premium vergeben', premium_revoked: 'Premium entzogen', user_updated: 'Konto geändert',
    password_reset: 'Passwort zurückgesetzt', sessions_ended: 'Überall abgemeldet', user_deleted: 'Konto gelöscht',
    test_account_created: 'Testzugang erstellt', codes_created: 'Codes erstellt', code_disabled: 'Code deaktiviert',
    code_enabled: 'Code aktiviert', code_redeemed: 'Code eingelöst',
  };
  const actionLabel = (a) => ACTIONS[a] || a;
  function detailText(e) {
    const d = e.detail || {};
    switch (e.action) {
      case 'premium_granted':
        if (d.until === LIFETIME || d.mode === 'lifetime') return 'Lifetime';
        return `${d.mode === 'days' && d.days ? `+${daysLabel(Number(d.days))}, ` : ''}bis ${fmtDate(d.until)}`;
      case 'user_updated': {
        const parts = [];
        if ('blocked' in d) parts.push(d.blocked ? 'gesperrt' : 'entsperrt');
        if ('role' in d) parts.push(d.role === 'admin' ? 'zum Admin gemacht' : 'Admin-Rechte entzogen');
        if ('expiresAt' in d) parts.push(d.expiresAt ? `befristet bis ${fmtDate(d.expiresAt)}` : 'unbefristet');
        if ('isTest' in d) parts.push(d.isTest ? 'als Testkonto markiert' : 'kein Testkonto');
        if (d.name) parts.push('Name');
        if (d.note) parts.push('Notiz');
        return parts.join(', ');
      }
      case 'codes_created': return `${d.count} × ${d.lifetime ? 'Lifetime' : daysLabel(d.days)}, je ${d.maxUses}× einlösbar`;
      case 'code_disabled': case 'code_enabled': return d.code || '';
      case 'code_redeemed': return `${d.code || ''} → ${d.until === LIFETIME ? 'Lifetime' : `bis ${fmtDate(d.until)}`}`;
      case 'test_account_created': return `Zugang ${d.accountDays ? daysLabel(d.accountDays) : 'unbefristet'}, Premium ${d.lifetime ? 'Lifetime' : d.premiumDays ? daysLabel(d.premiumDays) : 'keins'}`;
      default: return '';
    }
  }

  // ======================================================================
  // Test accounts
  // ======================================================================
  const seg = (name, options, checked) => `<div class="adm-seg" role="radiogroup">${options.map(([v, l]) => `<label><input type="radio" name="${name}" value="${v}"${String(v) === String(checked) ? ' checked' : ''}><span>${l}</span></label>`).join('')}</div>`;

  function renderTest() {
    view.innerHTML = `
      <header class="adm-head">
        <div><h1>Testzugänge</h1><p>Zeitlich begrenzte Konten für Tester, Partner oder Presse – mit oder ohne Premium.</p></div>
      </header>
      <div class="adm-split">
        <section class="adm-card">
          <div class="adm-card__head"><h2>Neuen Testzugang erstellen</h2></div>
          <form class="adm-card__body" data-test-form novalidate>
            <div class="adm-grid2">
              <label class="adm-field"><span>E-Mail (optional)</span><input class="adm-input" type="email" name="email" placeholder="leer = test-…@test.hablena.com" autocomplete="off"><small>Leer lassen für eine automatische Adresse.</small></label>
              <label class="adm-field"><span>Name (optional)</span><input class="adm-input" name="name" maxlength="60" placeholder="z. B. Lisa (Beta-Tester)"></label>
            </div>
            <div class="adm-field" style="margin-top:18px"><span>Zugang gültig für</span>
              ${seg('account', [[1, '1 Tag'], [3, '3 Tage'], [7, '1 Woche'], [14, '2 Wochen'], [30, '1 Monat'], [0, 'Unbefristet'], ['custom', 'Eigene']], 7)}
              <input class="adm-input" type="number" min="1" max="3650" name="accountCustom" placeholder="Anzahl Tage" hidden style="max-width:200px">
            </div>
            <div class="adm-field" style="margin-top:18px"><span>Premium</span>
              ${seg('premium', [['same', 'Gleiche Dauer'], ['none', 'Kein Premium'], [7, '1 Woche'], [30, '1 Monat'], ['lifetime', 'Lifetime'], ['custom', 'Eigene']], 'same')}
              <input class="adm-input" type="number" min="1" max="3650" name="premiumCustom" placeholder="Anzahl Tage" hidden style="max-width:200px">
            </div>
            <div class="adm-grid2" style="margin-top:18px">
              <div class="adm-field"><span>Sprache</span>${seg('lang', [['de', 'Deutsch'], ['en', 'Englisch']], 'de')}</div>
              <label class="adm-field"><span>Interne Notiz</span><input class="adm-input" name="note" maxlength="500" placeholder="z. B. Feedback-Runde Juni"></label>
            </div>
            <div class="adm-row" style="margin-top:20px"><button class="adm-btn adm-btn--gold" type="submit">${ICON.plus}Testzugang erstellen</button></div>
            <div data-test-out></div>
          </form>
        </section>
        <section class="adm-card">
          <div class="adm-card__head"><h2>So funktioniert's</h2></div>
          <div class="adm-card__body" style="font-size:14px;color:var(--ink-2)">
            <p style="margin-top:0">Das Konto bekommt ein zufälliges Passwort, das nur einmal angezeigt wird. Kopiere die Zugangsdaten und schick sie an die Person.</p>
            <p>Nach Ablauf wird das Konto automatisch abgemeldet und die Anmeldung gesperrt. Du kannst es jederzeit unter <a href="#/users?filter=test">Benutzer → Testzugänge</a> verlängern, auf ein normales Konto umstellen oder löschen.</p>
            <p style="margin-bottom:0">„Gleiche Dauer“ gibt Premium genau so lange wie den Zugang, bei „Unbefristet“ also Lifetime.</p>
          </div>
        </section>
      </div>
      <section class="adm-card" style="margin-top:18px">
        <div class="adm-card__head"><h2>Bestehende Testzugänge</h2></div>
        <div data-test-list><div class="adm-loading" style="min-height:160px"><span class="adm-spin"></span></div></div>
      </section>`;
    const form = $('[data-test-form]');
    const toggleCustom = (name, input) => form.querySelectorAll(`input[name="${name}"]`).forEach((r) => r.addEventListener('change', () => {
      const el = form.elements[input];
      el.hidden = form.elements[name].value !== 'custom';
      if (!el.hidden) el.focus();
    }));
    toggleCustom('account', 'accountCustom');
    toggleCustom('premium', 'premiumCustom');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = form.elements;
      const accountDays = f.account.value === 'custom' ? Math.round(Number(f.accountCustom.value)) : Number(f.account.value);
      if (f.account.value === 'custom' && !(accountDays >= 1 && accountDays <= 3650)) return toast('Bitte 1 bis 3650 Tage für den Zugang eingeben.', true);
      const body = { email: f.email.value.trim() || undefined, name: f.name.value.trim(), accountDays, note: f.note.value.trim(), lang: f.lang.value };
      const pv = f.premium.value;
      if (pv === 'lifetime' || (pv === 'same' && !accountDays)) body.lifetime = true;
      else if (pv === 'same') body.premiumDays = accountDays;
      else if (pv === 'custom') {
        body.premiumDays = Math.round(Number(f.premiumCustom.value));
        if (!(body.premiumDays >= 1 && body.premiumDays <= 3650)) return toast('Bitte 1 bis 3650 Premium-Tage eingeben.', true);
      } else if (pv !== 'none') body.premiumDays = Number(pv);
      const btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      const data = await act('/api/admin/test-accounts', body, 'Testzugang erstellt');
      btn.disabled = false;
      if (!data) return;
      const u = data.user;
      const loginUrl = `${location.origin}${body.lang === 'en' ? '/login/' : LOGIN}`;
      const until = u.expiresAt ? fmtDateTime(u.expiresAt) : 'unbefristet';
      const prem = u.premiumUntil === LIFETIME ? 'Lifetime' : u.premiumUntil ? `bis ${fmtDateTime(u.premiumUntil)}` : 'kein Premium';
      const text = body.lang === 'en'
        ? `Your Hablena test access\n\nLogin: ${loginUrl}\nEmail: ${u.email}\nPassword: ${u.password}\nValid until: ${u.expiresAt ? fmtDateTime(u.expiresAt) : 'no end date'}\n\n¡Buena suerte!`
        : `Dein Hablena-Testzugang\n\nAnmelden: ${loginUrl}\nE-Mail: ${u.email}\nPasswort: ${u.password}\nGültig bis: ${until}\n\n¡Buena suerte!`;
      $('[data-test-out]').innerHTML = `
        <div class="adm-secret">
          <p>Zugangsdaten – das Passwort wird nur jetzt angezeigt:</p>
          <dl class="adm-creds">
            <dt>Login</dt><dd>${esc(loginUrl)}</dd>
            <dt>E-Mail</dt><dd>${esc(u.email)}</dd>
            <dt>Passwort</dt><dd><b>${esc(u.password)}</b></dd>
            <dt>Gültig bis</dt><dd>${esc(until)}</dd>
            <dt>Premium</dt><dd>${esc(prem)}</dd>
          </dl>
          <div class="adm-row">
            <button class="adm-btn adm-btn--primary adm-btn--sm" type="button" data-copy-creds>${ICON.copy}Zugangsdaten kopieren</button>
            <button class="adm-btn adm-btn--sm" type="button" data-open-user="${esc(u.id)}">Konto öffnen</button>
          </div>
        </div>`;
      $('[data-copy-creds]').addEventListener('click', () => copy(text, 'Zugangsdaten kopiert'));
      form.elements.email.value = '';
      form.elements.name.value = '';
      form.elements.note.value = '';
      loadTestList();
    });
    loadTestList();
  }

  async function loadTestList() {
    const box = $('[data-test-list]');
    if (!box) return;
    const r = await api('/api/admin/users?filter=test&sort=newest');
    if (!$('[data-test-list]')) return;
    if (!r.ok) { box.innerHTML = `<div class="adm-empty">${esc(errorText(r.data.error))}</div>`; return; }
    if (!r.data.users.length) { box.innerHTML = '<div class="adm-empty">Noch keine Testzugänge.</div>'; return; }
    box.innerHTML = `<div class="adm-table-wrap"><table class="adm-table adm-table--cards">
      <thead><tr><th>Konto</th><th>Zugang</th><th>Premium</th><th class="hide-m">Zuletzt aktiv</th><th class="hide-s">Notiz</th></tr></thead>
      <tbody>${r.data.users.map((u) => `<tr data-user="${esc(u.id)}" tabindex="0">
        <td>${userCell(u)}</td>
        <td class="nowrap">${u.blocked ? '<span class="badge badge--blocked">Gesperrt</span>' : u.expired ? `<span class="badge badge--expired">Abgelaufen</span>` : u.expiresAt ? `bis ${esc(fmtDate(u.expiresAt))} <span class="muted">(${esc(relative(u.expiresAt))})</span>` : 'unbefristet'}</td>
        <td class="nowrap">${premiumText(u.premium)}</td>
        <td class="hide-m nowrap">${esc(relDay(u.lastActive))}</td>
        <td class="hide-s muted">${esc(u.note || '')}</td>
      </tr>`).join('')}</tbody></table></div>`;
    $$('tr[data-user]', box).forEach((tr) => {
      tr.addEventListener('click', () => openUser(tr.dataset.user, tr));
      tr.addEventListener('keydown', (e) => { if (e.key === 'Enter') openUser(tr.dataset.user, tr); });
    });
  }

  // ======================================================================
  // Codes
  // ======================================================================
  let codesCache = [];
  function renderCodes() {
    view.innerHTML = `
      <header class="adm-head">
        <div><h1>Gutscheincodes</h1><p>Codes für Premium erstellen – z. B. für Gewinnspiele, Partner oder Support. Einlösen geht im Konto-Bereich der App.</p></div>
      </header>
      <section class="adm-card">
        <div class="adm-card__head"><h2>Codes erstellen</h2></div>
        <form class="adm-card__body" data-code-form novalidate>
          <div class="adm-field"><span>Premium-Dauer pro Einlösung</span>
            ${seg('days', [[1, '1 Tag'], [7, '1 Woche'], [30, '1 Monat'], [90, '3 Monate'], [365, '1 Jahr'], ['lifetime', 'Lifetime'], ['custom', 'Eigene']], 30)}
            <input class="adm-input" type="number" min="1" max="3650" name="daysCustom" placeholder="Anzahl Tage" hidden style="max-width:200px">
          </div>
          <div class="adm-row" style="margin-top:18px">
            <label class="adm-field"><span>Anzahl Codes</span><input class="adm-input" type="number" name="count" min="1" max="100" value="1"><small>1 bis 100 auf einmal</small></label>
            <label class="adm-field"><span>Einlösungen pro Code</span><input class="adm-input" type="number" name="maxUses" min="1" max="100000" value="1"><small>1 = Einmal-Code, mehr = Sammelcode</small></label>
            <label class="adm-field"><span>Präfix</span><input class="adm-input mono" name="prefix" maxlength="10" value="HABLA" style="text-transform:uppercase"><small>Nur A–Z und 0–9</small></label>
          </div>
          <div class="adm-field" style="margin-top:18px"><span>Einlösbar bis</span>
            ${seg('valid', [[0, 'Unbegrenzt'], [7, '1 Woche'], [30, '1 Monat'], [90, '3 Monate'], [365, '1 Jahr']], 0)}
          </div>
          <label class="adm-field" style="margin-top:18px"><span>Interne Notiz</span><input class="adm-input" name="note" maxlength="300" placeholder="z. B. Instagram-Gewinnspiel Juli"></label>
          <div class="adm-row" style="margin-top:20px"><button class="adm-btn adm-btn--gold" type="submit">${ICON.plus}Codes erstellen</button></div>
          <div data-code-out></div>
        </form>
      </section>
      <section class="adm-card">
        <div class="adm-card__head"><h2>Alle Codes</h2><label class="adm-search" style="flex:0 1 260px">${ICON.search}<span class="sr-only">Codes filtern</span><input class="adm-input" type="search" data-code-filter placeholder="Code oder Notiz …"></label></div>
        <div data-code-list><div class="adm-loading" style="min-height:160px"><span class="adm-spin"></span></div></div>
      </section>`;
    const form = $('[data-code-form]');
    form.querySelectorAll('input[name="days"]').forEach((r) => r.addEventListener('change', () => {
      form.elements.daysCustom.hidden = form.elements.days.value !== 'custom';
      if (!form.elements.daysCustom.hidden) form.elements.daysCustom.focus();
    }));
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = form.elements;
      const body = { count: Math.round(Number(f.count.value)) || 1, maxUses: Math.round(Number(f.maxUses.value)) || 1, prefix: f.prefix.value, validDays: Number(f.valid.value), note: f.note.value.trim() };
      if (f.days.value === 'lifetime') body.lifetime = true;
      else body.days = f.days.value === 'custom' ? Math.round(Number(f.daysCustom.value)) : Number(f.days.value);
      if (!body.lifetime && !(body.days >= 1 && body.days <= 3650)) return toast('Bitte 1 bis 3650 Tage eingeben.', true);
      if (body.count < 1 || body.count > 100) return toast('Bitte 1 bis 100 Codes wählen.', true);
      const btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      const data = await act('/api/admin/codes', body, body.count === 1 ? 'Code erstellt' : `${body.count} Codes erstellt`);
      btn.disabled = false;
      if (!data) return;
      const desc = body.lifetime ? 'Lifetime' : daysLabel(body.days);
      $('[data-code-out]').innerHTML = `
        <div class="adm-secret">
          <p>${data.codes.length === 1 ? 'Neuer Code' : `${data.codes.length} neue Codes`} · ${esc(desc)} Premium · je ${nf.format(body.maxUses)}× einlösbar</p>
          <div class="adm-codes-out">${data.codes.map((c) => `<code>${esc(c)}</code>`).join('')}</div>
          <div class="adm-row">
            <button class="adm-btn adm-btn--primary adm-btn--sm" type="button" data-copy-codes>${ICON.copy}Alle kopieren</button>
            <button class="adm-btn adm-btn--sm" type="button" data-csv-codes>${ICON.download}Als CSV</button>
          </div>
        </div>`;
      $('[data-copy-codes]').addEventListener('click', () => copy(data.codes.join('\n'), 'Codes kopiert'));
      $('[data-csv-codes]').addEventListener('click', () => download(`hablena-codes-${isoDate(Date.now())}.csv`, csv([['Code', 'Premium', 'Einlösungen'], ...data.codes.map((c) => [c, desc, body.maxUses])])));
      loadCodes();
    });
    $('[data-code-filter]').addEventListener('input', () => drawCodes());
    loadCodes();
  }

  async function loadCodes() {
    const r = await api('/api/admin/codes');
    if (!$('[data-code-list]')) return;
    if (!r.ok) { $('[data-code-list]').innerHTML = `<div class="adm-empty">${esc(errorText(r.data.error))}</div>`; return; }
    codesCache = r.data.codes;
    drawCodes();
  }

  function drawCodes() {
    const box = $('[data-code-list]');
    if (!box) return;
    const q = ($('[data-code-filter]')?.value || '').trim().toLowerCase();
    const list = codesCache.filter((c) => !q || c.code.toLowerCase().includes(q) || (c.note || '').toLowerCase().includes(q));
    if (!list.length) { box.innerHTML = `<div class="adm-empty">${codesCache.length ? 'Keine passenden Codes.' : 'Noch keine Codes erstellt.'}</div>`; return; }
    const now = Date.now();
    const status = (c) => c.disabled ? '<span class="badge badge--blocked">Deaktiviert</span>'
      : c.expiresAt && c.expiresAt <= now ? '<span class="badge badge--expired">Abgelaufen</span>'
      : c.used >= c.maxUses ? '<span class="badge">Aufgebraucht</span>'
      : '<span class="badge badge--ok">Aktiv</span>';
    box.innerHTML = `<div class="adm-table-wrap"><table class="adm-table">
      <thead><tr><th>Code</th><th>Premium</th><th>Genutzt</th><th>Status</th><th class="hide-m">Einlösbar bis</th><th class="hide-s">Notiz</th><th class="hide-m">Erstellt</th><th><span class="sr-only">Aktion</span></th></tr></thead>
      <tbody>${list.map((c) => `<tr>
        <td class="nowrap"><span class="mono"><b>${esc(c.code)}</b></span> <button class="adm-copy" type="button" data-copy="${esc(c.code)}" aria-label="Code kopieren">${ICON.copy}</button></td>
        <td class="nowrap">${c.lifetime ? '<b>Lifetime</b>' : esc(daysLabel(c.days))}</td>
        <td class="nowrap">${nf.format(c.used)} / ${nf.format(c.maxUses)}</td>
        <td>${status(c)}</td>
        <td class="hide-m nowrap">${c.expiresAt ? esc(fmtDate(c.expiresAt)) : 'unbegrenzt'}</td>
        <td class="hide-s muted">${esc(c.note || '')}</td>
        <td class="hide-m nowrap muted" title="${esc(c.createdBy || '')}">${esc(fmtDate(c.createdAt))}</td>
        <td class="num"><button class="adm-btn adm-btn--sm${c.disabled ? '' : ' adm-btn--ghost-danger'}" type="button" data-code-toggle="${esc(c.code)}" data-to="${c.disabled ? 'enable' : 'disable'}">${c.disabled ? 'Aktivieren' : 'Deaktivieren'}</button></td>
      </tr>`).join('')}</tbody></table></div>`;
    $$('[data-code-toggle]', box).forEach((b) => b.addEventListener('click', async () => {
      const data = await act(`/api/admin/codes/${encodeURIComponent(b.dataset.codeToggle)}/${b.dataset.to}`, {}, b.dataset.to === 'disable' ? 'Code deaktiviert' : 'Code aktiviert');
      if (data) loadCodes();
    }));
  }

  // ======================================================================
  // Audit log
  // ======================================================================
  let logPage = 0;
  async function renderLog() {
    view.innerHTML = `
      <header class="adm-head"><div><h1>Protokoll</h1><p>Jede Admin-Aktion und jede Code-Einlösung, neueste zuerst.</p></div></header>
      <section class="adm-card"><div data-log><div class="adm-loading" style="min-height:200px"><span class="adm-spin"></span></div></div></section>`;
    loadLog();
  }
  async function loadLog() {
    const r = await api(`/api/admin/log?page=${logPage}`);
    const box = $('[data-log]');
    if (!box) return;
    if (!r.ok) { box.innerHTML = `<div class="adm-empty">${esc(errorText(r.data.error))}</div>`; return; }
    const { entries, more, page } = r.data;
    if (!entries.length && page === 0) { box.innerHTML = '<div class="adm-empty">Noch keine Einträge.</div>'; return; }
    box.innerHTML = `<div class="adm-table-wrap"><table class="adm-table">
      <thead><tr><th>Zeitpunkt</th><th>Aktion</th><th>Konto</th><th class="hide-s">Details</th><th class="hide-m">Von</th></tr></thead>
      <tbody>${entries.map((e) => `<tr>
        <td class="nowrap" title="${esc(relative(e.at))}">${esc(fmtDateTime(e.at))}</td>
        <td class="nowrap"><span class="adm-action">${esc(actionLabel(e.action))}</span></td>
        <td>${e.targetId && e.action !== 'user_deleted' ? `<button class="adm-userlink" type="button" data-open-user="${esc(e.targetId)}" style="color:var(--blue)">${esc(e.target || '')}</button>` : `<span class="muted">${esc(e.target || '–')}</span>`}</td>
        <td class="hide-s adm-detail">${esc(detailText(e))}</td>
        <td class="hide-m muted">${esc(e.admin || 'Benutzer selbst')}</td>
      </tr>`).join('')}</tbody></table></div>
      <div class="adm-pager"><span>Seite ${page + 1}</span><div><button class="adm-btn adm-btn--sm" type="button" data-log-page="-1"${page === 0 ? ' disabled' : ''}>Neuere</button><button class="adm-btn adm-btn--sm" type="button" data-log-page="1"${more ? '' : ' disabled'}>Ältere</button></div></div>`;
    $$('[data-log-page]', box).forEach((b) => b.addEventListener('click', () => { logPage += Number(b.dataset.logPage); loadLog(); }));
  }

  // ======================================================================
  // Global events & start
  // ======================================================================
  document.addEventListener('click', (e) => {
    const openBtn = e.target.closest('[data-open-user]');
    if (openBtn) { openUser(openBtn.dataset.openUser, openBtn); return; }
    const copyBtn = e.target.closest('[data-copy]');
    if (copyBtn) { copy(copyBtn.dataset.copy); return; }
    if (e.target.closest('[data-drawer-close]')) closeDrawer();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !$('[data-drawer]').hidden && !$('[data-dialog]').open) closeDrawer();
  });
  $('[data-logout]').addEventListener('click', async () => {
    await api('/api/auth/logout', {});
    location.href = '/de/';
  });
  window.addEventListener('hashchange', () => { closeDrawer(); route(); });

  (async () => {
    const r = await api('/api/me');
    if (r.status === 401 || !r.data.user) return showGate('login');
    if (!r.data.user.admin) return showGate('forbidden');
    me = r.data.user;
    $('[data-me-email]').textContent = me.email;
    $('[data-me-email]').title = me.email;
    $('[data-me-avatar]').textContent = (me.name || me.email)[0].toUpperCase();
    route();
  })();
})();
