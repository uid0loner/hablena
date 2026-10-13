// Marks that JavaScript runs, so scroll reveals can start hidden.
document.documentElement.classList.add('js');

// Hablena — small progressive enhancements. The page works without JS.

(() => {
  // Mobile menu
  const header = document.querySelector('[data-header]');
  const toggle = document.querySelector('[data-menu-toggle]');
  if (header && toggle) {
    toggle.addEventListener('click', () => {
      const open = header.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    header.querySelectorAll('.nav a').forEach((a) =>
      a.addEventListener('click', () => {
        header.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      })
    );
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && header.classList.contains('is-open')) {
        header.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.focus();
      }
    });
  }

  // Monthly / yearly pricing switch
  const billing = document.querySelector('[data-billing]');
  if (billing) {
    const targets = document.querySelectorAll('[data-price], [data-per], [data-note]');
    billing.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-period]');
      if (!btn) return;
      const period = btn.dataset.period;
      billing.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      targets.forEach((el) => {
        const value = el.dataset[period];
        if (value) el.textContent = value;
      });
    });
  }
})();

// Conjugator: live filter on the index page (accent-insensitive)
(() => {
  const input = document.querySelector('[data-verb-filter]');
  const groups = document.querySelectorAll('[data-verb-group]');
  if (!input || !groups.length) return;
  const empty = document.querySelector('[data-verb-empty]');
  const fold = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

  const apply = () => {
    const q = fold(input.value);
    let total = 0;
    groups.forEach((g) => {
      let shown = 0;
      g.querySelectorAll('[data-verb]').forEach((li) => {
        const hit = !q || li.dataset.verb.includes(q);
        li.hidden = !hit;
        if (hit) shown++;
      });
      g.hidden = shown === 0;
      total += shown;
    });
    if (empty) empty.hidden = total !== 0;
  };

  // Enter jumps straight to the verb when there is exactly one match
  input.closest('form')?.addEventListener('submit', (e) => {
    const visible = [...document.querySelectorAll('[data-verb]:not([hidden]) a')];
    if (visible.length === 1) { e.preventDefault(); location.href = visible[0].href; }
    else e.preventDefault();
  });

  const q = new URLSearchParams(location.search).get('q');
  if (q) input.value = q;
  input.addEventListener('input', apply);
  apply();
})();

// Grammar quizzes
(() => {
  document.querySelectorAll('[data-quiz]').forEach((quiz) => {
    const questions = quiz.querySelectorAll('.quiz__q');
    const scoreEl = quiz.querySelector('[data-quiz-score]');
    let answered = 0;
    let correct = 0;
    questions.forEach((q) => {
      const answer = Number(q.dataset.answer);
      const buttons = q.querySelectorAll('.quiz__opt');
      buttons.forEach((btn) =>
        btn.addEventListener('click', () => {
          const i = Number(btn.dataset.i);
          const ok = i === answer;
          buttons.forEach((b) => { b.disabled = true; });
          btn.classList.add(ok ? 'is-right' : 'is-wrong');
          if (!ok) buttons[answer].classList.add('is-right');
          const blank = q.querySelector('[data-blank]');
          if (blank) { blank.textContent = buttons[answer].textContent; blank.classList.add('is-filled'); }
          const why = q.querySelector('[data-why]');
          why.querySelector('[data-verdict]').textContent = ok ? quiz.dataset.correct : quiz.dataset.wrong;
          why.hidden = false;
          answered++;
          if (ok) correct++;
          if (answered === questions.length && scoreEl) {
            scoreEl.textContent = quiz.dataset.score.replace('{score}', correct).replace('{total}', questions.length);
            scoreEl.hidden = false;
          }
        })
      );
    });
  });
})();

