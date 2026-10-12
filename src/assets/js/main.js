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
        if (mode === 'signup') { body.name = fields.name ? fields.name.value.trim() : ''; body.lang = form.dataset.lang; }
        const res = await post(`/api/auth/${mode}`, body);
        if (res.ok) { location.href = form.dataset.redirect; return; }
        showError(errorBox, messages, res.data.error || 'server_error');
      } catch {
        showError(errorBox, messages, 'network');
      }
      button.disabled = false;
      button.textContent = button.dataset.label;
    });
  });

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
  };

  fetch('/api/me', { credentials: 'same-origin' })
    .then(async (res) => {
      if (res.status === 401 || res.status === 503) { location.replace(D.login); return; }
      const { user } = await res.json();
      const greet = document.querySelector('[data-greeting]');
      if (greet && user.name) greet.textContent = greet.dataset.template.replace('{name}', user.name);
      const avatar = document.querySelector('[data-avatar]');
      if (avatar) avatar.textContent = (user.name || user.email || '?').trim().charAt(0).toUpperCase();
      app.querySelector('[data-user-email]').textContent = user.email;
      app.querySelector('[data-user-since]').textContent = new Date(user.createdAt).toLocaleDateString(document.documentElement.lang, { year: 'numeric', month: 'long', day: 'numeric' });
      const [progress, stats] = await Promise.all([
        fetch('/api/progress', { credentials: 'same-origin' }).then((r) => (r.ok ? r.json() : { progress: [] })),
        fetch(`/api/stats?today=${today()}`, { credentials: 'same-origin' }).then((r) => (r.ok ? r.json() : null)),
      ]);
      applyProgress(progress.progress || []);
      if (stats) applyStats(stats);
      app.removeAttribute('aria-busy');
    })
    .catch(() => location.replace(D.login));

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
  const buttons = document.querySelectorAll('[data-say]');
  if (!buttons.length) return;
  let current = null;
  const fallback = (text) => {
    if (!('speechSynthesis' in window)) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/[¿¡]/g, ''));
    u.lang = 'es-ES';
    u.rate = 0.9;
    speechSynthesis.speak(u);
  };
  buttons.forEach((btn) => btn.addEventListener('click', () => {
    if (current) current.pause();
    const a = new Audio(btn.dataset.src);
    current = a;
    let fell = false;
    const fail = () => { if (!fell) { fell = true; fallback(btn.dataset.say); } };
    a.play().catch((err) => { if (!err || err.name !== 'NotAllowedError') fail(); });
    a.addEventListener('error', fail, { once: true });
  }));
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
      avatar.href = document.querySelector('.ah__brand')?.getAttribute('href') + '#account';
    }
    return fetch(`/api/stats?today=${today}`, { credentials: 'same-origin' }).then((r) => (r.ok ? r.json() : null));
  }).then((s) => {
    if (!s) return;
    document.querySelectorAll('[data-stat-streak]').forEach((el) => { el.textContent = String(s.streak); });
    document.querySelectorAll('[data-stat-xptotal]').forEach((el) => { el.textContent = String(s.xpTotal); });
    document.querySelector('[data-chip-streak]')?.classList.toggle('is-active', s.activeToday);
  }).catch(() => {});
})();