// Accounts: sign-up, log-in, app area
(() => {
  const post = (path, body) =>
    fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify(body || {}) })
      .then(async (res) => ({ ok: res.ok, status: res.status, data: await res.json().catch(() => ({})) }));
  const readMessages = (el) => { try { return JSON.parse(el.dataset.messages || '{}'); } catch { return {}; } };
  const showError = (box, messages, code) => { box.textContent = messages[code] || messages.server_error || code; box.hidden = false; };

  // Sign-up / log-in forms
  document.querySelectorAll('[data-auth-form]').forEach((form) => {
    const mode = form.dataset.authForm;
    const messages = readMessages(form);
    const errorBox = form.querySelector('[data-auth-error]');
    const button = form.querySelector('button[type="submit"]');
    const fields = { name: form.querySelector('#name'), email: form.querySelector('#email'), password: form.querySelector('#password') };

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      errorBox.hidden = true;
      Object.values(fields).forEach((f) => f && f.removeAttribute('aria-invalid'));

      const email = fields.email.value.trim();
      const password = fields.password.value;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { fields.email.setAttribute('aria-invalid', 'true'); fields.email.focus(); return showError(errorBox, messages, 'invalid_email'); }
      if (mode === 'signup' && password.length < 10) { fields.password.setAttribute('aria-invalid', 'true'); fields.password.focus(); return showError(errorBox, messages, 'weak_password'); }

      button.disabled = true;
      button.textContent = button.dataset.busy;
      try {
        const body = { email, password };
        if (mode === 'signup') {
          body.name = fields.name ? fields.name.value.trim() : '';
          body.lang = form.dataset.lang;
          const motive = form.querySelector('input[name="motive"]:checked');
          const goal = form.querySelector('input[name="dailyGoal"]:checked');
          if (motive) body.motive = motive.value;
          if (goal) body.dailyGoal = Number(goal.value);
        }
        const res = await post(`/api/auth/${mode}`, body);
        if (res.ok) {
          const next = new URLSearchParams(location.search).get('next') || '';
          location.href = /^\/[a-z0-9/_-]*$/i.test(next) && !next.startsWith('//') ? next : form.dataset.redirect;
          return;
        }
        showError(errorBox, messages, res.data.error || 'server_error');
      } catch {
        showError(errorBox, messages, 'network');
      }
      button.disabled = false;
      button.textContent = button.dataset.label;
    });
  });

  // Sign-up onboarding: why you learn → daily goal → account, one step at a time
  document.querySelectorAll('[data-onboarding]').forEach((form) => {
    const steps = [...form.querySelectorAll('[data-ob-step]')];
    const bar = form.querySelector('[data-ob-bar]');
    let current = 0;
    const show = (n) => {
      current = n;
      steps.forEach((st, i) => { st.hidden = i !== n; });
      steps[n].classList.remove('is-enter'); void steps[n].offsetWidth; steps[n].classList.add('is-enter');
      if (bar) bar.style.width = `${((n + 1) / steps.length) * 100}%`;
      const focusable = steps[n].querySelector('input:checked, input:not([type=radio]), h1');
      if (n === steps.length - 1) steps[n].querySelector('input')?.focus({ preventScroll: true });
      else focusable?.focus?.({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    const motiveNext = steps[0].querySelector('[data-ob-next]');
    form.querySelectorAll('input[name="motive"]').forEach((r) => r.addEventListener('change', () => {
      motiveNext.disabled = false;
      window.HablenaSfx?.play('tap');
    }));
    form.querySelectorAll('input[name="dailyGoal"]').forEach((r) => r.addEventListener('change', () => window.HablenaSfx?.play('tap')));
    form.querySelectorAll('[data-ob-next], [data-ob-skip]').forEach((b) => b.addEventListener('click', () => show(Math.min(current + 1, steps.length - 1))));
    form.querySelectorAll('[data-ob-skip]').forEach((b) => b.addEventListener('click', () => form.querySelectorAll('input[name="motive"]').forEach((r) => { r.checked = false; })));
    form.querySelectorAll('[data-ob-back]').forEach((b) => b.addEventListener('click', () => show(Math.max(current - 1, 0))));
    // Enter on a choice step moves on instead of submitting the form
    form.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && current < steps.length - 1) {
        e.preventDefault();
        const next = steps[current].querySelector('[data-ob-next]');
        if (next && !next.disabled) next.click();
      }
    });
    show(0);
  });

  // Voucher codes (account section and the Premium page)
  const longDate = (ms) => new Date(ms).toLocaleDateString(document.documentElement.lang, { year: 'numeric', month: 'long', day: 'numeric' });
  const bindRedeem = (form, messages, okText, after) => form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const box = form.querySelector('[data-auth-error]');
    const okBox = form.querySelector('[data-redeem-ok]');
    const input = form.elements.code;
    const btn = form.querySelector('button');
    box.hidden = true; okBox.hidden = true;
    const code = input.value.trim();
    if (!code) { input.focus(); return; }
    btn.disabled = true;
    const res = await post('/api/me/redeem', { code }).catch(() => null);
    btn.disabled = false;
    if (!res || !res.ok) { showError(box, messages, res ? res.data.error || 'server_error' : 'network'); return; }
    input.value = '';
    okBox.textContent = okText(res.data.premium);
    okBox.hidden = false;
    window.HablenaSfx?.play?.('complete');
    if (after) after();
  });

  // Premium page: current status, limits from the admin settings, voucher codes
  const prem = document.querySelector('[data-premium-page]');
  if (prem) {
    const T = JSON.parse(prem.dataset.t);
    const status = prem.querySelector('[data-prem-status]');
    const form = prem.querySelector('[data-redeem-form]');
    const label = (p) => (p.lifetime ? T.lifetime : T.until.replace('{date}', longDate(p.until)));
    const refresh = () => fetch('/api/me', { credentials: 'same-origin' }).then((r) => (r.ok ? r.json() : null)).then((me) => {
      if (!me) { form.hidden = true; prem.querySelector('[data-prem-login]').hidden = false; return; }
      const p = me.user.premium || {};
      const a = me.access || {};
      const free = a.freeUnits === 1 ? '1' : `1–${a.freeUnits}`;
      prem.querySelectorAll('[data-tpl]').forEach((td) => {
        td.textContent = td.dataset.tpl.replace('{free}', free).replace('{units}', prem.dataset.units).replace('{practice}', a.freePracticePerDay);
      });
      prem.classList.toggle('is-premium', !!p.active);
      status.textContent = p.lifetime ? T.lifetimeActive : p.active ? T.active.replace('{date}', longDate(p.until)) : a.paywall ? '' : T.freeOpen;
      status.hidden = !status.textContent;
      document.querySelectorAll('[data-avatar]').forEach((el) => el.classList.toggle('is-premium', !!p.active));
    }).catch(() => {});
    bindRedeem(form, readMessages(prem), (p) => T.redeemed.replace('{plan}', label(p)), refresh);
    refresh();
  }

  // App area: learning path, streak and XP
  const app = document.querySelector('[data-app]');
  if (!app) return;
  const messages = readMessages(app);
  const D = app.dataset;
  const today = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const setAll = (sel, value) => document.querySelectorAll(sel).forEach((el) => { el.textContent = String(value); });
  app.setAttribute('aria-busy', 'true');

  // Popovers on the path
  const nodes = [...app.querySelectorAll('[data-node]')];
  const closeAll = (except) => nodes.forEach((node) => {
    if (node === except) return;
    node.classList.remove('is-open');
    node.querySelector('.node__btn').setAttribute('aria-expanded', 'false');
    node.querySelector('.node__pop').hidden = true;
  });
  nodes.forEach((node) => {
    const btn = node.querySelector('.node__btn');
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = !node.classList.contains('is-open');
      closeAll(node);
      node.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', String(open));
      node.querySelector('.node__pop').hidden = !open;
      window.HablenaSfx?.play('tap');
    });
    node.querySelector('.node__pop').addEventListener('click', (e) => e.stopPropagation());
  });
  document.addEventListener('click', () => closeAll());
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAll(); });

  const applyProgress = (progress) => {
    const done = new Map(progress.map((p) => [p.lessonId, p]));
    let currentFound = false;
    nodes.forEach((node) => {
      const btn = node.querySelector('.node__btn');
      const id = btn.dataset.lesson;
      const p = done.get(id);
      node.classList.remove('is-locked', 'is-done', 'is-current');
      const go = node.querySelector('[data-go]');
      const score = node.querySelector('[data-score]');
      if (p) {
        node.classList.add('is-done');
        go.textContent = D.reviewLabel;
        score.textContent = D.scoreLabel.replace('{n}', p.bestCorrect).replace('{total}', p.total);
        score.hidden = false;
      } else if (!currentFound) {
        node.classList.add('is-current');
        go.textContent = D.startLabel;
        currentFound = true;
      } else {
        node.classList.add('is-locked');
      }
    });
    app.querySelectorAll('[data-unit]').forEach((unit) => {
      const all = unit.querySelectorAll('[data-node]').length;
      const finished = unit.querySelectorAll('[data-node].is-done').length;
      unit.querySelector('[data-unit-count]').textContent = `${finished}/${all}`;
      unit.classList.toggle('is-complete', finished === all);
      const storyNode = unit.querySelector('[data-story-node]');
      if (storyNode) {
        const sid = storyNode.dataset.storyNode;
        const open = finished === all;
        const heard = done.has(sid);
        storyNode.classList.toggle('is-locked', !open);
        storyNode.classList.toggle('is-available', open && !heard);
        storyNode.classList.toggle('is-done', heard);
        const link = storyNode.querySelector('a');
        link.tabIndex = open ? 0 : -1;
        link.setAttribute('aria-disabled', String(!open));
        if (open) link.removeAttribute('title');
      }
      const trophy = unit.querySelector('[data-trophy]');
      if (trophy) { trophy.tabIndex = finished === all ? 0 : -1; trophy.setAttribute('aria-disabled', String(finished !== all)); }
    });
    const current = app.querySelector('.node.is-current');
    if (current && current.getBoundingClientRect().top > window.innerHeight * 0.8) {
      current.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  };

  const applyStats = (s) => {
    setAll('[data-stat-streak]', s.streak);
    setAll('[data-stat-xptotal]', s.xpTotal);
    setAll('[data-stat-xptoday]', s.xpToday);
    setAll('[data-stat-goal]', s.dailyGoal);
    document.querySelector('[data-chip-streak]')?.classList.toggle('is-active', s.activeToday);
    const pct = Math.min(100, Math.round((s.xpToday / s.dailyGoal) * 100));
    const bar = app.querySelector('[data-goalbar]');
    bar.firstElementChild.style.width = pct + '%';
    bar.setAttribute('aria-valuenow', String(pct));
    bar.classList.toggle('is-full', pct >= 100);
    app.querySelector('[data-goal-msg]').textContent = pct >= 100 ? D.goalDone : D.goalText.replace('{xp}', s.xpToday).replace('{goal}', s.dailyGoal);
    app.querySelector('[data-streak-msg]').textContent = s.activeToday ? D.streakActive : D.streakHint;
    applyGameStats(app, s);
  };

  const applyBadges = (progress, s) => {
    const done = progress.filter((p) => /-l\d+$/.test(p.lessonId)).length;
    const unitDone = [...app.querySelectorAll('[data-unit]')].some((u) => u.classList.contains('is-complete'));
    const earned = {
      first: done >= 1, five: done >= 5, ten: done >= 10, unit: unitDone,
      perfect: progress.some((p) => p.bestCorrect === p.total),
      streak3: (s.bestStreak || 0) >= 3, streak7: (s.bestStreak || 0) >= 7,
      xp100: (s.xpTotal || 0) >= 100, xp500: (s.xpTotal || 0) >= 500,
    };
    let n = 0;
    app.querySelectorAll('[data-badge]').forEach((b) => {
      const on = !!earned[b.dataset.badge];
      b.classList.toggle('is-earned', on);
      if (on) n++;
    });
    const count = app.querySelector('[data-badge-count]');
    if (count) count.textContent = count.textContent.replace(/^\d+/, String(n));
  };

  fetch('/api/me', { credentials: 'same-origin' })
    .then(async (res) => {
      if (res.status === 401 || res.status === 503) { location.replace(D.login); return; }
      const meData = await res.json();
      const { user } = meData;
      const greet = document.querySelector('[data-greeting]');
      if (greet && user.name) greet.textContent = greet.dataset.template.replace('{name}', user.name);
      const avatar = document.querySelector('[data-avatar]');
      if (avatar) avatar.textContent = (user.name || user.email || '?').trim().charAt(0).toUpperCase();
      const line = document.querySelector('[data-motive-line]');
      if (line && user.motive) {
        try { line.textContent = JSON.parse(line.dataset.lines)[user.motive] || ''; } catch {}
        line.hidden = !line.textContent;
      }
      const goalSelect = app.querySelector('[data-goal-select]');
      if (goalSelect && user.dailyGoal) goalSelect.value = String(user.dailyGoal);
      applyPlan(user);
      const nameInput = app.querySelector('#acct-name');
      if (nameInput) nameInput.value = user.name || '';
      app.querySelector('[data-user-email]').textContent = user.email;
      app.querySelector('[data-user-since]').textContent = new Date(user.createdAt).toLocaleDateString(document.documentElement.lang, { year: 'numeric', month: 'long', day: 'numeric' });
      const [progress, stats] = await Promise.all([
        fetch('/api/progress', { credentials: 'same-origin' }).then((r) => (r.ok ? r.json() : { progress: [] })),
        fetch(`/api/stats?today=${today()}`, { credentials: 'same-origin' }).then((r) => (r.ok ? r.json() : null)),
      ]);
      applyProgress(progress.progress || []);
      applyLocks(meData.access);
      if (stats) applyStats(stats);
      applyBadges(progress.progress || [], stats || {});
      const vaultCard = app.querySelector('[data-vault-card]');
      const mini = document.getElementById('vault-mini');
      if (vaultCard && mini) {
        hablenaLearnedWords(JSON.parse(mini.textContent)).then((words) => {
          if (!words || !words.length) return;
          const seen = new Set();
          const uniq = words.filter((w) => !seen.has(w.es) && seen.add(w.es));
          const weak = uniq.filter((w) => w.strength < 0.5).length;
          vaultCard.querySelector('[data-vault-text]').textContent = vaultCard.dataset.text.replace('{n}', uniq.length).replace('{weak}', weak);
          vaultCard.querySelector('[data-vault-weak]').hidden = weak < 1;
        }).catch(() => {});
      }
      app.removeAttribute('aria-busy');
    })
    .catch(() => location.replace(D.login));

  // Plan (Free / Premium / Lifetime), test-access notice, admin link and voucher codes
  const planCard = app.querySelector('[data-plan]');
  const planT = (() => { try { return JSON.parse(planCard.dataset.t); } catch { return {}; } })();
  const planLabel = (p) => (p.lifetime ? planT.lifetime : planT.until.replace('{date}', longDate(p.until)));
  function applyPlan(user) {
    if (!planCard) return;
    const p = user.premium || {};
    planCard.classList.toggle('is-premium', !!p.active);
    planCard.classList.toggle('is-lifetime', !!p.lifetime);
    planCard.querySelector('[data-plan-name]').textContent = p.lifetime ? planT.lifetime : p.active ? planT.premium : planT.free;
    const more = app.querySelector('[data-plan-more]');
    if (more) more.hidden = !!p.lifetime;
    planCard.querySelector('[data-plan-sub]').textContent = p.lifetime ? planT.lifetimeText : p.active ? planT.until.replace('{date}', longDate(p.until)) : planT.freeText;
    document.querySelectorAll('[data-avatar]').forEach((a) => a.classList.toggle('is-premium', !!p.active));
    const test = app.querySelector('[data-plan-test]');
    if (test) { test.hidden = !user.expiresAt; if (user.expiresAt) test.textContent = planT.testUntil.replace('{date}', longDate(user.expiresAt)); }
    const adminLink = app.querySelector('[data-admin-link]');
    if (adminLink) adminLink.hidden = !user.admin;
  }
  bindRedeem(app.querySelector('[data-redeem-form]'), messages, (p) => planT.redeemed.replace('{plan}', planLabel(p)), async () => {
    const me = await fetch('/api/me', { credentials: 'same-origin' }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    if (me) { applyPlan(me.user); applyLocks(me.access); }
  });

  // Edit account: name, email (needs password), password (needs the current one)
  app.querySelectorAll('[data-acct-form]').forEach((form) => {
    const kind = form.dataset.acctForm;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const box = form.querySelector('[data-auth-error]');
      const ok = form.querySelector('[data-ok]');
      const btn = form.querySelector('button[type="submit"]');
      box.hidden = true; ok.hidden = true;
      const v = (id) => form.querySelector('#' + id).value;
      let path, body;
      if (kind === 'profile') { path = '/api/me/profile'; body = { name: v('acct-name') }; }
      if (kind === 'email') {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v('acct-email').trim())) return showError(box, messages, 'invalid_email');
        path = '/api/me/email'; body = { email: v('acct-email').trim(), password: v('acct-email-pw') };
      }
      if (kind === 'password') {
        if (v('acct-pw-new').length < 10) return showError(box, messages, 'weak_password');
        path = '/api/me/password'; body = { current: v('acct-pw-current'), next: v('acct-pw-new') };
      }
      btn.disabled = true;
      const res = await post(path, body).catch(() => null);
      btn.disabled = false;
      if (!res || !res.ok) return showError(box, messages, res ? res.data.error || 'server_error' : 'network');
      ok.hidden = false;
      form.querySelectorAll('input[type="password"]').forEach((i) => { i.value = ''; });
      if (kind === 'profile') {
        const name = res.data.name;
        const greet = document.querySelector('[data-greeting]');
        if (greet) greet.textContent = name ? greet.dataset.template.replace('{name}', name) : greet.dataset.fallback;
        document.querySelectorAll('[data-avatar]').forEach((a) => { a.textContent = (name || app.querySelector('[data-user-email]').textContent || '?').trim().charAt(0).toUpperCase(); });
      }
      if (kind === 'email') { app.querySelector('[data-user-email]').textContent = res.data.email; form.querySelector('#acct-email').value = ''; }
    });
  });

  // Paywall (switched on in the admin portal): units after the free ones lead to the Premium page.
  function applyLocks(access) {
    const locked = !!access && access.paywall && !access.premium;
    app.querySelectorAll('[data-unit]').forEach((unit) => {
      const n = Number(unit.dataset.unit.replace(/^u/, ''));
      const on = locked && n > access.freeUnits;
      unit.classList.toggle('is-premium-locked', on);
      unit.querySelectorAll('[data-go]').forEach((go) => {
        go.dataset.href ||= go.getAttribute('href');
        go.setAttribute('href', on ? D.premiumUrl : go.dataset.href);
        if (on) go.textContent = D.premiumUnlock;
        go.classList.toggle('lp-cta--gold', on);
      });
      unit.querySelectorAll('[data-story-node] a, [data-trophy]').forEach((a) => {
        a.dataset.href ||= a.getAttribute('href');
        a.setAttribute('href', on ? D.premiumUrl : a.dataset.href);
      });
    });
  }

  const goalSelect = app.querySelector('[data-goal-select]');
  goalSelect?.addEventListener('change', async () => {
    const res = await post('/api/me/goal', { dailyGoal: Number(goalSelect.value) }).catch(() => null);
    if (!res || !res.ok) return;
    const note = app.querySelector('[data-goal-saved]');
    if (note) { note.hidden = false; setTimeout(() => { note.hidden = true; }, 2000); }
    const st = await fetch(`/api/stats?today=${today()}`, { credentials: 'same-origin' }).then((r) => (r.ok ? r.json() : null));
    if (st) applyStats(st);
  });

  app.querySelector('[data-logout]')?.addEventListener('click', async () => {
    await post('/api/auth/logout').catch(() => {});
    location.href = D.home;
  });

  const del = app.querySelector('[data-delete-form]');
  del?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const box = del.querySelector('[data-auth-error]');
    box.hidden = true;
    const res = await post('/api/me/delete', { password: del.querySelector('#delete-password').value }).catch(() => null);
    if (res && res.ok) { location.href = D.home; return; }
    showError(box, messages, res ? res.data.error || 'server_error' : 'network');
  });
})();

// Listen buttons on guide pages: natural voice recording, browser speech as fallback.
(() => {
  const buttons = { forEach: (fn) => document.querySelectorAll('[data-say]').forEach(fn) };
  let current = null;
  const fallback = (text) => {
    if (!('speechSynthesis' in window)) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/[¿¡]/g, ''));
    u.lang = 'es-ES';
    u.rate = 0.9;
    speechSynthesis.speak(u);
  };
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-say]');
    if (!btn) return;
    if (current) current.pause();
    const a = new Audio(btn.dataset.src);
    current = a;
    buttons.forEach((b) => b.classList.remove('is-playing'));
    btn.classList.add('is-playing');
    a.addEventListener('ended', () => btn.classList.remove('is-playing'));
    setTimeout(() => btn.classList.remove('is-playing'), 6000);
    let fell = false;
    const fail = () => { if (!fell) { fell = true; fallback(btn.dataset.say); } };
    a.play().catch((err) => { if (!err || err.name !== 'NotAllowedError') fail(); });
    a.addEventListener('error', fail, { once: true });
  });
})();

// App header on pages outside the learning path (guides): streak, XP and avatar.
(() => {
  if (!document.querySelector('.ah') || document.querySelector('[data-app]')) return;
  const d = new Date();
  const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  fetch('/api/me', { credentials: 'same-origin' }).then((r) => (r.ok ? r.json() : null)).then((me) => {
    if (!me) return;
    const avatar = document.querySelector('[data-avatar]');
    if (avatar) {
      avatar.textContent = (me.user.name || me.user.email || '?').trim().charAt(0).toUpperCase();
      avatar.classList.toggle('is-premium', !!me.user.premium?.active);
      avatar.href = document.querySelector('.ah__brand')?.getAttribute('href') + '#account';
    }
    return fetch(`/api/stats?today=${today}`, { credentials: 'same-origin' }).then((r) => (r.ok ? r.json() : null));
  }).then((s) => {
    if (!s) return;
    document.querySelectorAll('[data-stat-streak]').forEach((el) => { el.textContent = String(s.streak); });
    document.querySelectorAll('[data-stat-xptotal]').forEach((el) => { el.textContent = String(s.xpTotal); });
    document.querySelector('[data-chip-streak]')?.classList.toggle('is-active', s.activeToday);
    applyGameStats(document, s);
  }).catch(() => {});
})();

// Homepage: reveal sections on scroll and count up the course numbers.
(() => {
  const items = document.querySelectorAll('[data-reveal]');
  if (!items.length) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const countUp = (el) => {
    const to = Number(el.dataset.count);
    if (reduce || !to) return;
    const t0 = performance.now();
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / 1200);
      el.textContent = String(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  if (!('IntersectionObserver' in window) || reduce) { items.forEach((el) => el.classList.add('is-in')); return; }
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (!e.isIntersecting) return;
    e.target.classList.add('is-in');
    e.target.querySelectorAll('[data-count]').forEach(countUp);
    io.unobserve(e.target);
  }), { threshold: 0.18 });
  items.forEach((el) => io.observe(el));
})();

// Homepage motion: floating header, hero spotlight + parallax stickers, cycling background word,
// and the scroll story that drives the phone screens.
(() => {
  if (!document.body.classList.contains('home')) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = window.matchMedia('(pointer: fine)').matches;

  const header = document.querySelector('[data-header]');
  const onScroll = () => header?.classList.toggle('is-floating', window.scrollY > 160);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const hero = document.querySelector('[data-spot]');
  const stickers = [...document.querySelectorAll('[data-depth]')];
  if (hero && fine && !reduce) {
    let raf = 0;
    hero.addEventListener('pointermove', (e) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = hero.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width;
        const y = (e.clientY - r.top) / r.height;
        hero.style.setProperty('--mx', `${x * 100}%`);
        hero.style.setProperty('--my', `${y * 100}%`);
        stickers.forEach((s) => {
          const d = Number(s.dataset.depth);
          s.style.translate = `${(x - 0.5) * d}px ${(y - 0.5) * d}px`;
        });
      });
    });
  }

  const words = [...document.querySelectorAll('.hh__bg span')];
  if (words.length > 1 && !reduce) {
    let i = 0;
    setInterval(() => {
      words[i].classList.remove('is-on');
      i = (i + 1) % words.length;
      words[i].classList.add('is-on');
    }, 3400);
  }

  const steps = [...document.querySelectorAll('[data-story-step]')];
  const screens = [...document.querySelectorAll('[data-screen]')];
  if (steps.length && screens.length && 'IntersectionObserver' in window) {
    const show = (n) => {
      steps.forEach((s, i) => s.classList.toggle('is-active', i === n));
      screens.forEach((s, i) => {
        s.classList.toggle('is-active', i === n);
        s.classList.toggle('is-past', i < n);
      });
    };
    const io = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (e.isIntersecting) show(Number(e.target.dataset.storyStep));
    }), { rootMargin: '-45% 0px -45% 0px' });
    steps.forEach((s) => io.observe(s));
    show(0);
  }
})();

// Word strength (spaced review): right answers stretch the review interval, mistakes shrink it.
const HABLENA_INTERVALS = [1, 2, 4, 7, 14, 30];
function hablenaStrength(st) {
  if (!st) return 0.6;
  const level = Math.max(0, st.right - 2 * st.wrong);
  const days = (Date.now() - st.last) / 86_400_000;
  const decay = Math.max(0, Math.min(1, 1 - days / (HABLENA_INTERVALS[Math.min(level, 5)] * 2)));
    const accuracy = (st.right + 1) / (st.right + st.wrong + 1);
    return decay * Math.pow(accuracy, 1.5);
}
async function hablenaLearnedWords(allWords) {
  const [prog, words] = await Promise.all([
    fetch('/api/progress', { credentials: 'same-origin' }).then((r) => (r.ok ? r.json() : null)),
    fetch('/api/words', { credentials: 'same-origin' }).then((r) => (r.ok ? r.json() : null)),
  ]);
  if (!prog) return null;
  const done = new Set(prog.progress.map((p) => p.lessonId));
  const stats = new Map((words?.words || []).map((w) => [w.w, w]));
  return allWords.filter((w) => done.has(w.lesson) || stats.has(w.es)).map((w) => ({ ...w, strength: hablenaStrength(stats.get(w.es)), stat: stats.get(w.es) }));
}

// Word vault page
(() => {
  const vault = document.querySelector('[data-vault]');
  if (!vault) return;
  const all = JSON.parse(document.getElementById('vault-data').textContent);
  const levels = JSON.parse(vault.dataset.levels);
  const list = vault.querySelector('[data-v-list]');
  const search = vault.querySelector('[data-v-search]');
  const SPK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5L6 9H3v6h3l5 4zM15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg>';
  let learned = [];
  let filter = 'all';
  const lvl = (s) => (s >= 0.75 ? 3 : s >= 0.5 ? 2 : s >= 0.25 ? 1 : 0);
  const render = () => {
    const q = search.value.trim().toLowerCase();
    const items = learned
      .filter((w) => filter === 'all' || (filter === 'weak' ? w.strength < 0.5 : w.strength >= 0.75))
      .filter((w) => !q || w.es.toLowerCase().includes(q) || w.tr.toLowerCase().includes(q))
      .sort((a, b) => a.strength - b.strength);
    list.innerHTML = '';
    items.forEach((w) => {
      const li = document.createElement('li');
      const n = lvl(w.strength);
      li.className = `vword vword--l${n}`;
      li.innerHTML = `<button class="say-btn" type="button"></button><span class="vword__text"><span class="vword__es" lang="es"></span><span class="vword__tr"></span></span><span class="vword__meter" aria-hidden="true"><i></i><i></i><i></i><i></i></span><span class="vword__lvl"></span>`;
      const btn = li.querySelector('button');
      btn.dataset.say = w.es; btn.dataset.src = w.src; btn.setAttribute('aria-label', w.es); btn.innerHTML = SPK;
      li.querySelector('.vword__es').textContent = w.es;
      li.querySelector('.vword__tr').textContent = w.tr;
      li.querySelector('.vword__lvl').textContent = levels[n];
      li.querySelectorAll('.vword__meter i').forEach((bar, i) => bar.classList.toggle('is-on', i <= n));
      list.append(li);
    });
    vault.querySelector('[data-v-empty]').hidden = learned.length > 0;
    vault.querySelector('[data-v-nomatch]').hidden = !(learned.length > 0 && items.length === 0);
  };
  vault.querySelectorAll('[data-v-filter]').forEach((b) => b.addEventListener('click', () => {
    filter = b.dataset.vFilter;
    vault.querySelectorAll('[data-v-filter]').forEach((x) => { x.classList.toggle('is-active', x === b); x.setAttribute('aria-pressed', String(x === b)); });
    render();
  }));
  search.addEventListener('input', render);
  hablenaLearnedWords(all).then((words) => {
    if (!words) { location.replace(vault.dataset.login); return; }
    learned = words;
    const weak = words.filter((w) => w.strength < 0.5).length;
    vault.querySelector('[data-v-known]').textContent = String(words.length);
    vault.querySelector('[data-v-strong]').textContent = String(words.filter((w) => w.strength >= 0.75).length);
    vault.querySelector('[data-v-weak]').textContent = String(weak);
    vault.querySelector('[data-v-practice]').hidden = weak < 1;
    render();
  }).catch(() => location.replace(vault.dataset.login));
})();

// Levels, week view, streak freezes and daily quests (app pages)
const HABLENA_LEVEL_START = (n) => 25 * (n - 1) * n / 2 + 5 * (n - 1);
const hablenaLevelOf = (xp) => { let n = 1; while (HABLENA_LEVEL_START(n + 1) <= xp) n++; return n; };
function applyGameStats(scope, s) {
  const level = hablenaLevelOf(s.xpTotal || 0);
  document.querySelectorAll('[data-stat-level]').forEach((el) => { el.textContent = String(level); });
  const card = scope.querySelector('[data-level-card]');
  if (card) {
    const start = HABLENA_LEVEL_START(level);
    const next = HABLENA_LEVEL_START(level + 1);
    card.querySelector('[data-level-msg]').textContent = card.dataset.text.replace('{left}', next - s.xpTotal).replace('{next}', level + 1);
    card.querySelector('[data-level-fill]').style.width = `${Math.round(((s.xpTotal - start) / (next - start)) * 100)}%`;
  }
  const week = scope.querySelector('[data-app-week]');
  if (week && s.week) {
    let labels = [];
    try { labels = JSON.parse(document.documentElement.lang === 'de' ? '["Mo","Di","Mi","Do","Fr","Sa","So"]' : '["Mo","Tu","We","Th","Fr","Sa","Su"]'); } catch {}
    [...week.children].forEach((li, i) => {
      const d = s.week[i];
      li.className = `${d.frozen ? 'is-frozen' : d.xp > 0 ? 'is-on' : ''}${i === 6 ? ' is-today' : ''}`;
      li.querySelector('span').textContent = labels[(new Date(d.day + 'T12:00:00Z').getUTCDay() + 6) % 7] || '';
    });
  }
  const fz = scope.querySelector('[data-freezes]');
  if (fz) fz.textContent = s.freezes > 0 ? fz.dataset.one.replace('{n}', s.freezes) : fz.dataset.none;
  const quests = scope.querySelector('[data-quests]');
  if (quests && s.quests) {
    const labels = JSON.parse(quests.dataset.labels);
    const list = quests.querySelector('[data-quest-list]');
    list.innerHTML = '';
    s.quests.forEach((q) => {
      const li = document.createElement('li');
      const doneQ = q.progress >= q.target;
      li.className = `quest${doneQ ? ' is-done' : ''}`;
      li.innerHTML = '<span class="quest__check" aria-hidden="true"></span><span class="quest__body"><span class="quest__label"></span><span class="quest__bar"><span></span></span></span><span class="quest__count"></span>';
      li.querySelector('.quest__label').textContent = (labels[q.id] || q.id).replace('{n}', q.target);
      li.querySelector('.quest__bar span').style.width = `${Math.round((q.progress / q.target) * 100)}%`;
      li.querySelector('.quest__count').textContent = `${q.progress}/${q.target}`;
      list.append(li);
    });
    const bonus = quests.querySelector('[data-quest-bonus]');
    bonus.classList.toggle('is-done', s.questBonus > 0);
    if (s.questBonus > 0) bonus.querySelector('span').textContent = bonus.dataset.done;
  }
}

// Installable app: register the service worker and offer "add to home screen" in the app.
(() => {
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
  }
  const card = document.querySelector('[data-install]');
  if (!card) return;
  const KEY = 'hablena-install-dismissed';
  const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  let dismissed = false;
  try { dismissed = localStorage.getItem(KEY) === '1'; } catch {}
  if (standalone || dismissed) return;
  let deferred = null;
  const go = card.querySelector('[data-install-go]');
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e;
    card.hidden = false;
  });
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent);
  if (ios) {
    const text = card.querySelector('[data-install-text]');
    text.textContent = `${text.textContent} ${text.dataset.ios}`;
    go.hidden = true;
    card.hidden = false;
  }
  go.addEventListener('click', async () => {
    if (!deferred) return;
    deferred.prompt();
    const choice = await deferred.userChoice.catch(() => null);
    deferred = null;
    if (choice && choice.outcome === 'accepted') card.hidden = true;
  });
  card.querySelector('[data-install-dismiss]').addEventListener('click', () => {
    card.hidden = true;
    try { localStorage.setItem(KEY, '1'); } catch {}
  });
  window.addEventListener('appinstalled', () => { card.hidden = true; });
})();
